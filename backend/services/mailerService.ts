import crypto from "node:crypto";
import type { Transporter } from "nodemailer";
import nodemailer from "nodemailer";

let transporterPromise: Promise<Transporter | null> | null = null;

const getTransporter = async () => {
  if (!transporterPromise) {
    transporterPromise = (async () => {
      const host = process.env.SMTP_HOST?.trim();
      const port = Number(process.env.SMTP_PORT || 587);
      const user = process.env.SMTP_USER?.trim();
      const pass = process.env.SMTP_PASS?.trim();

      if (!host || !user || !pass) {
        console.warn("SMTP is not configured. Activation emails will be logged instead of sent.");
        return null;
      }

      return nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    })();
  }

  return transporterPromise;
};

export const createEmailVerificationToken = () => crypto.randomBytes(32).toString("hex");

export const sendActivationEmail = async (
  email: string,
  token: string,
  loginId: string,
  passwordClearText: string,
  learnUnitCode?: string
) => {
  const frontendBase = (process.env.FRONTEND_URL || "http://localhost:5000").replace(/\/+$/, "");
  const activationUrl = `${frontendBase}/activate?token=${encodeURIComponent(token)}`;
  const transporter = await getTransporter();
  const from = process.env.SMTP_FROM?.trim() || process.env.SMTP_USER?.trim() || "no-reply@anhoc.local";

  const detailsText = `
Your Account Details:
- Email: ${email}
- Login ID: ${loginId}
- Password: ${passwordClearText}
${learnUnitCode ? `- Learning Unit Code: ${learnUnitCode}\n` : ""}
`;

  const detailsHtml = `
    <div style="margin-top: 20px; padding: 15px; background-color: #f7f9fa; border: 1px solid #e1e8ed; border-radius: 8px;">
      <h3 style="margin-top: 0; color: #333;">Your Account Details:</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #555;">
        <tr>
          <td style="padding: 6px 0; font-weight: bold; width: 160px; color: #333;">Email:</td>
          <td style="padding: 6px 0;">${email}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-weight: bold; color: #333;">Login ID:</td>
          <td style="padding: 6px 0;">${loginId}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-weight: bold; color: #333;">Password:</td>
          <td style="padding: 6px 0;"><code>${passwordClearText}</code></td>
        </tr>
        ${learnUnitCode ? `
        <tr>
          <td style="padding: 6px 0; font-weight: bold; color: #333;">Learning Unit Code:</td>
          <td style="padding: 6px 0;"><code>${learnUnitCode}</code></td>
        </tr>
        ` : ""}
      </table>
    </div>
  `;

  if (!transporter) {
    console.log(`Activation link for ${email}: ${activationUrl}`);
    console.log(detailsText);
    return;
  }

  await transporter.sendMail({
    from,
    to: email,
    subject: "Activate your Anhoc account",
    text: `Activate your Anhoc account by opening this link: ${activationUrl}\n\n${detailsText}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e8ed; border-radius: 12px;">
        <h2 style="color: #268bd2; margin-top: 0;">Activate your Anhoc account</h2>
        <p>Open the link below to verify your email and unlock your first login.</p>
        <p style="margin: 24px 0;">
          <a href="${activationUrl}" style="background-color: #268bd2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">Activate Account</a>
        </p>
        <p style="font-size: 12px; color: #777;">Or copy this URL: <a href="${activationUrl}" style="color: #2aa198;">${activationUrl}</a></p>
        ${detailsHtml}
      </div>
    `,
  });
};

export const sendPasswordResetEmail = async (email: string, token: string) => {
  const frontendBase = (process.env.FRONTEND_URL || "http://localhost:5000").replace(/\/+$/, "");
  const resetUrl = `${frontendBase}/reset-password?token=${encodeURIComponent(token)}`;
  const transporter = await getTransporter();
  const from = process.env.SMTP_FROM?.trim() || process.env.SMTP_USER?.trim() || "no-reply@anhoc.local";

  if (!transporter) {
    console.log(`Password reset link for ${email}: ${resetUrl}`);
    return;
  }

  await transporter.sendMail({
    from,
    to: email,
    subject: "Reset your Anhoc account password",
    text: `Reset your Anhoc account password by opening this link: ${resetUrl}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>Reset your Anhoc account password</h2>
        <p>Open the link below to reset your password. This link is valid for 1 hour.</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
      </div>
    `,
  });
};

