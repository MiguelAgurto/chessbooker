"use server";

import { sendEmail } from "@/lib/email";

interface PilotFormData {
  name: string;
  email: string;
  platform: string;
  message: string;
}

export async function submitPilotRequest(
  data: PilotFormData
): Promise<{ success: boolean; error?: string }> {
  const { name, email, platform, message } = data;

  // Validate required fields
  if (!name || !email || !platform) {
    return { success: false, error: "Please fill in all required fields" };
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { success: false, error: "Please enter a valid email address" };
  }

  const emailBody = `New ChessBooker Pilot Request

Name: ${name}
Email: ${email}
Coaching Platform: ${platform}

Message:
${message || "(No message provided)"}

---
Submitted from the How It Works page`;

  try {
    await sendEmail({
      to: "chessbooker.dev@gmail.com",
      subject: `ChessBooker Pilot Request — ${name}`,
      text: emailBody,
      replyTo: email,
    });

    return { success: true };
  } catch (error) {
    console.error("[Pilot Form] Failed to send email:", error);
    return {
      success: false,
      error: "Failed to submit request. Please try again.",
    };
  }
}
