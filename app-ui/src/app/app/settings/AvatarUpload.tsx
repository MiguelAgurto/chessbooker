"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { revalidateDashboard } from "./actions";

interface AvatarUploadProps {
  coachId: string;
  currentAvatarUrl: string | null;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function AvatarUpload({ coachId, currentAvatarUrl }: AvatarUploadProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentAvatarUrl);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Please select an image file." });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: "error", text: "Image must be less than 5MB." });
      return;
    }

    setUploading(true);
    setMessage(null);

    const supabase = createClient();

    // Generate a unique filename with timestamp to bust cache
    const fileExt = file.name.split(".").pop();
    const fileName = `avatar-${Date.now()}.${fileExt}`;
    const filePath = `${coachId}/${fileName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      setMessage({ type: "error", text: uploadError.message });
      setUploading(false);
      return;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    // Update coach record with avatar URL
    const { error: updateError } = await supabase
      .from("coaches")
      .update({ avatar_url: publicUrl })
      .eq("id", coachId);

    if (updateError) {
      setMessage({ type: "error", text: updateError.message });
    } else {
      setAvatarUrl(publicUrl);
      setMessage({ type: "success", text: "Photo uploaded!" });
      await revalidateDashboard();
      router.refresh();
    }

    setUploading(false);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    if (!avatarUrl) return;

    setRemoving(true);
    setMessage(null);

    const supabase = createClient();

    // Update coach record to remove avatar URL
    const { error: updateError } = await supabase
      .from("coaches")
      .update({ avatar_url: null })
      .eq("id", coachId);

    if (updateError) {
      setMessage({ type: "error", text: updateError.message });
    } else {
      setAvatarUrl(null);
      setMessage({ type: "success", text: "Photo removed!" });
      await revalidateDashboard();
      router.refresh();
    }

    setRemoving(false);
  };

  return (
    <div className="space-y-4">
      <label className="label">Profile Photo</label>

      <div className="flex items-center gap-6">
        {/* Avatar Preview */}
        <div className="relative">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profile"
              className="w-24 h-24 rounded-full object-cover border-2 border-cb-border-light"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-coral-light border-2 border-cb-border-light flex items-center justify-center">
              <span className="text-2xl font-semibold text-coral">
                {getInitials("Coach")}
              </span>
            </div>
          )}
        </div>

        {/* Upload Controls */}
        <div className="flex flex-col gap-3">
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleUpload}
              className="hidden"
              id="avatar-upload"
            />
            <label
              htmlFor="avatar-upload"
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border-2 transition-all cursor-pointer ${
                uploading
                  ? "bg-cb-bg text-cb-text-muted border-cb-border cursor-not-allowed"
                  : "bg-white text-cb-text border-cb-border hover:border-coral hover:text-coral"
              }`}
            >
              {uploading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Uploading...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                  </svg>
                  Upload Photo
                </>
              )}
            </label>
          </div>

          {avatarUrl && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={removing}
              className="text-sm text-red-500 hover:text-red-700 font-medium transition-colors disabled:opacity-50 text-left"
            >
              {removing ? "Removing..." : "Remove photo"}
            </button>
          )}

          <p className="text-xs text-cb-text-muted">
            JPG, PNG or WebP. Max 5MB.
          </p>
        </div>
      </div>

      {message && (
        <p
          className={`text-sm font-medium ${
            message.type === "success" ? "text-green-600" : "text-red-600"
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
