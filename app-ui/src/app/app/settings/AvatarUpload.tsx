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
    <div className="flex items-center gap-5">
      {/* Avatar Preview - smaller */}
      <div className="relative flex-shrink-0">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Profile"
            className="w-16 h-16 rounded-full object-cover border border-cb-border-light"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-coral-light border border-cb-border-light flex items-center justify-center">
            <span className="text-lg font-semibold text-coral">
              {getInitials("Coach")}
            </span>
          </div>
        )}
      </div>

      {/* Upload Controls - more subtle */}
      <div className="flex items-center gap-3">
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
          className={`text-sm font-medium transition-colors cursor-pointer ${
            uploading
              ? "text-cb-text-muted cursor-not-allowed"
              : "text-cb-text-secondary hover:text-coral"
          }`}
        >
          {uploading ? "Uploading..." : "Change photo"}
        </label>

        {avatarUrl && (
          <>
            <span className="text-cb-border">|</span>
            <button
              type="button"
              onClick={handleRemove}
              disabled={removing}
              className="text-sm text-cb-text-muted hover:text-red-500 font-medium transition-colors disabled:opacity-50"
            >
              {removing ? "Removing..." : "Remove"}
            </button>
          </>
        )}
      </div>

      {message && (
        <span
          className={`text-sm font-medium ${
            message.type === "success" ? "text-green-600" : "text-red-600"
          }`}
        >
          {message.text}
        </span>
      )}
    </div>
  );
}
