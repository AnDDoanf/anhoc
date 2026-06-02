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

export const sendActivationEmail = async (email: string, token: string) => {
  const frontendBase = (process.env.FRONTEND_URL || "http://localhost:5000").replace(/\/+$/, "");
  const activationUrl = `${frontendBase}/activate?token=${encodeURIComponent(token)}`;
  const transporter = await getTransporter();
  const from = process.env.SMTP_FROM?.trim() || process.env.SMTP_USER?.trim() || "no-reply@anhoc.local";

  if (!transporter) {
    console.log(`Activation link for ${email}: ${activationUrl}`);
    return;
  }

  await transporter.sendMail({
    from,
    to: email,
    subject: "Activate your Anhoc account",
    text: `Activate your Anhoc account by opening this link: ${activationUrl}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>Activate your Anhoc account</h2>
        <p>Open the link below to verify your email and unlock your first login.</p>
        <p><a href="${activationUrl}">${activationUrl}</a></p>
      </div>
    `,
  });
};
