"use server";

import { sendEmail } from "@/lib/email";

const SUPPORT_EMAIL = "agurto.miguel16@gmail.com";

interface SendSupportMessageParams {
  name?: string;
  email: string;
  message: string;
}

export async function sendSupportMessage({
  name,
  email,
  message,
}: SendSupportMessageParams): Promise<{ success: boolean; error?: string }> {
  if (!email || !message) {
    return { success: false, error: "Email and message are required" };
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { success: false, error: "Please enter a valid email address" };
  }

  try {
    const senderName = name?.trim() || "Anonymous";
    const subject = `[ChessBooker Support] Message from ${senderName}`;
    const text = `New support message from ChessBooker login page:

From: ${senderName}
Email: ${email}

Message:
${message}

---
This message was sent via the ChessBooker contact form.`;

    await sendEmail({
      to: SUPPORT_EMAIL,
      subject,
      text,
      replyTo: email,
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to send support email:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
