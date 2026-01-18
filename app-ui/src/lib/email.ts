import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Build a full URL for the app subdomain.
 * Uses APP_BASE_URL env var, falls back to https://app.chessbooker.com
 */
export function getAppUrl(path: string): string {
  const baseUrl = process.env.APP_BASE_URL || "https://app.chessbooker.com";
  // Ensure path starts with /
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

interface SendEmailParams {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
}

export async function sendEmail({ to, subject, text, replyTo }: SendEmailParams) {
  const { data, error } = await resend.emails.send({
    from: "ChessBooker <noreply@chessbooker.com>",
    to,
    subject,
    text,
    replyTo,
  });

  if (error) {
    console.error("Failed to send email:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data;
}
