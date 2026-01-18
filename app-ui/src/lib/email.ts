import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

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
