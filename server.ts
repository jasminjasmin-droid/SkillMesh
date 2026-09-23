import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import {
  isSupabaseConfiguredOnServer,
  testServerSupabaseConnection,
  fetchSupabaseUsersOnServer,
  saveSupabaseUserOnServer,
  fetchSupabaseConnectionsOnServer,
  saveSupabaseConnectionOnServer,
  fetchSupabaseMessagesOnServer,
  saveSupabaseMessageOnServer,
  migrateLocalDataToSupabase,
  checkSupabaseEmailExistsOnServer,
  fetchSupabasePasswordResetsOnServer,
  saveSupabasePasswordResetOnServer,
  createSupabaseAuthUserAdmin,
  updateSupabaseAuthUserPasswordAdmin,
  getServerSupabase,
  fetchSupabaseRatingsForUser,
  fetchSupabaseRatingBetweenUsers,
  saveSupabaseRatingOnServer,
  deleteSupabaseRatingOnServer,
  fetchSupabaseUserProfileById,
  fetchSupabaseUserAvailability,
  fetchAllSupabaseAvailabilities,
  saveSupabaseUserAvailability,
  fetchSupabaseMentorshipRequests,
  saveSupabaseMentorshipRequest,
  fetchSupabaseActiveMentorships,
  saveSupabaseActiveMentorship,
  saveSupabaseCallSession,
  fetchSupabaseCallHistory,
  saveSupabaseCallHistoryRecord,
  uploadVoiceNoteToSupabaseStorage,
  uploadBannerToSupabaseStorage,
  uploadChatAttachmentToSupabaseStorage,
  fetchSupabaseMentorshipSessions,
  saveSupabaseMentorshipSession,
  fetchSupabaseNotifications,
  saveSupabaseNotification,
  markSupabaseNotificationAsRead,
  markAllSupabaseNotificationsAsRead,
  updateSupabaseProfileVerification,
  fetchSupabaseAuditLogsOnServer,
  saveSupabaseAuditLogOnServer,
  fetchSupabaseUserBlocksOnServer,
} from './server/supabase';
import { getSkillMeshUserId } from './src/utils/skillmeshId';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve uploaded assets (voice notes, media, banners, chat attachments)
const uploadsDir = path.join(process.cwd(), 'uploads');
const voiceNotesDir = path.join(uploadsDir, 'voice-notes');
const bannersDir = path.join(uploadsDir, 'banners');
const chatAttachmentsDir = path.join(uploadsDir, 'chat-attachments');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(voiceNotesDir)) fs.mkdirSync(voiceNotesDir, { recursive: true });
if (!fs.existsSync(bannersDir)) fs.mkdirSync(bannersDir, { recursive: true });
if (!fs.existsSync(chatAttachmentsDir)) fs.mkdirSync(chatAttachmentsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// Persistent OTP storage for secure verification (25-minute validity)
interface OtpRecord {
  otp: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
  name?: string;
}

const OTP_EXPIRY_MS = 25 * 60 * 1000; // Exactly 25 minutes
const OTP_CACHE_FILE = path.join(process.cwd(), '.otp_cache.json');
const RESET_OTP_CACHE_FILE = path.join(process.cwd(), '.reset_otp_cache.json');

function loadOtpStore(): Map<string, OtpRecord> {
  const map = new Map<string, OtpRecord>();
  try {
    if (fs.existsSync(OTP_CACHE_FILE)) {
      const data = JSON.parse(fs.readFileSync(OTP_CACHE_FILE, 'utf-8'));
      const now = Date.now();
      for (const [email, rec] of Object.entries(data)) {
        if (rec && typeof rec === 'object' && (rec as any).expiresAt > now) {
          map.set(email, rec as OtpRecord);
        }
      }
    }
  } catch {}
  return map;
}

const otpStore = loadOtpStore();

function saveOtpStore(): void {
  try {
    const obj: Record<string, OtpRecord> = {};
    const now = Date.now();
    for (const [email, rec] of otpStore.entries()) {
      if (rec.expiresAt > now) {
        obj[email] = rec;
      }
    }
    fs.writeFileSync(OTP_CACHE_FILE, JSON.stringify(obj), 'utf-8');
  } catch {}
}

// Persistent password reset OTP storage
function loadResetOtpStore(): Map<string, OtpRecord> {
  const map = new Map<string, OtpRecord>();
  try {
    if (fs.existsSync(RESET_OTP_CACHE_FILE)) {
      const data = JSON.parse(fs.readFileSync(RESET_OTP_CACHE_FILE, 'utf-8'));
      const now = Date.now();
      for (const [email, rec] of Object.entries(data)) {
        if (rec && typeof rec === 'object' && (rec as any).expiresAt > now) {
          map.set(email, rec as OtpRecord);
        }
      }
    }
  } catch {}
  return map;
}

const resetOtpStore = loadResetOtpStore();

function saveResetOtpStore(): void {
  try {
    const obj: Record<string, OtpRecord> = {};
    const now = Date.now();
    for (const [email, rec] of resetOtpStore.entries()) {
      if (rec.expiresAt > now) {
        obj[email] = rec;
      }
    }
    fs.writeFileSync(RESET_OTP_CACHE_FILE, JSON.stringify(obj), 'utf-8');
  } catch {}
}

// Clean up expired OTPs periodically (every minute)
setInterval(() => {
  const now = Date.now();
  let otpChanged = false;
  for (const [email, record] of otpStore.entries()) {
    if (now > record.expiresAt) {
      otpStore.delete(email);
      otpChanged = true;
    }
  }
  if (otpChanged) {
    saveOtpStore();
  }

  let resetChanged = false;
  for (const [email, record] of resetOtpStore.entries()) {
    if (now > record.expiresAt) {
      resetOtpStore.delete(email);
      resetChanged = true;
    }
  }
  if (resetChanged) {
    saveResetOtpStore();
  }
}, 60 * 1000);

// Helper to initialize server-side Gemini AI client
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[SERVER] Warning: GEMINI_API_KEY environment variable is not set.');
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

/**
 * Sender configuration with display name and verified email
 */
interface SenderConfig {
  name: string;
  email: string;
  full: string;
}

/**
 * Format sender address to include display name and verified email
 * Defaults to Brevo verified address: hello.skillmesh@gmail.com
 */
function getSenderAddress(): SenderConfig {
  const customSender = 
    process.env.SKILLMESH_FROM_EMAIL ||
    process.env.BREVO_FROM_EMAIL ||
    process.env.BREVO_USER ||
    process.env.RESEND_FROM_EMAIL ||
    process.env.EMAIL_FROM ||
    process.env.SMTP_FROM ||
    process.env.FROM_EMAIL ||
    process.env.SENDER_EMAIL;

  let email = 'hello.skillmesh@gmail.com';
  let name = 'SkillMesh';

  if (customSender && customSender.trim()) {
    const trimmed = customSender.trim();
    const match = trimmed.match(/^(.*?)\s*<([^>]+)>$/);
    if (match) {
      name = match[1].trim() || 'SkillMesh';
      email = match[2].trim();
    } else if (trimmed.includes('@')) {
      email = trimmed;
    }
  }

  return {
    name,
    email,
    full: `${name} <${email}>`,
  };
}

/**
 * Build rich, responsive HTML email template for verification codes
 */
function buildVerificationEmailHtml(name: string | undefined, otp: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your SkillMesh Verification Code</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 32px 16px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="520" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); overflow: hidden; padding: 32px 28px;">
                <!-- Brand Header -->
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <div style="display: inline-block; padding: 8px 16px; background-color: #eef2ff; border-radius: 12px;">
                      <span style="font-size: 22px; font-weight: 900; letter-spacing: -0.5px; color: #4f46e5;">⚡ SkillMesh</span>
                    </div>
                    <p style="margin: 6px 0 0 0; font-size: 13px; font-weight: 500; color: #64748b;">Peer Skill Exchange & Mentorship Network</p>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding-bottom: 20px;">
                    <h1 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 800; color: #0f172a; text-align: center;">Verify Your Email Address</h1>
                    <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #475569; text-align: center;">
                      Hello ${name ? `<strong>${name}</strong>` : 'there'},<br/>
                      Thank you for joining SkillMesh! Please enter the 6-digit verification code below to verify your email and activate your account:
                    </p>
                  </td>
                </tr>

                <!-- OTP Code Display -->
                <tr>
                  <td align="center" style="padding: 12px 0 24px 0;">
                    <div style="background-color: #f8fafc; border: 2px dashed #6366f1; border-radius: 16px; padding: 18px 24px; display: inline-block;">
                      <span style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #4338ca; display: block; padding-left: 8px;">
                        ${otp}
                      </span>
                    </div>
                  </td>
                </tr>

                <!-- Expiry & Security Notice -->
                <tr>
                  <td style="padding-bottom: 24px; border-bottom: 1px solid #f1f5f9;">
                    <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #64748b; text-align: center;">
                      ⏳ This verification code will expire in <strong>25 minutes</strong>.<br/>
                      If you did not request this email, no action is needed and you can safely ignore this message.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td align="center" style="padding-top: 20px;">
                    <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.4;">
                      SkillMesh &bull; Empowering Peer-to-Peer Learning & Skill Swaps<br/>
                      This is an automated verification message. Please do not reply directly to this email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

/**
 * Build rich, responsive HTML email template for password reset with 6-digit verification code
 */
function buildPasswordResetEmailHtml(name: string | undefined, email: string, otp: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SkillMesh Password Reset Code</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 32px 16px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="520" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); overflow: hidden; padding: 32px 28px;">
                <!-- Brand Header -->
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <div style="display: inline-block; padding: 8px 16px; background-color: #eef2ff; border-radius: 12px;">
                      <span style="font-size: 22px; font-weight: 900; letter-spacing: -0.5px; color: #4f46e5;">⚡ SkillMesh</span>
                    </div>
                    <p style="margin: 6px 0 0 0; font-size: 13px; font-weight: 600; color: #475569;">Peer Skill Exchange & Mentorship Network</p>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding-bottom: 20px;">
                    <h1 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 800; color: #0f172a; text-align: center;">Reset Your SkillMesh Password</h1>
                    <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #475569; text-align: center;">
                      Hello ${name ? `<strong>${name}</strong>` : 'there'},<br/>
                      We received a password reset request for your SkillMesh account (<strong>${email}</strong>). Enter the 6-digit verification code below directly in the app to set your new password:
                    </p>
                  </td>
                </tr>

                <!-- OTP Code Display -->
                <tr>
                  <td align="center" style="padding: 12px 0 24px 0;">
                    <div style="background-color: #f8fafc; border: 2px dashed #6366f1; border-radius: 16px; padding: 18px 24px; display: inline-block;">
                      <span style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #4338ca; display: block; padding-left: 8px;">
                        ${otp}
                      </span>
                    </div>
                  </td>
                </tr>

                <!-- Expiry & Security Notice -->
                <tr>
                  <td style="padding-bottom: 24px; border-bottom: 1px solid #f1f5f9;">
                    <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #64748b; text-align: center;">
                      ⏳ This verification code will expire in <strong>25 minutes</strong>.<br/>
                      If you did not request a password reset, no further action is needed and your account remains secure.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td align="center" style="padding-top: 20px;">
                    <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.4;">
                      SkillMesh &bull; hello.skillmesh@gmail.com<br/>
                      Empowering Peer-to-Peer Learning & Skill Swaps
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

interface EmailDispatchOptions {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text?: string;
}

interface EmailDispatchResult {
  delivered: boolean;
  provider?: 'brevo_api' | 'brevo_smtp' | 'smtp' | 'resend';
  messageId?: string;
  error?: string;
}

/**
 * Dispatch transactional emails using the existing Brevo email configuration:
 * 1. Brevo REST API (via BREVO_API_KEY / api.brevo.com)
 * 2. Brevo SMTP Relay (via BREVO_SMTP_KEY or SMTP_PASS on smtp-relay.brevo.com)
 * 3. Dedicated SMTP Server
 * 
 * Strict recipient rule:
 * - The email is sent ONLY to options.to (the exact user-entered address).
 * - No copies, no BCC, no redirects, no hardcoded team/admin addresses.
 */
async function dispatchTransactionalEmail(options: EmailDispatchOptions): Promise<EmailDispatchResult> {
  const { to, toName, subject, html, text } = options;
  const sender = getSenderAddress();

  // 1. Send via Brevo REST API using existing BREVO_API_KEY
  const brevoApiKey = process.env.BREVO_API_KEY || process.env.BREVO_KEY;
  if (brevoApiKey && brevoApiKey.trim()) {
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoApiKey.trim(),
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: sender.name,
            email: sender.email,
          },
          to: [
            {
              email: to,
              name: toName || to.split('@')[0],
            },
          ],
          subject,
          htmlContent: html,
          ...(text ? { textContent: text } : {}),
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        console.log(`[BREVO EMAIL] Successfully dispatched email via Brevo REST API to ${to} (MessageId: ${data?.messageId || 'ok'}, Sender: ${sender.email})`);
        return { delivered: true, provider: 'brevo_api', messageId: data?.messageId };
      } else {
        const errorText = await response.text();
        console.warn(`[BREVO EMAIL] Brevo REST API returned status ${response.status}: ${errorText}`);
      }
    } catch (err: any) {
      console.error('[BREVO EMAIL] Exception calling Brevo API:', err?.message || err);
    }
  }

  // 2. Send via Brevo SMTP Relay using existing Brevo SMTP credentials (fast fallback)
  const brevoSmtpKey = process.env.BREVO_SMTP_KEY;
  const isBrevoExplicit = !!brevoSmtpKey || (process.env.SMTP_HOST && process.env.SMTP_HOST.includes('brevo'));
  const smtpHost = process.env.SMTP_HOST || (brevoSmtpKey ? 'smtp-relay.brevo.com' : undefined);
  const smtpUser = process.env.SMTP_USER || process.env.BREVO_USER || (brevoSmtpKey ? 'b79a91001@smtp-brevo.com' : undefined);
  const smtpPass = brevoSmtpKey || process.env.SMTP_PASS || process.env.SMTP_PASSWORD;

  if (smtpHost && smtpUser && smtpPass) {
    try {
      let rawPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
      if (rawPort === 578) rawPort = 587;
      const port = rawPort;
      const secure = process.env.SMTP_SECURE === 'true' || port === 465;

      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port,
        secure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        connectionTimeout: 2500,
        greetingTimeout: 2500,
        socketTimeout: 3000,
      });

      const info = await transporter.sendMail({
        from: sender.full,
        to, // Sole recipient: exact entered email
        subject,
        html,
        text,
      });

      const providerName = isBrevoExplicit || smtpHost.includes('brevo') ? 'brevo_smtp' : 'smtp';
      console.log(`[BREVO EMAIL] Successfully dispatched email via ${providerName} (${smtpHost}) to sole recipient ${to}`);
      return { delivered: true, provider: providerName, messageId: info?.messageId };
    } catch (err: any) {
      console.error('[BREVO EMAIL] Brevo SMTP send error:', err?.message || err);
      return { delivered: false, error: `Brevo SMTP delivery failed: ${err?.message || 'Check SMTP credentials'}` };
    }
  }

  // No email service configured
  console.warn('[SERVER EMAIL] No active email credentials configured.');
  return { 
    delivered: false, 
    error: 'Email service is temporarily unavailable.' 
  };
}

/**
 * Dispatch verification OTP email using Brevo email configuration
 */
async function dispatchEmailOtp(
  email: string, 
  name: string | undefined, 
  otp: string
): Promise<EmailDispatchResult> {
  const subject = `Your SkillMesh Verification Code: ${otp}`;
  const htmlContent = buildVerificationEmailHtml(name, otp);
  const textContent = `Your SkillMesh verification code is: ${otp}. This code will expire in 25 minutes.`;

  return await dispatchTransactionalEmail({
    to: email,
    toName: name,
    subject,
    html: htmlContent,
    text: textContent,
  });
}

// -------------------------------------------------------------
// 1. API: Send OTP
// -------------------------------------------------------------
app.post('/api/auth/send-otp', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, name } = req.body;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      res.status(400).json({ success: false, error: 'Valid email address is required.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const now = Date.now();
    const existing = otpStore.get(normalizedEmail);

    // Rate limit: 60 seconds between resends
    if (existing && (now - existing.lastSentAt) < 60 * 1000) {
      const waitSec = Math.ceil((60 * 1000 - (now - existing.lastSentAt)) / 1000);
      res.status(429).json({
        success: false,
        error: `Please wait ${waitSec} seconds before requesting a new verification code.`,
        cooldownRemaining: waitSec,
      });
      return;
    }

    // Generate secure 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = now + OTP_EXPIRY_MS; // Exactly 25 minutes

    // Invalidate any previous code by setting the fresh record
    otpStore.set(normalizedEmail, {
      otp,
      expiresAt,
      attempts: 0,
      lastSentAt: now,
      name,
    });
    saveOtpStore();

    // Send code strictly to the entered email
    const dispatchResult = await dispatchEmailOtp(normalizedEmail, name, otp);

    if (!dispatchResult.delivered) {
      console.warn(`[SERVER] Email delivery failed for ${normalizedEmail}: ${dispatchResult.error}`);
    }

    res.json({
      success: true,
      delivered: dispatchResult.delivered,
      message: dispatchResult.delivered
        ? `A 6-digit verification code has been sent to ${normalizedEmail}. Please check your email inbox and spam folder.`
        : `A verification code has been generated and dispatched to ${normalizedEmail}. Please check your inbox.`,
      expiresInMinutes: 25,
    });
  } catch (err: any) {
    console.error('[SERVER] /api/auth/send-otp error:', err);
    res.status(500).json({ success: false, error: "We couldn't send the verification email. Please try again." });
  }
});

// -------------------------------------------------------------
// 1b. API: Get Active OTP Code (Disabled for security & privacy)
// -------------------------------------------------------------
app.get('/api/auth/get-active-code', (_req: Request, res: Response): void => {
  res.status(403).json({ 
    success: false, 
    error: 'Verification codes are sent directly to your registered email address.' 
  });
});

// -------------------------------------------------------------
// 2. API: Verify OTP
// -------------------------------------------------------------
app.post('/api/auth/verify-otp', async (req: Request, res: Response): Promise<void> => {
  try {
    const email = req.body.email;
    const code = req.body.code || req.body.otp;
    const password = req.body.password;
    const name = req.body.name;
    if (!email || !code) {
      res.status(400).json({ success: false, error: 'Email and 6-digit verification code are required.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanCode = code.toString().trim();
    const record = otpStore.get(normalizedEmail);
    const now = Date.now();

    if (!record) {
      res.status(400).json({
        success: false,
        error: 'No active verification code found for this email. Please request a new code.',
      });
      return;
    }

    // 25-minute validity check
    if (now > record.expiresAt) {
      otpStore.delete(normalizedEmail);
      saveOtpStore();
      res.status(400).json({
        success: false,
        error: 'This verification code has expired. Codes are valid for exactly 25 minutes. Please request a new code.',
      });
      return;
    }

    if (record.attempts >= 5) {
      otpStore.delete(normalizedEmail);
      saveOtpStore();
      res.status(400).json({
        success: false,
        error: 'Too many incorrect attempts. For security, this code has been revoked. Please request a new code.',
      });
      return;
    }

    if (record.otp !== cleanCode) {
      record.attempts += 1;
      saveOtpStore();
      const remainingAttempts = 5 - record.attempts;
      res.status(400).json({
        success: false,
        error: `Invalid verification code. ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining.`,
      });
      return;
    }

    // Success! One-time use: delete record immediately
    otpStore.delete(normalizedEmail);
    saveOtpStore();

    const userName = name || record.name || normalizedEmail.split('@')[0];

    // Ensure user is created / confirmed in Supabase Auth
    let authUser: any = null;
    try {
      const adminAuthRes = await createSupabaseAuthUserAdmin(normalizedEmail, password, userName);
      if (adminAuthRes.success && adminAuthRes.user) {
        authUser = adminAuthRes.user;
      }
    } catch (authErr) {
      console.warn('[SERVER] Notice creating Supabase auth user on verify-otp:', authErr);
    }

    res.json({
      success: true,
      message: 'Email successfully verified!',
      user: authUser ? { id: authUser.id, email: normalizedEmail, name: userName } : undefined,
    });
  } catch (err: any) {
    console.error('[SERVER] /api/auth/verify-otp error:', err);
    res.status(500).json({ success: false, error: 'Verification failed. Please try again.' });
  }
});

// -------------------------------------------------------------
// 3. API: AI-Assisted Skill Evidence Relevance Check
// -------------------------------------------------------------
app.post('/api/skills/check-evidence-relevance', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      skillName,
      skillCategory,
      proficiency,
      experienceDescription,
      evidenceType,
      evidenceTitle,
      evidenceUrl,
      evidenceDescription,
    } = req.body;

    if (!skillName || !experienceDescription || !evidenceDescription) {
      res.status(400).json({
        success: false,
        error: 'Skill name, experience background, and evidence details are required.',
      });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      // Fallback heuristic if API key is not yet set up
      const lowerSkill = skillName.toLowerCase();
      const lowerEvidence = `${evidenceTitle || ''} ${evidenceUrl || ''} ${evidenceDescription || ''}`.toLowerCase();
      const matchesKeyword = lowerSkill.split(' ').some(w => w.length > 2 && lowerEvidence.includes(w)) ||
        (skillCategory === 'TECHNICAL' && (lowerEvidence.includes('github') || lowerEvidence.includes('code') || lowerEvidence.includes('project') || lowerEvidence.includes('dev') || lowerEvidence.includes('git'))) ||
        (skillCategory === 'NON_TECHNICAL' && (lowerEvidence.includes('portfolio') || lowerEvidence.includes('design') || lowerEvidence.includes('writing') || lowerEvidence.includes('sample') || lowerEvidence.includes('certificate')));

      res.json({
        success: true,
        isRelevant: matchesKeyword,
        score: matchesKeyword ? 85 : 45,
        feedback: matchesKeyword
          ? `The user-provided evidence appears relevant to ${skillName}.`
          : `The provided evidence does not clearly demonstrate practical work in ${skillName}. Please provide a more direct project link, sample, or credential.`,
        suggestedEvidenceTypes: skillCategory === 'TECHNICAL'
          ? ['GitHub repository', 'Live project link', 'Code sample', 'Technical certification']
          : ['Portfolio link', 'Work samples', 'Published articles/designs', 'Course or credential certificate'],
        notice: 'Self-reported by user. AI relevance check does not constitute official certification.',
      });
      return;
    }

    const prompt = `
You are an expert, objective skill evaluation assistant on Skill Mesh, a peer-to-peer knowledge exchange platform.
Your task is to analyze whether the user-provided evidence is genuinely relevant to the specific skill they want to offer.

Skill Details:
- Skill Offered: "${skillName}"
- Category: ${skillCategory || 'TECHNICAL or NON_TECHNICAL'}
- Claimed Proficiency: ${proficiency || 'Intermediate'}
- Claimed Background: "${experienceDescription}"

User-Provided Proof of Skill / Evidence:
- Evidence Type: "${evidenceType || 'Unspecified'}"
- Evidence Title: "${evidenceTitle || 'None'}"
- Evidence Link/URL: "${evidenceUrl || 'None'}"
- Evidence Description / Details: "${evidenceDescription}"

Evaluation Criteria:
1. Technical Skills (Programming, Data Science, Web/App Dev, Cloud, DevOps, Excel modeling):
   - Appropriate evidence includes: GitHub profiles or repositories, open-source commits, deployed live projects, technical articles, accredited certifications.
   - Irrelevant evidence: Submitting a graphic design Behance link or writing portfolio for a Python coding skill without code; submitting unrelated blog links; generic placeholder text.
2. Non-Technical Skills (Writing, UI/UX Design, Photography, Music, Languages, Public Speaking, Marketing):
   - Appropriate evidence includes: Design portfolios (Figma, Dribbble, Behance), published articles, writing samples, audio/video recordings, speaking clips, certificates of fluency/completion.
   - Irrelevant evidence: Submitting unrelated code repos or spreadsheets for a creative writing or design skill; placeholder text.

Analyze if the evidence is relevant. Return a valid JSON object matching this exact format:
{
  "isRelevant": true or false,
  "score": integer between 0 and 100,
  "feedback": "2-3 concise sentences explaining whether the evidence aligns with the skill, noting specific strengths or explaining why more relevant proof is needed.",
  "suggestedEvidenceTypes": ["Type 1", "Type 2"]
}

Important: Do NOT claim that Skill Mesh has officially verified their real-world identity or official credentials. Frame the feedback as an evaluation of relevance.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text || '{}';
    let parsedResult;
    try {
      parsedResult = JSON.parse(responseText);
    } catch {
      parsedResult = {
        isRelevant: true,
        score: 80,
        feedback: `The provided evidence appears relevant to ${skillName}.`,
        suggestedEvidenceTypes: ['Project repository', 'Portfolio', 'Certificate'],
      };
    }

    res.json({
      success: true,
      isRelevant: Boolean(parsedResult.isRelevant),
      score: parsedResult.score || 75,
      feedback: parsedResult.feedback || `User-provided evidence evaluated for ${skillName}.`,
      suggestedEvidenceTypes: parsedResult.suggestedEvidenceTypes || [],
      notice: 'Self-reported by user. AI relevance check does not constitute official certification.',
    });
  } catch (err: any) {
    console.error('[SERVER] /api/skills/check-evidence-relevance error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to complete AI relevance check. Please check your submission details.',
    });
  }
});

// -------------------------------------------------------------
// 4. File-Backed Persistent Store for Registered Users, Reports, Blocks & Audit
// -------------------------------------------------------------
interface StoredUser {
  id: string;
  name: string;
  email: string;
  joinedDate: string;
  avatarUrl?: string;
  bannerUrl?: string;
  titleOrRole?: string;
  bio?: string;
  password?: string;
  isProfileComplete: boolean;
  isVerified?: boolean;
  verificationStatus?: 'unverified' | 'pending' | 'verified' | 'rejected';
  verifiedAt?: string | null;
  verifiedBy?: string | null;
  verificationNotes?: string | null;
  availabilityStatus?: 'AVAILABLE' | 'UNAVAILABLE' | 'BUSY';
  availabilityMode?: 'BOTH' | 'SKILL_EXCHANGE' | 'MENTORSHIP';
  availabilityUpdatedAt?: string;
  timezone?: string;
  customStatus?: string;
  accountStatus: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
  statusReason?: string;
  statusUpdatedAt?: string;
  role: 'admin' | 'user';
  offeredSkillsCount: number;
  wantedSkillsCount: number;
  offeredSkills?: Array<{
    id: string;
    name: string;
    proficiency: string;
    category?: string;
    description?: string;
    yearsOfExperience?: number;
  }>;
  wantedSkills?: Array<{
    id: string;
    name: string;
    currentLevel?: string;
    category?: string;
    learningGoal?: string;
  }>;
  institutionOrOrg?: string;
}

interface StoredReport {
  id: string;
  reporterId: string;
  reporterName: string;
  reporterEmail?: string;
  reportedUserId: string;
  reportedUserName: string;
  reportedUserEmail?: string;
  reason: string;
  reasonLabel: string;
  description?: string;
  connectionId?: string;
  createdAt: string;
  status: 'PENDING_REVIEW' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNotes?: string;
}

interface StoredBlock {
  id: string;
  blockerId: string;
  blockedUserId: string;
  createdAt: string;
  reason?: string;
}

interface StoredAuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  adminName: string;
  targetUserId: string;
  targetUserName: string;
  targetUserEmail: string;
  action: 'SUSPEND' | 'BAN' | 'RESTORE' | 'REPORT_STATUS_CHANGE';
  previousStatus: string;
  newStatus: string;
  reason: string;
  timestamp: string;
  relatedReportId?: string;
}

interface StoredConnection {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  senderSkill?: string;
  receiverId: string;
  receiverName: string;
  receiverAvatar?: string;
  receiverSkill?: string;
  offeredSkillName: string;
  wantedSkillName: string;
  note: string;
  contactMethod?: string;
  contactValue?: string;
  createdAt: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'ENDED' | 'BLOCKED';
  requestType?: string;
  isKnowledgeSharing?: boolean;
  isProjectCollaboration?: boolean;
  collaborationDetails?: {
    projectTitle?: string;
    lookingFor?: string;
    whyConnect?: string;
  };
  endedAt?: string;
  endedBy?: string;
  endReason?: string;
  updatedAt?: string;
}

interface StoredMessage {
  id: string;
  connectionId: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  text: string;
  createdAt: string;
  attachments?: any[];
  isRead?: boolean;
  readAt?: string;
}

interface StoredPasswordReset {
  id: string;
  email: string;
  name?: string;
  status: 'PENDING' | 'RESOLVED' | 'REJECTED';
  adminNotes?: string;
  tempPasswordHint?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  createdAt: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'registered_users.json');
const REPORTS_FILE = path.join(DATA_DIR, 'user_reports.json');
const BLOCKS_FILE = path.join(DATA_DIR, 'user_blocks.json');
const AUDIT_FILE = path.join(DATA_DIR, 'audit_logs.json');
const CONNECTIONS_FILE = path.join(DATA_DIR, 'connections.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
const RESETS_FILE = path.join(DATA_DIR, 'password_resets.json');
const RATINGS_FILE = path.join(DATA_DIR, 'user_ratings.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.warn('[SERVER STORAGE] Could not create data directory:', err);
  }
}

function safeLoadJson<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.warn(`[SERVER STORAGE] Error reading ${filePath}:`, err);
  }
  return fallback;
}

function safeSaveJson(filePath: string, data: any): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`[SERVER STORAGE] Error saving to ${filePath}:`, err);
  }
}

export interface StoredRating {
  id: string;
  raterId: string;
  raterName: string;
  raterAvatar?: string;
  raterTitleOrRole?: string;
  ratedUserId: string;
  rating: number;
  review?: string;
  skillName?: string;
  interactionType?: string;
  interactionId?: string;
  createdAt: string;
  updatedAt: string;
}

// In-Memory Maps synced with file persistence
const serverUsersStore = new Map<string, StoredUser>();
const serverReportsStore = new Map<string, StoredReport>();
const serverBlocksStore = new Map<string, StoredBlock>();
const serverConnectionsStore = new Map<string, StoredConnection>();
const serverPasswordResetsStore = new Map<string, StoredPasswordReset>();
const serverRatingsStore = new Map<string, StoredRating>();
let serverMessagesStore: StoredMessage[] = [];
let serverAuditLogs: StoredAuditLog[] = [];

// Demo detection helper - strictly purge fake/demo accounts
const KNOWN_DEMO_EMAILS = new Set([
  'alex.morgan@demo.com',
  'elena.rostova@demo.com',
  'marcus.vance@demo.com',
  'sarah.jenkins@demo.com',
  'priya.patel@demo.com',
  'david.kim@demo.com',
  'liam.chen@demo.com',
]);

const KNOWN_DEMO_IDS = new Set([
  'user_alex',
  'user_elena',
  'user_marcus',
  'user_sarah',
  'user_priya',
  'user_david',
  'user_liam',
]);

function isDemoAccount(user: { id?: string; email?: string }): boolean {
  if (!user) return true;
  if (user.email && (KNOWN_DEMO_EMAILS.has(user.email.toLowerCase()) || user.email.toLowerCase().endsWith('@demo.com'))) {
    return true;
  }
  if (user.id && KNOWN_DEMO_IDS.has(user.id)) {
    return true;
  }
  return false;
}

// Load and purge demo accounts from persistent disk on startup
(function initializeStorage() {
  const loadedUsers = safeLoadJson<StoredUser[]>(USERS_FILE, []);
  const loadedReports = safeLoadJson<StoredReport[]>(REPORTS_FILE, []);
  const loadedBlocks = safeLoadJson<StoredBlock[]>(BLOCKS_FILE, []);
  const loadedConnections = safeLoadJson<StoredConnection[]>(CONNECTIONS_FILE, []);
  const loadedMessages = safeLoadJson<StoredMessage[]>(MESSAGES_FILE, []);
  const loadedResets = safeLoadJson<StoredPasswordReset[]>(RESETS_FILE, []);
  const loadedRatings = safeLoadJson<StoredRating[]>(RATINGS_FILE, []);
  serverAuditLogs = safeLoadJson<StoredAuditLog[]>(AUDIT_FILE, []);

  // Load ratings into in-memory store
  for (const r of loadedRatings) {
    if (r && r.id && r.raterId && r.ratedUserId) {
      serverRatingsStore.set(r.id, r);
    }
  }

  // Filter out demo accounts and deduplicate by email
  const userByEmail = new Map<string, StoredUser>();
  for (const u of loadedUsers) {
    if (isDemoAccount(u)) continue;
    const cleanEmail = (u.email || '').toLowerCase().trim();
    if (!cleanEmail) continue;
    // Prefer record with valid Supabase Auth UUID
    if (!userByEmail.has(cleanEmail) || u.id === '324a990f-2ac3-4197-9143-9b9b37125a0b' || u.id.includes('-')) {
      userByEmail.set(cleanEmail, u);
    }
  }
  const genuineUsers = Array.from(userByEmail.values());
  serverUsersStore.clear();
  genuineUsers.forEach(u => serverUsersStore.set(u.id, u));
  safeSaveJson(USERS_FILE, genuineUsers);

  loadedResets.forEach(r => serverPasswordResetsStore.set(r.id, r));

  // Ensure default administrator account exists with explicit admin role
  const adminEmail = 'admin.skillmesh@gmail.com';
  const existingAdmin = Array.from(serverUsersStore.values()).find(u => u.email.toLowerCase() === adminEmail);
  if (!existingAdmin) {
    const adminUser: StoredUser = {
      id: 'admin_skillmesh_root',
      name: 'SkillMesh Administrator',
      email: adminEmail,
      joinedDate: '2026-01-01',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      titleOrRole: 'Platform Administrator & Safety Lead',
      bio: 'Designated system administrator for SkillMesh community governance, user moderation, and platform safety.',
      isProfileComplete: true,
      accountStatus: 'ACTIVE',
      role: 'admin',
      offeredSkillsCount: 2,
      wantedSkillsCount: 1,
      offeredSkills: [
        { id: 'admin_off_1', name: 'Platform Governance & Safety', proficiency: 'Advanced', category: 'TECHNICAL' },
        { id: 'admin_off_2', name: 'Community Leadership', proficiency: 'Advanced', category: 'NON_TECHNICAL' },
      ],
      wantedSkills: [
        { id: 'admin_want_1', name: 'Community Insights & Feedback', currentLevel: 'Advanced' },
      ],
      institutionOrOrg: 'SkillMesh Core Team',
    };
    serverUsersStore.set(adminUser.id, adminUser);
    persistUsers();
  } else if (existingAdmin.role !== 'admin') {
    existingAdmin.role = 'admin';
    serverUsersStore.set(existingAdmin.id, existingAdmin);
    persistUsers();
  }

  loadedReports.forEach(r => serverReportsStore.set(r.id, r));
  loadedBlocks.forEach(b => serverBlocksStore.set(b.id, b));

  // Load genuine connections (filter demo ids)
  const genuineConnections = loadedConnections.filter(
    c => !KNOWN_DEMO_IDS.has(c.senderId) && !KNOWN_DEMO_IDS.has(c.receiverId)
  );
  genuineConnections.forEach(c => serverConnectionsStore.set(c.id, c));
  safeSaveJson(CONNECTIONS_FILE, genuineConnections);

  // Load genuine messages
  serverMessagesStore = loadedMessages.filter(
    m => !KNOWN_DEMO_IDS.has(m.senderId) && !KNOWN_DEMO_IDS.has(m.receiverId)
  );
  safeSaveJson(MESSAGES_FILE, serverMessagesStore);

  // Initialize and synchronize with Supabase PostgreSQL if configured
  if (isSupabaseConfiguredOnServer()) {
    console.log('[SERVER SUPABASE] Supabase credentials detected. Initializing database sync & migration...');
    (async () => {
      try {
        // 1. Safe migration: Write any existing local genuine accounts/connections/messages to Supabase without loss
        const localUsersList = Array.from(serverUsersStore.values()).filter(u => !isDemoAccount(u));
        const localConnsList = Array.from(serverConnectionsStore.values());
        await migrateLocalDataToSupabase(localUsersList, localConnsList, serverMessagesStore);

        // 2. Fetch remote Supabase users and merge into server store
        const remoteUsers = await fetchSupabaseUsersOnServer();
        if (remoteUsers && remoteUsers.length > 0) {
          remoteUsers.filter(u => !isDemoAccount(u)).forEach(u => {
            serverUsersStore.set(u.id, u);
          });
          persistUsers();
          console.log(`[SERVER SUPABASE] Successfully hydrated ${remoteUsers.length} users from Supabase PostgreSQL.`);
        }

        // 3. Fetch remote Supabase connections and merge
        const remoteConns = await fetchSupabaseConnectionsOnServer();
        if (remoteConns && remoteConns.length > 0) {
          remoteConns.forEach(c => serverConnectionsStore.set(c.id, c));
          persistConnections();
          console.log(`[SERVER SUPABASE] Successfully hydrated ${remoteConns.length} connections from Supabase.`);
        }

        // 4. Fetch remote Supabase messages and merge
        const remoteMsgs = await fetchSupabaseMessagesOnServer();
        if (remoteMsgs && remoteMsgs.length > 0) {
          const mergedMsgs = [...serverMessagesStore];
          const existingMsgIds = new Set(serverMessagesStore.map(m => m.id));
          remoteMsgs.forEach(m => {
            if (!existingMsgIds.has(m.id)) {
              mergedMsgs.push(m);
              existingMsgIds.add(m.id);
            }
          });
          serverMessagesStore = mergedMsgs;
          persistMessages();
          console.log(`[SERVER SUPABASE] Successfully hydrated ${remoteMsgs.length} messages from Supabase.`);
        }
      } catch (err) {
        console.warn('[SERVER SUPABASE] Initialization sync notice:', err);
      }
    })();

    // Background sync loop: keep memory and database in sync every 20 seconds
    setInterval(async () => {
      try {
        const remoteUsers = await fetchSupabaseUsersOnServer();
        if (remoteUsers && remoteUsers.length > 0) {
          remoteUsers.filter(u => !isDemoAccount(u)).forEach(u => serverUsersStore.set(u.id, u));
          persistUsers();
        }
        const remoteConns = await fetchSupabaseConnectionsOnServer();
        if (remoteConns && remoteConns.length > 0) {
          remoteConns.forEach(c => serverConnectionsStore.set(c.id, c));
          persistConnections();
        }
      } catch {}
    }, 20000);
  }

  console.log(`[SERVER STORAGE] Initialized with ${serverUsersStore.size} registered users, ${serverConnectionsStore.size} connections, ${serverMessagesStore.length} messages (demo accounts purged).`);
})();

function persistUsers(): void {
  const userByEmail = new Map<string, StoredUser>();
  for (const u of serverUsersStore.values()) {
    if (isDemoAccount(u)) continue;
    const cleanEmail = (u.email || '').toLowerCase().trim();
    if (!cleanEmail) continue;
    if (!userByEmail.has(cleanEmail) || u.id === '324a990f-2ac3-4197-9143-9b9b37125a0b') {
      userByEmail.set(cleanEmail, u);
    }
  }
  const genuineUsers = Array.from(userByEmail.values());
  safeSaveJson(USERS_FILE, genuineUsers);
}

function persistReports(): void {
  safeSaveJson(REPORTS_FILE, Array.from(serverReportsStore.values()));
}

function persistBlocks(): void {
  safeSaveJson(BLOCKS_FILE, Array.from(serverBlocksStore.values()));
}

function persistConnections(): void {
  const genuineConnections = Array.from(serverConnectionsStore.values()).filter(
    c => !KNOWN_DEMO_IDS.has(c.senderId) && !KNOWN_DEMO_IDS.has(c.receiverId)
  );
  safeSaveJson(CONNECTIONS_FILE, genuineConnections);
}

function persistMessages(): void {
  const genuineMessages = serverMessagesStore.filter(
    m => !KNOWN_DEMO_IDS.has(m.senderId) && !KNOWN_DEMO_IDS.has(m.receiverId)
  );
  safeSaveJson(MESSAGES_FILE, genuineMessages.slice(-2000));
}

function persistAuditLogs(): void {
  safeSaveJson(AUDIT_FILE, serverAuditLogs.slice(0, 500));
}

function persistRatings(): void {
  safeSaveJson(RATINGS_FILE, Array.from(serverRatingsStore.values()));
}

// Admin allowed list
function getAdminEmails(): string[] {
  const defaultAdmins = ['admin.skillmesh@gmail.com', 'admin@skillmesh.com'];
  const envAdmins = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',').map(e => e.trim().toLowerCase()) : [];
  return Array.from(new Set([...defaultAdmins, ...envAdmins]));
}

function checkAdminAuthorization(req: Request): { authorized: boolean; email: string; name: string; userId: string } {
  const headerEmail = (req.headers['x-admin-email'] as string || req.query.adminEmail as string || req.body?.adminEmail || '').trim().toLowerCase();
  const headerUserId = (req.headers['x-user-id'] as string || req.query.adminId as string || req.body?.adminId || '').trim();
  const headerName = (req.headers['x-admin-name'] as string || req.query.adminName as string || req.body?.adminName || 'SkillMesh Administrator').trim();

  const adminList = getAdminEmails();
  const isEmailAdmin = Boolean(headerEmail && adminList.includes(headerEmail));
  
  // Check if caller is an explicitly assigned admin user in the system
  const storedUser = headerUserId ? serverUsersStore.get(headerUserId) : null;
  const isStoredAdmin = storedUser ? (storedUser.role === 'admin' && adminList.includes(storedUser.email.toLowerCase())) : false;

  if (isEmailAdmin || isStoredAdmin) {
    return {
      authorized: true,
      email: headerEmail || storedUser?.email || 'admin.skillmesh@gmail.com',
      name: headerName || storedUser?.name || 'Administrator',
      userId: headerUserId || storedUser?.id || 'admin_root',
    };
  }

  return {
    authorized: false,
    email: '',
    name: '',
    userId: '',
  };
}

// -------------------------------------------------------------
// Real-Time SSE (Server-Sent Events) for Live Admin Synchronization
// -------------------------------------------------------------
const sseAdminClients = new Set<Response>();

function calculateAdminStats() {
  const allUsersList = Array.from(serverUsersStore.values()).filter(u => !isDemoAccount(u));
  const allReportsList = Array.from(serverReportsStore.values());
  const allBlocksList = Array.from(serverBlocksStore.values());

  const activeAccountsCount = allUsersList.filter(u => u.accountStatus === 'ACTIVE').length;
  const suspendedAccountsCount = allUsersList.filter(u => u.accountStatus === 'SUSPENDED').length;
  const bannedAccountsCount = allUsersList.filter(u => u.accountStatus === 'BANNED').length;
  const completedProfilesCount = allUsersList.filter(u => u.isProfileComplete).length;
  const incompleteProfilesCount = allUsersList.length - completedProfilesCount;

  const pendingReportsCount = allReportsList.filter(r => r.status === 'PENDING_REVIEW').length;
  const underReviewReportsCount = allReportsList.filter(r => r.status === 'UNDER_REVIEW').length;
  const resolvedReportsCount = allReportsList.filter(r => r.status === 'RESOLVED' || r.status === 'DISMISSED').length;

  const allOfferedSkills = allUsersList.flatMap(u => u.offeredSkills || []);
  const uniqueSkillNames = new Set(allOfferedSkills.map(s => s.name.trim().toLowerCase()));

  let flaggedSafetyCount = 0;
  for (const user of allUsersList) {
    const userReports = allReportsList.filter(r => r.reportedUserId === user.id);
    const userBlocks = allBlocksList.filter(b => b.blockedUserId === user.id);
    if (userReports.length >= 2 || userBlocks.length >= 2 || user.accountStatus !== 'ACTIVE') {
      flaggedSafetyCount++;
    }
  }

  return {
    totalRegisteredUsers: allUsersList.length,
    totalUsers: allUsersList.length,
    activeAccountsCount,
    activeUsers: activeAccountsCount,
    suspendedAccountsCount,
    suspendedUsers: suspendedAccountsCount,
    bannedAccountsCount,
    bannedUsers: bannedAccountsCount,
    completedProfilesCount,
    incompleteProfilesCount,
    pendingReportsCount,
    underReviewReportsCount,
    resolvedReportsCount,
    flaggedSafetyCount,
    totalOfferedSkillsCount: allOfferedSkills.length,
    uniqueSpecializationsCount: uniqueSkillNames.size,
  };
}

function broadcastToAdmins(eventType: string, payload: any): void {
  if (sseAdminClients.size === 0) return;
  const dataString = `event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseAdminClients) {
    try {
      client.write(dataString);
    } catch (err) {
      sseAdminClients.delete(client);
    }
  }
}

// SSE Admin stream endpoint
app.get('/api/admin/events', (req: Request, res: Response): void => {
  const auth = checkAdminAuthorization(req);
  if (!auth.authorized) {
    res.status(403).json({ success: false, error: 'Access Denied: Admin privileges required.' });
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  // Send initial snapshot
  const initialData = {
    users: Array.from(serverUsersStore.values()).filter(u => !isDemoAccount(u)),
    reports: Array.from(serverReportsStore.values()),
    stats: calculateAdminStats(),
    timestamp: new Date().toISOString(),
  };
  res.write(`event: INITIAL_STATE\ndata: ${JSON.stringify(initialData)}\n\n`);

  sseAdminClients.add(res);
  console.log(`[SSE ADMIN] Admin client connected (${auth.email}). Active listeners: ${sseAdminClients.size}`);

  // Send keep-alive ping every 15 seconds
  const pingInterval = setInterval(() => {
    try {
      res.write(': keep-alive\n\n');
    } catch {
      clearInterval(pingInterval);
      sseAdminClients.delete(res);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(pingInterval);
    sseAdminClients.delete(res);
    console.log(`[SSE ADMIN] Admin client disconnected. Active listeners: ${sseAdminClients.size}`);
  });
});

// -------------------------------------------------------------
// 5. User Registration & Sync APIs
// -------------------------------------------------------------

// Dedicated Registration API - called on signup to register real users immediately
app.post('/api/auth/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.body;
    if (!user || !user.id || !user.email) {
      res.status(400).json({ success: false, error: 'Valid user id and email are required for registration.' });
      return;
    }

    const normalizedEmail = user.email.trim().toLowerCase();
    if (isDemoAccount({ id: user.id, email: normalizedEmail })) {
      res.status(400).json({ success: false, error: 'Demo accounts cannot be registered.' });
      return;
    }

    // Check case-insensitive duplicate email in existing memory/disk store
    const existingMemoryUser = Array.from(serverUsersStore.values()).find(
      u => u.email.toLowerCase() === normalizedEmail && u.id !== user.id
    );
    if (existingMemoryUser) {
      res.status(400).json({
        success: false,
        error: 'An account with this email already exists. Please log in instead.',
      });
      return;
    }

    // Check case-insensitive duplicate email in Supabase profiles
    const supabaseEmailCheck = await checkSupabaseEmailExistsOnServer(normalizedEmail, user.id);
    if (supabaseEmailCheck.exists) {
      res.status(400).json({
        success: false,
        error: 'An account with this email already exists. Please log in instead.',
      });
      return;
    }

    const adminList = getAdminEmails();
    const isAdmin = adminList.includes(normalizedEmail);

    const newUser: StoredUser = {
      id: user.id,
      name: user.name || 'User',
      email: normalizedEmail,
      joinedDate: user.joinedDate || new Date().toISOString(),
      avatarUrl: user.avatarUrl,
      titleOrRole: user.titleOrRole || 'Skill Explorer & Peer Mentor',
      bio: user.bio || '',
      isProfileComplete: Boolean(user.isProfileComplete || (user.offeredSkills && user.offeredSkills.length > 0)),
      accountStatus: 'ACTIVE',
      role: isAdmin ? 'admin' : 'user',
      offeredSkillsCount: Array.isArray(user.offeredSkills) ? user.offeredSkills.length : 0,
      wantedSkillsCount: Array.isArray(user.wantedSkills) ? user.wantedSkills.length : 0,
      offeredSkills: Array.isArray(user.offeredSkills) ? user.offeredSkills : [],
      wantedSkills: Array.isArray(user.wantedSkills) ? user.wantedSkills : [],
      institutionOrOrg: user.organizationName || user.institutionName || user.occupationDetails,
    };

    serverUsersStore.set(user.id, newUser);
    persistUsers();
    saveSupabaseUserOnServer(newUser).catch(err => console.warn('[SUPABASE] save user error:', err));

    console.log(`[USER REGISTRATION] New genuine user registered: ${newUser.name} (${newUser.email}) - Total Registered: ${serverUsersStore.size}`);

    // Real-time broadcast to all listening Admin Dashboards
    broadcastToAdmins('USER_REGISTERED', {
      user: newUser,
      stats: calculateAdminStats(),
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      user: newUser,
      totalRegisteredUsers: serverUsersStore.size,
    });
  } catch (err: any) {
    console.error('[SERVER] /api/auth/register error:', err);
    res.status(500).json({ success: false, error: 'Failed to record user registration.' });
  }
});

// Password reset request API (User flow: sends 6-digit verification code directly via Brevo)
app.post('/api/auth/forgot-password', async (req: Request, res: Response): Promise<void> => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const { email } = req.body || {};
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      res.status(400).json({ success: false, error: 'Please provide a valid email address.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const now = Date.now();

    // Check rate limit: 60-second cooldown between resends
    const existing = resetOtpStore.get(cleanEmail);
    if (existing && (now - existing.lastSentAt) < 60 * 1000) {
      const waitSec = Math.max(1, Math.ceil((60 * 1000 - (now - existing.lastSentAt)) / 1000));
      res.status(429).json({
        success: false,
        error: `Please wait ${waitSec} second${waitSec === 1 ? '' : 's'} before requesting a new password reset code.`,
        cooldownRemaining: waitSec,
      });
      return;
    }
    
    // Check if user exists in server store or Supabase
    let matchedUser = Array.from(serverUsersStore.values()).find(u => u.email.toLowerCase() === cleanEmail);
    if (!matchedUser) {
      try {
        const check = await checkSupabaseEmailExistsOnServer(cleanEmail);
        if (check.exists && check.existingUser) {
          matchedUser = check.existingUser;
        }
      } catch (err) {
        console.warn('[FORGOT PASSWORD] Supabase email check note:', err);
      }
    }

    // Generate secure 6-digit OTP code (exact 25-minute validity)
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = now + OTP_EXPIRY_MS; // Exactly 25 minutes

    // Invalidate any previous reset code by overwriting the record
    resetOtpStore.set(cleanEmail, {
      otp,
      expiresAt,
      attempts: 0,
      lastSentAt: now,
      name: matchedUser?.name,
    });
    saveResetOtpStore();

    const resetRequestId = `pwd_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const resetRecord: StoredPasswordReset = {
      id: resetRequestId,
      email: cleanEmail,
      name: matchedUser?.name || 'Registered Member',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    serverPasswordResetsStore.set(resetRequestId, resetRecord);
    safeSaveJson(RESETS_FILE, Array.from(serverPasswordResetsStore.values()));
    saveSupabasePasswordResetOnServer(resetRecord).catch(() => {});

    console.log(`[FORGOT PASSWORD] Generated 6-digit reset code for ${cleanEmail}, expires in 25 mins`);

    // Dispatch real email via Brevo to sole recipient
    const dispatchResult = await dispatchTransactionalEmail({
      to: cleanEmail,
      toName: matchedUser?.name,
      subject: `Your SkillMesh Password Reset Code: ${otp}`,
      html: buildPasswordResetEmailHtml(matchedUser?.name, cleanEmail, otp),
      text: `Hello ${matchedUser?.name || 'there'}, your SkillMesh password reset verification code is: ${otp}. This code expires in 25 minutes. Enter this code directly in the app to set your new password.`
    });

    if (!dispatchResult.delivered) {
      console.warn(`[FORGOT PASSWORD] Email dispatch note for ${cleanEmail}:`, dispatchResult.error);
    }

    res.json({
      success: true,
      delivered: dispatchResult.delivered,
      message: `A 6-digit verification code has been sent to ${cleanEmail}. Enter the code and your new password below.`,
      expiresInMinutes: 25,
    });
  } catch (err: any) {
    console.error('[SERVER] /api/auth/forgot-password error:', err);
    res.status(500).json({
      success: false,
      error: "We couldn't process your password reset request. Please try again.",
    });
  }
});

// In-app password reset via 6-digit verification code
app.post('/api/auth/reset-password-with-code', async (req: Request, res: Response): Promise<void> => {
  try {
    const email = req.body.email;
    const code = req.body.code || req.body.otp;
    const newPassword = req.body.newPassword || req.body.password;
    if (!email || !code || !newPassword) {
      res.status(400).json({
        success: false,
        error: 'Email, 6-digit verification code, and new password are required.',
      });
      return;
    }

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long.',
      });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.toString().trim();
    const record = resetOtpStore.get(cleanEmail);
    const now = Date.now();

    if (!record) {
      res.status(400).json({
        success: false,
        error: 'No active password reset code found for this email. Please request a new code.',
      });
      return;
    }

    // 25-minute validity check
    if (now > record.expiresAt) {
      resetOtpStore.delete(cleanEmail);
      saveResetOtpStore();
      res.status(400).json({
        success: false,
        error: 'This verification code has expired. Codes are valid for exactly 25 minutes. Please request a new code.',
      });
      return;
    }

    // Brute-force protection: max 5 attempts
    if (record.attempts >= 5) {
      resetOtpStore.delete(cleanEmail);
      saveResetOtpStore();
      res.status(400).json({
        success: false,
        error: 'Too many incorrect attempts. For security, this code has been revoked. Please request a new code.',
      });
      return;
    }

    if (record.otp !== cleanCode) {
      record.attempts += 1;
      saveResetOtpStore();
      const remainingAttempts = 5 - record.attempts;
      res.status(400).json({
        success: false,
        error: `Invalid verification code. ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining.`,
      });
      return;
    }

    // Code matches! Invalidate code immediately (single-use)
    resetOtpStore.delete(cleanEmail);
    saveResetOtpStore();

    // 1. Update password directly in Supabase Auth via Admin API
    const supabaseRes = await updateSupabaseAuthUserPasswordAdmin(cleanEmail, newPassword);
    if (!supabaseRes.success) {
      console.warn('[SERVER] Supabase admin update password note:', supabaseRes.error);
    }

    // 2. Update local server user store if user exists
    const matchedUser = Array.from(serverUsersStore.values()).find(u => u.email.toLowerCase() === cleanEmail);
    if (matchedUser) {
      matchedUser.password = newPassword;
      serverUsersStore.set(matchedUser.id, matchedUser);
      safeSaveJson(USERS_FILE, Array.from(serverUsersStore.values()));
    }

    // 3. Mark any pending password reset requests as RESOLVED
    for (const [id, r] of serverPasswordResetsStore.entries()) {
      if (r.email.toLowerCase() === cleanEmail && r.status === 'PENDING') {
        r.status = 'RESOLVED';
        r.resolvedAt = new Date().toISOString();
        r.resolvedBy = 'user_in_app_otp';
        serverPasswordResetsStore.set(id, r);
        saveSupabasePasswordResetOnServer(r).catch(() => {});
      }
    }
    safeSaveJson(RESETS_FILE, Array.from(serverPasswordResetsStore.values()));

    console.log(`[PASSWORD RESET] Successfully updated password in-app for ${cleanEmail}`);

    res.json({
      success: true,
      message: 'Your password has been successfully updated. You can now log in with your new password.',
    });
  } catch (err: any) {
    console.error('[SERVER] /api/auth/reset-password-with-code error:', err);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred while updating your password. Please try again.',
    });
  }
});


// Email service configuration & health endpoint
app.get('/api/auth/email-status', (req: Request, res: Response): void => {
  const sender = getSenderAddress();
  const brevoApiKey = process.env.BREVO_API_KEY || process.env.BREVO_KEY;
  const brevoSmtpKey = process.env.BREVO_SMTP_KEY;
  const resendApiKey = process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY;
  const smtpHost = process.env.SMTP_HOST;
  const smtpPass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;

  let provider: 'brevo_api' | 'brevo_smtp' | 'resend' | 'smtp' | 'none' = 'none';
  if (brevoApiKey && brevoApiKey.trim()) {
    provider = 'brevo_api';
  } else if (brevoSmtpKey || (smtpPass && (smtpHost?.includes('brevo') || !smtpHost))) {
    provider = 'brevo_smtp';
  } else if (smtpHost && smtpPass) {
    provider = 'smtp';
  } else if (resendApiKey && resendApiKey.trim()) {
    provider = 'resend';
  }

  res.json({
    success: true,
    configured: provider !== 'none',
    provider,
    brevoLoginAddress: 'hello.skillmesh@gmail.com',
    senderEmail: sender.email,
    senderName: sender.name,
    senderFormatted: sender.full,
    smtpHost: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
    smtpPort: (process.env.SMTP_PORT && parseInt(process.env.SMTP_PORT, 10) === 578) ? 587 : (process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587),
  });
});

// Admin API: List password reset requests
app.post('/api/admin/purge-all-non-admin-accounts', async (req: Request, res: Response): Promise<void> => {
  const auth = checkAdminAuthorization(req);
  if (!auth.authorized) {
    res.status(403).json({ success: false, error: 'Access Denied: Admin privileges required.' });
    return;
  }

  try {
    const adminEmails = new Set(getAdminEmails().map(e => e.toLowerCase()));
    const purgedIds: string[] = [];

    // 1. Purge from in-memory user store
    for (const [id, user] of serverUsersStore.entries()) {
      const email = (user.email || '').toLowerCase().trim();
      if (!adminEmails.has(email)) {
        serverUsersStore.delete(id);
        purgedIds.push(id);
      }
    }

    // 2. Clear all connections and messages involving non-admins
    serverConnectionsStore.clear();
    serverMessagesStore = [];
    serverReportsStore.clear();

    // 3. Persist updated stores to disk
    persistUsers();
    persistConnections();
    persistMessages();
    persistReports();

    // 4. Also purge Supabase database non-admin profiles & auth users if available
    const supabase = getServerSupabase();
    if (supabase) {
      try {
        const { data: profiles } = await supabase.from('profiles').select('id, email');
        if (profiles && Array.isArray(profiles)) {
          for (const p of profiles) {
            const pEmail = (p.email || '').toLowerCase().trim();
            if (!adminEmails.has(pEmail)) {
              try {
                await supabase.from('offered_skills').delete().eq('user_id', p.id);
                await supabase.from('wanted_skills').delete().eq('user_id', p.id);
                await supabase.from('connection_requests').delete().or(`sender_id.eq.${p.id},receiver_id.eq.${p.id}`);
                await supabase.from('messages').delete().or(`sender_id.eq.${p.id},receiver_id.eq.${p.id}`);
                await supabase.from('profiles').delete().eq('id', p.id);
                await supabase.auth.admin.deleteUser(p.id);
              } catch (innerErr) {
                console.warn(`[PURGE] Failed deleting child records for ${p.id}:`, innerErr);
              }
            }
          }
        }
      } catch (sbErr) {
        console.warn('[PURGE] Notice during Supabase database cleanup:', sbErr);
      }
    }

    const remaining = Array.from(serverUsersStore.values());
    console.log(`[PURGE] Successfully deleted ${purgedIds.length} non-admin accounts. Remaining accounts: ${remaining.length}`);

    res.json({
      success: true,
      purgedCount: purgedIds.length,
      remainingUsers: remaining.map(u => ({ id: u.id, email: u.email, name: u.name, role: u.role }))
    });
  } catch (err: any) {
    console.error('[PURGE] Error purging non-admin accounts:', err);
    res.status(500).json({ success: false, error: err?.message || 'Purge failed' });
  }
});

// Admin API: List password reset requests
app.get('/api/admin/password-resets', async (req: Request, res: Response): Promise<void> => {
  const auth = checkAdminAuthorization(req);
  if (!auth.authorized) {
    res.status(403).json({ success: false, error: 'Access Denied: Admin privileges required.' });
    return;
  }

  try {
    const supabaseResets = await fetchSupabasePasswordResetsOnServer();
    if (supabaseResets && supabaseResets.length > 0) {
      res.json({ success: true, requests: supabaseResets });
      return;
    }
    const localResets = Array.from(serverPasswordResetsStore.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    res.json({ success: true, requests: localResets });
  } catch (err: any) {
    console.error('[SERVER] /api/admin/password-resets error:', err);
    const localResets = Array.from(serverPasswordResetsStore.values());
    res.json({ success: true, requests: localResets });
  }
});

// Admin API: Resolve or reject password reset request
app.post('/api/admin/password-resets/:id/resolve', async (req: Request, res: Response): Promise<void> => {
  const auth = checkAdminAuthorization(req);
  if (!auth.authorized) {
    res.status(403).json({ success: false, error: 'Access Denied: Admin privileges required.' });
    return;
  }

  try {
    const { id } = req.params;
    const { status, adminNotes, tempPasswordHint, email, name } = req.body;

    const existing = serverPasswordResetsStore.get(id);
    const record: StoredPasswordReset = {
      id,
      email: email || existing?.email || '',
      name: name || existing?.name || undefined,
      status: (status as any) || 'RESOLVED',
      adminNotes: adminNotes || undefined,
      tempPasswordHint: tempPasswordHint || undefined,
      resolvedAt: new Date().toISOString(),
      resolvedBy: auth.email,
      createdAt: existing?.createdAt || new Date().toISOString(),
    };

    serverPasswordResetsStore.set(id, record);
    safeSaveJson(RESETS_FILE, Array.from(serverPasswordResetsStore.values()));

    saveSupabasePasswordResetOnServer(record).catch(() => {});
    res.json({ success: true, request: record });
  } catch (err: any) {
    console.error('[SERVER] /api/admin/password-resets/:id/resolve error:', err);
    res.status(500).json({ success: false, error: 'Failed to resolve password reset request.' });
  }
});

// User sync endpoint (profile edits, skills update, avatar, etc.)
app.post('/api/users/sync', (req: Request, res: Response): void => {
  try {
    const user = req.body;
    if (!user || !user.id || !user.email) {
      res.status(400).json({ success: false, error: 'Valid user profile data is required.' });
      return;
    }

    const normalizedEmail = user.email.trim().toLowerCase();
    if (isDemoAccount({ id: user.id, email: normalizedEmail })) {
      res.status(400).json({ success: false, error: 'Demo accounts are not allowed.' });
      return;
    }

    const adminList = getAdminEmails();
    const isAdmin = adminList.includes(normalizedEmail);

    const existing = serverUsersStore.get(user.id);
    const updatedUser: StoredUser = {
      id: user.id,
      name: user.name || existing?.name || 'User',
      email: normalizedEmail,
      joinedDate: user.joinedDate || existing?.joinedDate || new Date().toISOString(),
      avatarUrl: user.avatarUrl || existing?.avatarUrl,
      bannerUrl: user.bannerUrl || existing?.bannerUrl,
      titleOrRole: user.titleOrRole || existing?.titleOrRole,
      bio: user.bio !== undefined ? user.bio : (existing?.bio || ''),
      isProfileComplete: Boolean(user.isProfileComplete || (user.offeredSkills && user.offeredSkills.length > 0)),
      isVerified: existing?.isVerified ?? (user.isVerified ?? false),
      verificationStatus: existing?.verificationStatus ?? (user.verificationStatus ?? 'unverified'),
      verifiedAt: existing?.verifiedAt ?? user.verifiedAt,
      verifiedBy: existing?.verifiedBy ?? user.verifiedBy,
      verificationNotes: existing?.verificationNotes ?? user.verificationNotes,
      accountStatus: existing?.accountStatus || user.accountStatus || 'ACTIVE',
      statusReason: existing?.statusReason || user.statusReason,
      statusUpdatedAt: existing?.statusUpdatedAt || user.statusUpdatedAt,
      role: isAdmin ? 'admin' : 'user',
      offeredSkillsCount: Array.isArray(user.offeredSkills) ? user.offeredSkills.length : (existing?.offeredSkillsCount || 0),
      wantedSkillsCount: Array.isArray(user.wantedSkills) ? user.wantedSkills.length : (existing?.wantedSkillsCount || 0),
      offeredSkills: Array.isArray(user.offeredSkills) ? user.offeredSkills : (existing?.offeredSkills || []),
      wantedSkills: Array.isArray(user.wantedSkills) ? user.wantedSkills : (existing?.wantedSkills || []),
      institutionOrOrg: user.organizationName || user.institutionName || user.occupationDetails || existing?.institutionOrOrg,
    };

    serverUsersStore.set(user.id, updatedUser);
    persistUsers();
    saveSupabaseUserOnServer(updatedUser).catch(err => console.warn('[SUPABASE] save user sync error:', err));

    // Broadcast user update in real time
    broadcastToAdmins('USER_UPDATED', {
      user: updatedUser,
      stats: calculateAdminStats(),
      timestamp: new Date().toISOString(),
    });

    res.json({ success: true, user: updatedUser, totalRegisteredUsers: serverUsersStore.size });
  } catch (err: any) {
    console.error('[SERVER] /api/users/sync error:', err);
    res.status(500).json({ success: false, error: 'Failed to sync user state.' });
  }
});

// Public registered users query for platform discovery & matching (sanitized)
app.get('/api/users', (_req: Request, res: Response): void => {
  try {
    const userByEmail = new Map<string, StoredUser>();
    for (const u of serverUsersStore.values()) {
      if (isDemoAccount(u) || u.accountStatus !== 'ACTIVE') continue;
      const cleanEmail = (u.email || '').toLowerCase().trim();
      if (!cleanEmail) continue;
      if (!userByEmail.has(cleanEmail) || u.id === '324a990f-2ac3-4197-9143-9b9b37125a0b') {
        userByEmail.set(cleanEmail, u);
      }
    }

    const allUsers = Array.from(userByEmail.values())
      .map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        titleOrRole: u.titleOrRole || '',
        bio: u.bio || '',
        avatarUrl: u.avatarUrl || '',
        status: 'STUDENT' as const,
        institutionName: u.institutionOrOrg,
        isProfileComplete: u.isProfileComplete,
        joinedDate: u.joinedDate,
        isVerified: Boolean(u.isVerified),
        verificationStatus: u.verificationStatus || (u.isVerified ? 'verified' : 'unverified'),
        verifiedAt: u.verifiedAt,
        verifiedBy: u.verifiedBy,
        offeredSkills: u.offeredSkills || [],
        wantedSkills: u.wantedSkills || [],
        role: u.role,
        accountStatus: u.accountStatus,
      }));

    res.json({ success: true, users: allUsers, totalCount: allUsers.length });
  } catch (err: any) {
    console.error('[SERVER] /api/users error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch registered users.' });
  }
});

// Admin bulk sync of users
app.post('/api/admin/users/sync-all', (req: Request, res: Response): void => {
  const auth = checkAdminAuthorization(req);
  if (!auth.authorized) {
    res.status(403).json({ success: false, error: 'Access Denied: Admin privileges required.' });
    return;
  }

  try {
    const { users } = req.body;
    if (Array.isArray(users)) {
      const adminList = getAdminEmails();
      users.forEach((user: any) => {
        if (!user || !user.id || !user.email) return;
        if (isDemoAccount({ id: user.id, email: user.email })) return;

        const normalizedEmail = user.email.trim().toLowerCase();
        const isAdmin = adminList.includes(normalizedEmail);
        const existing = serverUsersStore.get(user.id);

        const updatedUser: StoredUser = {
          id: user.id,
          name: user.name || existing?.name || 'User',
          email: normalizedEmail,
          joinedDate: user.joinedDate || existing?.joinedDate || new Date().toISOString(),
          avatarUrl: user.avatarUrl || existing?.avatarUrl,
          titleOrRole: user.titleOrRole || existing?.titleOrRole,
          bio: user.bio !== undefined ? user.bio : (existing?.bio || ''),
          isProfileComplete: Boolean(user.isProfileComplete || (user.offeredSkills && user.offeredSkills.length > 0)),
          accountStatus: existing?.accountStatus || user.accountStatus || 'ACTIVE',
          statusReason: existing?.statusReason || user.statusReason,
          statusUpdatedAt: existing?.statusUpdatedAt || user.statusUpdatedAt,
          role: isAdmin ? 'admin' : 'user',
          offeredSkillsCount: Array.isArray(user.offeredSkills) ? user.offeredSkills.length : (existing?.offeredSkillsCount || 0),
          wantedSkillsCount: Array.isArray(user.wantedSkills) ? user.wantedSkills.length : (existing?.wantedSkillsCount || 0),
          offeredSkills: Array.isArray(user.offeredSkills) ? user.offeredSkills : (existing?.offeredSkills || []),
          wantedSkills: Array.isArray(user.wantedSkills) ? user.wantedSkills : (existing?.wantedSkills || []),
          institutionOrOrg: user.organizationName || user.institutionName || user.occupationDetails || existing?.institutionOrOrg,
        };

        serverUsersStore.set(user.id, updatedUser);
      });
      persistUsers();
    }

    res.json({ success: true, count: serverUsersStore.size });
  } catch (err: any) {
    console.error('[SERVER] /api/admin/users/sync-all error:', err);
    res.status(500).json({ success: false, error: 'Failed to sync users list.' });
  }
});

app.get('/api/users/status/:userId', (req: Request, res: Response): void => {
  const { userId } = req.params;
  const user = serverUsersStore.get(userId);
  if (!user) {
    res.json({ success: true, accountStatus: 'ACTIVE', isRestricted: false });
    return;
  }
  res.json({
    success: true,
    accountStatus: user.accountStatus,
    isRestricted: user.accountStatus !== 'ACTIVE',
    statusReason: user.statusReason,
    statusUpdatedAt: user.statusUpdatedAt,
  });
});

// -------------------------------------------------------------
// 6. User Reports & Blocks Intake APIs
// -------------------------------------------------------------
app.post('/api/reports', (req: Request, res: Response): void => {
  try {
    const {
      reporterId,
      reporterName,
      reporterEmail,
      reportedUserId,
      reportedUserName,
      reportedUserEmail,
      reason,
      reasonLabel,
      description,
      connectionId,
    } = req.body;

    if (!reporterId || !reportedUserId || !reason) {
      res.status(400).json({ success: false, error: 'Reporter, reported user, and reason are required.' });
      return;
    }

    const reportId = `rep_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const newReport: StoredReport = {
      id: reportId,
      reporterId,
      reporterName: reporterName || 'Anonymous Reporter',
      reporterEmail,
      reportedUserId,
      reportedUserName: reportedUserName || 'Reported Peer',
      reportedUserEmail,
      reason,
      reasonLabel: reasonLabel || reason,
      description: description ? description.trim() : '',
      connectionId,
      createdAt: new Date().toISOString(),
      status: 'PENDING_REVIEW',
    };

    serverReportsStore.set(reportId, newReport);
    persistReports();
    console.log(`[SAFETY REPORT] New report submitted against user ${reportedUserId} for ${reason}`);

    broadcastToAdmins('NEW_REPORT', {
      report: newReport,
      stats: calculateAdminStats(),
      timestamp: new Date().toISOString(),
    });

    res.json({ success: true, report: newReport });
  } catch (err: any) {
    console.error('[SERVER] /api/reports error:', err);
    res.status(500).json({ success: false, error: 'Failed to record report.' });
  }
});

app.post('/api/blocks', (req: Request, res: Response): void => {
  try {
    const { blockerId, blockedUserId, reason } = req.body;
    if (!blockerId || !blockedUserId) {
      res.status(400).json({ success: false, error: 'Blocker and blocked user IDs required.' });
      return;
    }
    const blockId = `block_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const newBlock: StoredBlock = {
      id: blockId,
      blockerId,
      blockedUserId,
      createdAt: new Date().toISOString(),
      reason,
    };
    serverBlocksStore.set(blockId, newBlock);
    persistBlocks();
    res.json({ success: true, block: newBlock });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to record block.' });
  }
});

// -------------------------------------------------------------
// 6.5. Connections & Messaging End-to-End APIs
// -------------------------------------------------------------

// Fetch all connections (or filtered by user)
app.get('/api/connections', (req: Request, res: Response): void => {
  try {
    const userId = (req.query.userId as string || '').trim();
    let conns = Array.from(serverConnectionsStore.values()).filter(
      c => !KNOWN_DEMO_IDS.has(c.senderId) && !KNOWN_DEMO_IDS.has(c.receiverId)
    );

    if (userId) {
      conns = conns.filter(c => c.senderId === userId || c.receiverId === userId);
    }

    res.json({ success: true, connections: conns, count: conns.length });
  } catch (err: any) {
    console.error('[SERVER] /api/connections error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch connections.' });
  }
});

// Create connection request
app.post('/api/connections', (req: Request, res: Response): void => {
  try {
    const data = req.body as StoredConnection;
    if (!data || !data.senderId || !data.receiverId) {
      res.status(400).json({ success: false, error: 'Sender and receiver are required.' });
      return;
    }

    if (KNOWN_DEMO_IDS.has(data.senderId) || KNOWN_DEMO_IDS.has(data.receiverId)) {
      res.status(400).json({ success: false, error: 'Demo accounts cannot create connections.' });
      return;
    }

    // Check for existing pending or accepted connection
    const existing = Array.from(serverConnectionsStore.values()).find(c =>
      ((c.senderId === data.senderId && c.receiverId === data.receiverId) ||
       (c.senderId === data.receiverId && c.receiverId === data.senderId)) &&
      (c.status === 'PENDING' || c.status === 'ACCEPTED')
    );

    if (existing) {
      if (existing.status === 'ACCEPTED') {
        res.status(400).json({ success: false, error: 'An active connection already exists between these users.', existingConnection: existing });
        return;
      }
      if (existing.senderId === data.senderId) {
        res.status(400).json({ success: false, error: 'A pending request has already been sent to this user.', existingConnection: existing });
        return;
      }
      res.status(400).json({ success: false, error: 'This user has already sent you a connection request. Please review it in Requests.', existingConnection: existing });
      return;
    }

    const pairKey = [data.senderId, data.receiverId].sort().join('_');
    const newId = data.id || `conn_${pairKey}`;

    const newConnection: StoredConnection = {
      ...data,
      id: newId,
      createdAt: data.createdAt || new Date().toISOString(),
      status: 'PENDING',
    };

    serverConnectionsStore.set(newId, newConnection);
    persistConnections();
    saveSupabaseConnectionOnServer(newConnection).catch(err => console.warn('[SUPABASE] save connection error:', err));

    createServerNotification({
      recipientId: data.receiverId,
      senderId: data.senderId,
      senderName: data.senderName,
      senderAvatar: data.senderAvatar,
      type: 'CONNECTION_REQUEST',
      title: 'New Connection Request',
      message: `${data.senderName} sent you a connection request to exchange skills.`,
      relatedId: newConnection.id,
    });

    console.log(`[CONNECTION CREATED] ${newConnection.senderName} -> ${newConnection.receiverName} (${newConnection.id})`);
    res.json({ success: true, connection: newConnection });
  } catch (err: any) {
    console.error('[SERVER] POST /api/connections error:', err);
    res.status(500).json({ success: false, error: 'Failed to create connection request.' });
  }
});

// Accept connection request
app.post('/api/connections/:id/accept', (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const conn = serverConnectionsStore.get(id);
    if (!conn) {
      // Look up by pair key if needed
      const found = Array.from(serverConnectionsStore.values()).find(c => c.id === id);
      if (!found) {
        res.status(404).json({ success: false, error: 'Connection request not found.' });
        return;
      }
    }

    const targetConn = conn || Array.from(serverConnectionsStore.values()).find(c => c.id === id)!;
    targetConn.status = 'ACCEPTED';
    serverConnectionsStore.set(targetConn.id, targetConn);

    // Ensure any other stale requests between these two users are resolved
    for (const [cId, otherConn] of serverConnectionsStore.entries()) {
      if (cId !== targetConn.id) {
        const isPair = (otherConn.senderId === targetConn.senderId && otherConn.receiverId === targetConn.receiverId) ||
                       (otherConn.senderId === targetConn.receiverId && otherConn.receiverId === targetConn.senderId);
        if (isPair && otherConn.status === 'PENDING') {
          serverConnectionsStore.delete(cId);
        }
      }
    }

    persistConnections();
    saveSupabaseConnectionOnServer(targetConn).catch(err => console.warn('[SUPABASE] accept connection error:', err));

    createServerNotification({
      recipientId: targetConn.senderId,
      senderId: targetConn.receiverId,
      senderName: targetConn.receiverName,
      senderAvatar: targetConn.receiverAvatar,
      type: 'CONNECTION_ACCEPTED',
      title: 'Connection Accepted!',
      message: `${targetConn.receiverName} accepted your skill exchange connection. You can now chat and schedule calls!`,
      relatedId: targetConn.id,
    });

    console.log(`[CONNECTION ACCEPTED] ${targetConn.id} accepted between ${targetConn.senderId} and ${targetConn.receiverId}`);
    res.json({ success: true, connection: targetConn });
  } catch (err: any) {
    console.error('[SERVER] POST /api/connections/:id/accept error:', err);
    res.status(500).json({ success: false, error: 'Failed to accept connection request.' });
  }
});

// Decline connection request
app.post('/api/connections/:id/decline', (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const conn = serverConnectionsStore.get(id);
    if (!conn) {
      res.status(404).json({ success: false, error: 'Connection request not found.' });
      return;
    }
    conn.status = 'DECLINED';
    serverConnectionsStore.set(id, conn);
    persistConnections();
    saveSupabaseConnectionOnServer(conn).catch(err => console.warn('[SUPABASE] decline connection error:', err));
    res.json({ success: true, connection: conn });
  } catch (err: any) {
    console.error('[SERVER] POST /api/connections/:id/decline error:', err);
    res.status(500).json({ success: false, error: 'Failed to decline connection request.' });
  }
});

// End active exchange
app.post('/api/connections/:id/end', (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const { endedBy, endReason } = req.body;
    const conn = serverConnectionsStore.get(id);
    if (!conn) {
      res.status(404).json({ success: false, error: 'Connection not found.' });
      return;
    }
    conn.status = 'ENDED';
    conn.endedAt = new Date().toISOString();
    conn.endedBy = endedBy;
    conn.endReason = endReason || 'Ended by user';
    serverConnectionsStore.set(id, conn);
    persistConnections();
    saveSupabaseConnectionOnServer(conn).catch(err => console.warn('[SUPABASE] end connection error:', err));
    res.json({ success: true, connection: conn });
  } catch (err: any) {
    console.error('[SERVER] POST /api/connections/:id/end error:', err);
    res.status(500).json({ success: false, error: 'Failed to end connection.' });
  }
});

// Upgrade exchange to Project Collaboration
app.post('/api/connections/:id/upgrade-collaboration', (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const { collaborationDetails } = req.body;
    const conn = serverConnectionsStore.get(id);
    if (!conn) {
      res.status(404).json({ success: false, error: 'Connection not found.' });
      return;
    }
    conn.isProjectCollaboration = true;
    conn.requestType = 'PROJECT_COLLABORATION';
    if (collaborationDetails) {
      conn.collaborationDetails = collaborationDetails;
    }
    serverConnectionsStore.set(id, conn);
    persistConnections();
    saveSupabaseConnectionOnServer(conn).catch(err => console.warn('[SUPABASE] upgrade collaboration error:', err));
    res.json({ success: true, connection: conn });
  } catch (err: any) {
    console.error('[SERVER] POST /api/connections/:id/upgrade-collaboration error:', err);
    res.status(500).json({ success: false, error: 'Failed to upgrade connection to collaboration.' });
  }
});

// Messages API
app.get('/api/messages', (req: Request, res: Response): void => {
  try {
    const connectionId = (req.query.connectionId as string || '').trim();
    let msgs = serverMessagesStore;
    if (connectionId) {
      msgs = msgs.filter(m => m.connectionId === connectionId);
    }
    res.json({ success: true, messages: msgs, count: msgs.length });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch messages.' });
  }
});

app.post('/api/messages', (req: Request, res: Response): void => {
  try {
    const message = req.body as StoredMessage;
    if (!message || !message.connectionId || !message.senderId || !message.text) {
      res.status(400).json({ success: false, error: 'Connection ID, sender, and text are required.' });
      return;
    }

    const newMessage: StoredMessage = {
      id: message.id || `msg_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      connectionId: message.connectionId,
      senderId: message.senderId,
      senderName: message.senderName || 'Peer',
      receiverId: message.receiverId || '',
      text: message.text,
      createdAt: message.createdAt || new Date().toISOString(),
      attachments: message.attachments || [],
    };

    serverMessagesStore.push(newMessage);
    persistMessages();
    saveSupabaseMessageOnServer(newMessage).catch(err => console.warn('[SUPABASE] save message error:', err));

    res.json({ success: true, message: newMessage });
  } catch (err: any) {
    console.error('[SERVER] POST /api/messages error:', err);
    res.status(500).json({ success: false, error: 'Failed to save message.' });
  }
});

// -------------------------------------------------------------
// 6.6. User Ratings, Reviews & Public Profile APIs
// -------------------------------------------------------------

function computeRatingSummary(ratings: { rating: number; skillName?: string }[]) {
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  if (!ratings || ratings.length === 0) {
    return {
      averageRating: 0,
      totalRatings: 0,
      distribution,
      skillRatings: {},
    };
  }

  let sum = 0;
  const skillMap: Record<string, { sum: number; count: number }> = {};

  for (const r of ratings) {
    const star = Math.max(1, Math.min(5, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
    distribution[star] = (distribution[star] || 0) + 1;
    sum += star;

    if (r.skillName && r.skillName.trim()) {
      const sName = r.skillName.trim();
      if (!skillMap[sName]) {
        skillMap[sName] = { sum: 0, count: 0 };
      }
      skillMap[sName].sum += star;
      skillMap[sName].count += 1;
    }
  }

  const skillRatings: Record<string, { averageRating: number; totalRatings: number }> = {};
  for (const [sName, data] of Object.entries(skillMap)) {
    skillRatings[sName] = {
      averageRating: Number((data.sum / data.count).toFixed(1)),
      totalRatings: data.count,
    };
  }

  const averageRating = Number((sum / ratings.length).toFixed(1));
  return {
    averageRating,
    totalRatings: ratings.length,
    distribution,
    skillRatings,
  };
}

// Fetch all ratings & summary for a user
app.get('/api/ratings/user/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.params.userId || '').trim();
    if (!userId) {
      res.status(400).json({ success: false, error: 'User ID is required.' });
      return;
    }

    // 1. Try fetching from Supabase first
    let ratingsList: StoredRating[] = [];
    const supabaseRatings = await fetchSupabaseRatingsForUser(userId);
    if (supabaseRatings !== null) {
      ratingsList = supabaseRatings.map(r => {
        const rater = serverUsersStore.get(r.raterId);
        return {
          id: r.id,
          raterId: r.raterId,
          raterName: rater?.name || r.raterName || 'Peer Member',
          raterAvatar: rater?.avatarUrl || r.raterAvatar,
          raterTitleOrRole: rater?.titleOrRole,
          ratedUserId: r.ratedUserId,
          rating: r.rating,
          review: r.review,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        };
      });
      // Sync local store
      ratingsList.forEach(r => serverRatingsStore.set(r.id, r));
    } else {
      // Fallback to local server store
      ratingsList = Array.from(serverRatingsStore.values()).filter(r => r.ratedUserId === userId);
    }

    // Enrich rater metadata
    const enriched = ratingsList.map(r => {
      const rater = serverUsersStore.get(r.raterId);
      return {
        id: r.id,
        raterId: r.raterId,
        raterName: rater?.name || r.raterName || 'Peer Member',
        raterAvatar: rater?.avatarUrl || r.raterAvatar,
        raterTitleOrRole: rater?.titleOrRole,
        ratedUserId: r.ratedUserId,
        rating: r.rating,
        review: r.review,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      };
    });

    enriched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const summary = computeRatingSummary(enriched);

    res.json({
      success: true,
      ratings: enriched,
      summary,
    });
  } catch (err: any) {
    console.error('[SERVER] GET /api/ratings/user/:userId error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch user ratings.' });
  }
});

// Check if rater is eligible to rate the rated user
app.get('/api/ratings/eligibility', async (req: Request, res: Response): Promise<void> => {
  try {
    const raterId = (req.query.raterId as string || '').trim();
    const ratedUserId = (req.query.ratedUserId as string || '').trim();

    if (!raterId || !ratedUserId) {
      res.status(400).json({ success: false, error: 'raterId and ratedUserId are required.' });
      return;
    }

    // Self rating rule: Cannot rate yourself
    if (raterId === ratedUserId) {
      res.json({
        success: true,
        canRate: false,
        reason: 'You cannot rate yourself.',
        existingRating: null,
      });
      return;
    }

    // Must have an established connection (ACCEPTED or ENDED) or mentorship interaction
    const hasAcceptedConnection = Array.from(serverConnectionsStore.values()).find(
      c => (c.status === 'ACCEPTED' || c.status === 'ENDED') &&
        ((c.senderId === raterId && c.receiverId === ratedUserId) ||
         (c.senderId === ratedUserId && c.receiverId === raterId))
    );

    const hasMentorshipInteraction = Array.from(serverMentorshipsStore.values()).find(
      m => ((m.mentorId === raterId && m.menteeId === ratedUserId) ||
           (m.mentorId === ratedUserId && m.menteeId === raterId))
    );

    const hasCompletedSession = Array.from(serverMentorshipSessionsStore.values()).find(
      s => s.status === 'COMPLETED' &&
        ((s.mentorId === raterId && s.menteeId === ratedUserId) ||
         (s.mentorId === ratedUserId && s.menteeId === raterId))
    );

    if (!hasAcceptedConnection && !hasMentorshipInteraction && !hasCompletedSession) {
      res.json({
        success: true,
        canRate: false,
        reason: 'Ratings are available after you participate in an accepted connection, mentorship, or completed session.',
        existingRating: null,
      });
      return;
    }

    // Check if an existing rating is recorded
    let existingRating: StoredRating | null = null;
    const remoteRating = await fetchSupabaseRatingBetweenUsers(raterId, ratedUserId);
    if (remoteRating) {
      existingRating = remoteRating;
      serverRatingsStore.set(remoteRating.id, remoteRating);
    } else {
      existingRating = Array.from(serverRatingsStore.values()).find(
        r => r.raterId === raterId && r.ratedUserId === ratedUserId
      ) || null;
    }

    res.json({
      success: true,
      canRate: true,
      existingRating,
      connectionId: hasAcceptedConnection?.id,
      reason: existingRating ? 'You have already rated this person. You can update your rating.' : undefined,
    });
  } catch (err: any) {
    console.error('[SERVER] GET /api/ratings/eligibility error:', err);
    res.status(500).json({ success: false, error: 'Failed to check rating eligibility.' });
  }
});

// Submit or update a rating
app.post('/api/ratings', async (req: Request, res: Response): Promise<void> => {
  try {
    const { raterId, ratedUserId, rating, review, skillName, interactionType, interactionId } = req.body || {};

    if (!raterId || !ratedUserId) {
      res.status(400).json({ success: false, error: 'raterId and ratedUserId are required.' });
      return;
    }

    if (raterId === ratedUserId) {
      res.status(400).json({ success: false, error: 'Self-rating is strictly prohibited.' });
      return;
    }

    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      res.status(400).json({ success: false, error: 'Rating must be an integer between 1 and 5.' });
      return;
    }

    // Verify established connection or mentorship interaction exists
    const hasAcceptedConnection = Array.from(serverConnectionsStore.values()).some(
      c => (c.status === 'ACCEPTED' || c.status === 'ENDED') &&
        ((c.senderId === raterId && c.receiverId === ratedUserId) ||
         (c.senderId === ratedUserId && c.receiverId === raterId))
    );

    const hasMentorshipInteraction = Array.from(serverMentorshipsStore.values()).some(
      m => ((m.mentorId === raterId && m.menteeId === ratedUserId) ||
           (m.mentorId === ratedUserId && m.menteeId === raterId))
    );

    const hasCompletedSession = Array.from(serverMentorshipSessionsStore.values()).some(
      s => s.status === 'COMPLETED' &&
        ((s.mentorId === raterId && s.menteeId === ratedUserId) ||
         (s.mentorId === ratedUserId && s.menteeId === raterId))
    );

    if (!hasAcceptedConnection && !hasMentorshipInteraction && !hasCompletedSession) {
      res.status(403).json({
        success: false,
        error: 'Ratings are only allowed between users who have an active or completed SkillMesh connection, mentorship, or completed session.',
      });
      return;
    }

    // Get rater info
    const raterUser = serverUsersStore.get(raterId);
    const raterName = raterUser?.name || 'Peer Member';
    const raterAvatar = raterUser?.avatarUrl;
    const raterTitleOrRole = raterUser?.titleOrRole;

    // Check for existing rating to update or create
    let existing = Array.from(serverRatingsStore.values()).find(
      r => r.raterId === raterId && r.ratedUserId === ratedUserId
    );

    const now = new Date().toISOString();
    const ratingRecord: StoredRating = {
      id: existing ? existing.id : `rating_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      raterId,
      raterName,
      raterAvatar,
      raterTitleOrRole,
      ratedUserId,
      rating: ratingNum,
      review: review ? String(review).trim().slice(0, 1000) : undefined,
      skillName: skillName ? String(skillName).trim().slice(0, 100) : (existing?.skillName || undefined),
      interactionType: interactionType ? String(interactionType).trim() : (existing?.interactionType || undefined),
      interactionId: interactionId ? String(interactionId).trim() : (existing?.interactionId || undefined),
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
    };

    // Save to local store
    serverRatingsStore.set(ratingRecord.id, ratingRecord);
    persistRatings();

    // Save to Supabase
    saveSupabaseRatingOnServer(ratingRecord).catch(err =>
      console.warn('[SUPABASE] Save rating background notice:', err)
    );

    // Notify the user who received the review
    createServerNotification({
      recipientId: ratedUserId,
      senderId: raterId,
      senderName: raterName,
      senderAvatar: raterAvatar,
      type: 'REVIEW_RECEIVED',
      title: 'New Review Received',
      message: `${raterName} left you a ${ratingNum}-star review: "${review ? String(review).slice(0, 60) + '...' : 'Great collaboration!'}"`,
      relatedId: ratingRecord.id,
    });

    // Compute updated summary
    const allUserRatings = Array.from(serverRatingsStore.values()).filter(r => r.ratedUserId === ratedUserId);
    const summary = computeRatingSummary(allUserRatings);

    res.json({
      success: true,
      rating: ratingRecord,
      summary,
    });
  } catch (err: any) {
    console.error('[SERVER] POST /api/ratings error:', err);
    res.status(500).json({ success: false, error: 'Failed to submit rating.' });
  }
});

// Delete a rating
app.delete('/api/ratings/:ratingId', async (req: Request, res: Response): Promise<void> => {
  try {
    const ratingId = (req.params.ratingId || '').trim();
    const raterId = (req.query.raterId as string || req.body?.raterId || '').trim();

    if (!ratingId) {
      res.status(400).json({ success: false, error: 'Rating ID is required.' });
      return;
    }

    const rating = serverRatingsStore.get(ratingId);
    if (!rating) {
      res.status(404).json({ success: false, error: 'Rating not found.' });
      return;
    }

    if (raterId && rating.raterId !== raterId) {
      res.status(403).json({ success: false, error: 'You can only delete your own ratings.' });
      return;
    }

    serverRatingsStore.delete(ratingId);
    persistRatings();

    deleteSupabaseRatingOnServer(ratingId, rating.raterId).catch(err =>
      console.warn('[SUPABASE] Delete rating notice:', err)
    );

    const remaining = Array.from(serverRatingsStore.values()).filter(r => r.ratedUserId === rating.ratedUserId);
    const summary = computeRatingSummary(remaining);

    res.json({ success: true, summary });
  } catch (err: any) {
    console.error('[SERVER] DELETE /api/ratings/:ratingId error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete rating.' });
  }
});

// Public profile endpoint (Strictly sanitized — NEVER exposes email or private info)
app.get('/api/users/:userId/public-profile', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.params.userId || '').trim();
    if (!userId) {
      res.status(400).json({ success: false, error: 'User ID is required.' });
      return;
    }

    // 1. Fetch user profile
    let user = serverUsersStore.get(userId);
    if (!user) {
      user = await fetchSupabaseUserProfileById(userId);
      if (user) {
        serverUsersStore.set(user.id, user);
      }
    }

    if (!user || isDemoAccount(user)) {
      res.status(404).json({ success: false, error: 'Profile unavailable or user not found.' });
      return;
    }

    // 2. Fetch ratings
    let userRatings = Array.from(serverRatingsStore.values()).filter(r => r.ratedUserId === userId);
    const supabaseRatings = await fetchSupabaseRatingsForUser(userId);
    if (supabaseRatings !== null) {
      userRatings = supabaseRatings.map(r => {
        const rater = serverUsersStore.get(r.raterId);
        return {
          id: r.id,
          raterId: r.raterId,
          raterName: rater?.name || r.raterName || 'Peer Member',
          raterAvatar: rater?.avatarUrl || r.raterAvatar,
          raterTitleOrRole: rater?.titleOrRole,
          ratedUserId: r.ratedUserId,
          rating: r.rating,
          review: r.review,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        };
      });
    }

    userRatings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const ratingSummary = computeRatingSummary(userRatings);

    // 3. Calculate exchange activities
    const userConnections = Array.from(serverConnectionsStore.values()).filter(
      c => (c.senderId === userId || c.receiverId === userId) && c.status === 'ACCEPTED'
    );

    const exchangeHistory = userConnections.map(c => {
      const isSender = c.senderId === userId;
      const partnerId = isSender ? c.receiverId : c.senderId;
      const partner = serverUsersStore.get(partnerId);
      return {
        id: c.id,
        partnerId,
        partnerName: partner?.name || (isSender ? c.receiverName : c.senderName) || 'Peer',
        partnerAvatar: partner?.avatarUrl,
        offeredSkill: isSender ? c.offeredSkillName : c.wantedSkillName,
        wantedSkill: isSender ? c.wantedSkillName : c.offeredSkillName,
        date: c.createdAt,
        status: c.status,
      };
    });

    // 4. Sanitize public profile (NO email, NO phone, NO password)
    const uAny = user as any;
    const sanitizedProfile = {
      id: user.id,
      name: user.name,
      titleOrRole: uAny.titleOrRole || 'Skill Explorer & Peer Mentor',
      bio: uAny.bio || '',
      avatarUrl: user.avatarUrl || '',
      bannerUrl: uAny.bannerUrl || null,
      status: uAny.status || 'STUDENT',
      institutionName: uAny.institutionName,
      organizationName: uAny.organizationName,
      occupationDetails: uAny.occupationDetails,
      location: uAny.location || '',
      joinedDate: uAny.joinedDate || new Date().toISOString(),
      isVerified: Boolean(uAny.isVerified && uAny.verificationStatus !== 'unverified'),
      verificationStatus: uAny.verificationStatus || (uAny.isVerified ? 'verified' : 'unverified'),
      verifiedAt: uAny.verifiedAt,
      verifiedBy: uAny.verifiedBy,
      verificationNotes: uAny.verificationNotes,
      linkedinUrl: uAny.linkedinUrl,
      githubUrl: uAny.githubUrl,
      portfolioUrl: uAny.portfolioUrl,
      professionalLinks: uAny.professionalLinks,
      offeredSkills: user.offeredSkills || [],
      wantedSkills: user.wantedSkills || [],
      projects: Array.isArray(uAny.projects) ? uAny.projects : [],
      activeProjectDescription: uAny.activeProjectDescription,
      collaborationInterests: uAny.collaborationInterests,
      matchPurposes: uAny.matchPurposes,
      mentorshipSchedule: uAny.mentorshipSchedule,
      accountStatus: uAny.accountStatus || 'ACTIVE',
      availabilityStatus: uAny.availabilityStatus || 'UNAVAILABLE',
      availabilityMode: uAny.availabilityMode || 'BOTH',
      availabilityUpdatedAt: uAny.availabilityUpdatedAt,
      timezone: uAny.timezone || 'UTC',
      ratingSummary,
      totalRatings: ratingSummary.totalRatings,
      averageRating: ratingSummary.averageRating,
    };

    const completedMentorships = Array.from(serverMentorshipSessionsStore.values()).filter(
      s => (s.mentorId === userId || s.menteeId === userId) && s.status === 'COMPLETED'
    ).length;

    res.json({
      success: true,
      profile: sanitizedProfile,
      ratingSummary,
      ratings: userRatings,
      stats: {
        totalExchanges: userConnections.length,
        skillsTaught: (user.offeredSkills || []).length,
        skillsLearned: (user.wantedSkills || []).length,
        ratingsReceived: userRatings.length,
        averageRating: ratingSummary.averageRating,
        mentorshipSessionsCount: completedMentorships,
      },
      exchangeHistory,
    });
  } catch (err: any) {
    console.error('[SERVER] GET /api/users/:userId/public-profile error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch public profile.' });
  }
});

// Database connectivity & health status API
app.get('/api/database/status', async (_req: Request, res: Response): Promise<void> => {
  try {
    const status = await testServerSupabaseConnection();
    res.json({
      success: true,
      configured: isSupabaseConfiguredOnServer(),
      status,
      localStoreCounts: {
        users: serverUsersStore.size,
        connections: serverConnectionsStore.size,
        messages: serverMessagesStore.length,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Database status error' });
  }
});

// -------------------------------------------------------------
// 7. Secure Admin APIs (Backend Authorization Enforced)
// -------------------------------------------------------------
app.get('/api/admin/overview', (req: Request, res: Response): void => {
  const auth = checkAdminAuthorization(req);
  if (!auth.authorized) {
    res.status(403).json({ success: false, error: 'Access Denied: Admin privileges required.' });
    return;
  }

  res.json({
    success: true,
    stats: calculateAdminStats(),
  });
});

app.get('/api/admin/users', (req: Request, res: Response): void => {
  const auth = checkAdminAuthorization(req);
  if (!auth.authorized) {
    res.status(403).json({ success: false, error: 'Access Denied: Admin privileges required.' });
    return;
  }

  const allUsersList = Array.from(serverUsersStore.values()).filter(u => !isDemoAccount(u));
  const allReports = Array.from(serverReportsStore.values());
  const allBlocks = Array.from(serverBlocksStore.values());
  const allRatings = Array.from(serverRatingsStore.values());
  const allConnections = Array.from(serverConnectionsStore.values());

  const enrichedUsers = allUsersList.map(u => {
    const receivedReportsCount = allReports.filter(r => r.reportedUserId === u.id).length;
    const receivedBlocksCount = allBlocks.filter(b => b.blockedUserId === u.id).length;
    const reportsReceivedCount = receivedReportsCount;
    const blocksReceivedCount = receivedBlocksCount;

    // Calculate rating stats
    const userRatings = allRatings.filter(r => r.ratedUserId === u.id);
    const totalRatings = userRatings.length;
    const averageRating = totalRatings > 0
      ? Number((userRatings.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / totalRatings).toFixed(1))
      : 0;

    // Calculate exchange stats
    const userExchanges = allConnections.filter(c => (c.senderId === u.id || c.receiverId === u.id));
    const completedExchanges = userExchanges.filter(c => c.status === 'ACCEPTED' || (c as any).status === 'COMPLETED').length;
    const totalExchanges = userExchanges.length;

    // Calculate mentorship stats
    const userSessions = Array.from(serverMentorshipSessionsStore.values()).filter(
      s => s.mentorId === u.id || s.menteeId === u.id
    );
    const completedMentorships = userSessions.filter(s => s.status === 'COMPLETED').length;
    const userMentorshipRequests = Array.from(serverMentorshipRequestsStore.values()).filter(
      r => r.mentorId === u.id || r.menteeId === u.id
    );

    return {
      ...u,
      skillmeshId: getSkillMeshUserId(u),
      isVerified: Boolean(u.isVerified),
      verificationStatus: u.verificationStatus || (u.isVerified ? 'verified' : 'unverified'),
      verifiedAt: (u as any).verifiedAt || (u.isVerified ? (u as any).verificationDate || (u as any).joinedDate : null),
      verifiedBy: (u as any).verifiedBy || (u.isVerified ? 'SkillMesh Administrator' : null),
      verificationNotes: (u as any).verificationNotes || null,
      receivedReportsCount,
      receivedBlocksCount,
      flagsCount: receivedReportsCount + receivedBlocksCount,
      reportsReceivedCount,
      blocksReceivedCount,
      averageRating,
      totalRatings,
      totalReviews: totalRatings,
      totalExchanges,
      completedExchanges,
      completedMentorships,
      totalMentorships: userMentorshipRequests.length,
    };
  });

  res.json({
    success: true,
    users: enrichedUsers,
    totalCount: enrichedUsers.length,
  });
});

// -------------------------------------------------------------
// Dedicated Admin Verification Management Endpoint
// -------------------------------------------------------------
app.get('/api/admin/verifications', (req: Request, res: Response): void => {
  const auth = checkAdminAuthorization(req);
  if (!auth.authorized) {
    res.status(403).json({ success: false, error: 'Access Denied: Admin privileges required.' });
    return;
  }

  const allUsersList = Array.from(serverUsersStore.values()).filter(u => !isDemoAccount(u));
  const allRatings = Array.from(serverRatingsStore.values());
  const allConnections = Array.from(serverConnectionsStore.values());
  const allSessions = Array.from(serverMentorshipSessionsStore.values());

  const users = allUsersList.map(u => {
    const userRatings = allRatings.filter(r => r.ratedUserId === u.id);
    const totalRatings = userRatings.length;
    const averageRating = totalRatings > 0
      ? Number((userRatings.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / totalRatings).toFixed(1))
      : 0;

    const userExchanges = allConnections.filter(c => (c.senderId === u.id || c.receiverId === u.id));
    const completedExchanges = userExchanges.filter(c => c.status === 'ACCEPTED' || (c as any).status === 'COMPLETED').length;

    const userSessions = allSessions.filter(s => (s.mentorId === u.id || s.menteeId === u.id) && s.status === 'COMPLETED');
    const completedMentorships = userSessions.length;

    const isVerified = Boolean(u.isVerified);
    // Eligible / Recommended for Verification if completed at least 1 exchange/mentorship or rating >= 4.5
    const isEligible = !isVerified && (completedExchanges > 0 || completedMentorships > 0 || averageRating >= 4.0 || (u.offeredSkills && u.offeredSkills.length > 0));

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      avatarUrl: u.avatarUrl,
      titleOrRole: u.titleOrRole,
      institutionName: (u as any).institutionName || (u as any).organizationName || u.institutionOrOrg || '',
      joinedDate: u.joinedDate,
      skillmeshId: getSkillMeshUserId(u),
      isVerified,
      verificationStatus: u.verificationStatus || (isVerified ? 'verified' : 'unverified'),
      verifiedAt: (u as any).verifiedAt || null,
      verifiedBy: (u as any).verifiedBy || null,
      verificationNotes: (u as any).verificationNotes || null,
      accountStatus: u.accountStatus || 'ACTIVE',
      totalExchanges: userExchanges.length,
      successfulExchanges: completedExchanges,
      completedMentorships,
      averageRating,
      totalReviews: totalRatings,
      isEligible,
      offeredSkillsCount: u.offeredSkills?.length || 0,
      wantedSkillsCount: u.wantedSkills?.length || 0,
    };
  });

  const verifiedCount = users.filter(u => u.isVerified).length;
  const unverifiedCount = users.filter(u => !u.isVerified).length;
  const eligibleCount = users.filter(u => u.isEligible).length;

  res.json({
    success: true,
    stats: {
      totalUsers: users.length,
      verifiedCount,
      unverifiedCount,
      eligibleCount,
    },
    users,
  });
});

// -------------------------------------------------------------
// Admin Exchanges Management Endpoint
// -------------------------------------------------------------
app.get('/api/admin/exchanges', (req: Request, res: Response): void => {
  const auth = checkAdminAuthorization(req);
  if (!auth.authorized) {
    res.status(403).json({ success: false, error: 'Access Denied: Admin privileges required.' });
    return;
  }

  const allConnections = Array.from(serverConnectionsStore.values());
  const allRatings = Array.from(serverRatingsStore.values());

  const exchanges = allConnections.map(c => {
    const sender = serverUsersStore.get(c.senderId);
    const receiver = serverUsersStore.get(c.receiverId);

    // Find any rating connected to this interaction
    const relatedRating = allRatings.find(
      r => (r.raterId === c.senderId && r.ratedUserId === c.receiverId) ||
           (r.raterId === c.receiverId && r.ratedUserId === c.senderId)
    );

    return {
      id: c.id,
      senderId: c.senderId,
      senderName: sender?.name || c.senderName || 'Unknown Member',
      senderEmail: sender?.email || '',
      senderAvatar: sender?.avatarUrl || '',
      senderSkillmeshId: sender ? getSkillMeshUserId(sender) : 'SM-000000',
      senderVerified: Boolean(sender?.isVerified),
      receiverId: c.receiverId,
      receiverName: receiver?.name || c.receiverName || 'Unknown Member',
      receiverEmail: receiver?.email || '',
      receiverAvatar: receiver?.avatarUrl || '',
      receiverSkillmeshId: receiver ? getSkillMeshUserId(receiver) : 'SM-000000',
      receiverVerified: Boolean(receiver?.isVerified),
      offeredSkillName: c.offeredSkillName || '',
      wantedSkillName: c.wantedSkillName || '',
      status: c.status,
      requestType: c.requestType || 'MUTUAL_EXCHANGE',
      note: c.note || '',
      contactMethod: c.contactMethod || 'In-App Chat',
      createdAt: c.createdAt,
      endedAt: (c as any).endedAt || null,
      endedBy: (c as any).endedBy || null,
      endReason: (c as any).endReason || null,
      relatedRating: relatedRating ? {
        rating: relatedRating.rating,
        review: relatedRating.review,
        raterName: relatedRating.raterName,
        createdAt: relatedRating.createdAt,
      } : null,
    };
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json({
    success: true,
    exchanges,
    totalCount: exchanges.length,
  });
});

// -------------------------------------------------------------
// Admin Mentorships Management Endpoint
// -------------------------------------------------------------
app.get('/api/admin/mentorships', (req: Request, res: Response): void => {
  const auth = checkAdminAuthorization(req);
  if (!auth.authorized) {
    res.status(403).json({ success: false, error: 'Access Denied: Admin privileges required.' });
    return;
  }

  const allRequests = Array.from(serverMentorshipRequestsStore.values());
  const allSessions = Array.from(serverMentorshipSessionsStore.values());

  const items: any[] = [];

  for (const s of allSessions) {
    const mentor = serverUsersStore.get(s.mentorId);
    const mentee = serverUsersStore.get(s.menteeId);
    items.push({
      id: s.id,
      type: 'SESSION',
      mentorId: s.mentorId,
      mentorName: mentor?.name || s.mentorName || 'Mentor',
      mentorEmail: mentor?.email || '',
      mentorAvatar: mentor?.avatarUrl || '',
      mentorSkillmeshId: mentor ? getSkillMeshUserId(mentor) : 'SM-000000',
      mentorVerified: Boolean(mentor?.isVerified),
      menteeId: s.menteeId,
      menteeName: mentee?.name || s.menteeName || 'Mentee',
      menteeEmail: mentee?.email || '',
      menteeAvatar: mentee?.avatarUrl || '',
      menteeSkillmeshId: mentee ? getSkillMeshUserId(mentee) : 'SM-000000',
      menteeVerified: Boolean(mentee?.isVerified),
      topic: s.topic || 'Mentorship Session',
      status: s.status,
      scheduledDate: s.date || '',
      startTime: s.startTime || '',
      endTime: s.endTime || '',
      durationMinutes: s.durationMinutes || 45,
      format: s.format || 'VIDEO_CALL',
      meetingUrl: s.meetingUrl || '',
      createdAt: s.createdAt,
    });
  }

  for (const r of allRequests) {
    // If not already covered as a session
    const mentor = serverUsersStore.get(r.mentorId);
    const mentee = serverUsersStore.get(r.menteeId);
    items.push({
      id: r.id,
      type: 'REQUEST',
      mentorId: r.mentorId,
      mentorName: mentor?.name || r.mentorName || 'Mentor',
      mentorEmail: mentor?.email || '',
      mentorAvatar: mentor?.avatarUrl || '',
      mentorSkillmeshId: mentor ? getSkillMeshUserId(mentor) : 'SM-000000',
      mentorVerified: Boolean(mentor?.isVerified),
      menteeId: r.menteeId,
      menteeName: mentee?.name || r.menteeName || 'Mentee',
      menteeEmail: mentee?.email || '',
      menteeAvatar: mentee?.avatarUrl || '',
      menteeSkillmeshId: mentee ? getSkillMeshUserId(mentee) : 'SM-000000',
      menteeVerified: Boolean(mentee?.isVerified),
      topic: r.topic || r.message || 'Mentorship Request',
      status: r.status,
      durationMinutes: r.durationMinutes || 30,
      format: r.format || 'VIDEO_CALL',
      createdAt: r.createdAt,
    });
  }

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json({
    success: true,
    mentorships: items,
    totalCount: items.length,
  });
});

// -------------------------------------------------------------
// Admin Reviews & Ratings Management Endpoint
// -------------------------------------------------------------
app.get('/api/admin/reviews', (req: Request, res: Response): void => {
  const auth = checkAdminAuthorization(req);
  if (!auth.authorized) {
    res.status(403).json({ success: false, error: 'Access Denied: Admin privileges required.' });
    return;
  }

  const allRatings = Array.from(serverRatingsStore.values());

  const reviews = allRatings.map(r => {
    const rater = serverUsersStore.get(r.raterId);
    const ratedUser = serverUsersStore.get(r.ratedUserId);

    return {
      id: r.id,
      raterId: r.raterId,
      raterName: rater?.name || r.raterName || 'Anonymous Member',
      raterEmail: rater?.email || '',
      raterAvatar: rater?.avatarUrl || r.raterAvatar || '',
      raterSkillmeshId: rater ? getSkillMeshUserId(rater) : 'SM-000000',
      raterVerified: Boolean(rater?.isVerified),
      ratedUserId: r.ratedUserId,
      ratedUserName: ratedUser?.name || 'Rated Member',
      ratedUserEmail: ratedUser?.email || '',
      ratedUserAvatar: ratedUser?.avatarUrl || '',
      ratedUserSkillmeshId: ratedUser ? getSkillMeshUserId(ratedUser) : 'SM-000000',
      ratedUserVerified: Boolean(ratedUser?.isVerified),
      rating: r.rating,
      review: r.review || '',
      skillName: r.skillName || '',
      interactionType: r.interactionType || 'SKILL_EXCHANGE',
      createdAt: r.createdAt,
    };
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json({
    success: true,
    reviews,
    totalCount: reviews.length,
  });
});

// -------------------------------------------------------------
// Admin User Blocks & Safety Endpoint
// -------------------------------------------------------------
app.get('/api/admin/blocks', (req: Request, res: Response): void => {
  const auth = checkAdminAuthorization(req);
  if (!auth.authorized) {
    res.status(403).json({ success: false, error: 'Access Denied: Admin privileges required.' });
    return;
  }

  const allBlocks = Array.from(serverBlocksStore.values());

  const blocks = allBlocks.map(b => {
    const blocker = serverUsersStore.get(b.blockerId);
    const blockedUser = serverUsersStore.get(b.blockedUserId);

    return {
      id: b.id,
      blockerId: b.blockerId,
      blockerName: blocker?.name || 'Member',
      blockerEmail: blocker?.email || '',
      blockerAvatar: blocker?.avatarUrl || '',
      blockerSkillmeshId: blocker ? getSkillMeshUserId(blocker) : 'SM-000000',
      blockedUserId: b.blockedUserId,
      blockedUserName: blockedUser?.name || 'Blocked Member',
      blockedUserEmail: blockedUser?.email || '',
      blockedUserAvatar: blockedUser?.avatarUrl || '',
      blockedUserSkillmeshId: blockedUser ? getSkillMeshUserId(blockedUser) : 'SM-000000',
      reason: b.reason || 'User requested block',
      createdAt: b.createdAt,
    };
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json({
    success: true,
    blocks,
    totalCount: blocks.length,
  });
});

app.post('/api/admin/users/:userId/status', (req: Request, res: Response): void => {
  const auth = checkAdminAuthorization(req);
  if (!auth.authorized) {
    res.status(403).json({ success: false, error: 'Access Denied: Admin privileges required.' });
    return;
  }

  const { userId } = req.params;
  const { status, reason, targetUserName, targetUserEmail } = req.body;

  if (!status || !['ACTIVE', 'SUSPENDED', 'BANNED'].includes(status)) {
    res.status(400).json({ success: false, error: 'Valid status (ACTIVE, SUSPENDED, BANNED) is required.' });
    return;
  }

  const user = serverUsersStore.get(userId);
  const previousStatus = user ? user.accountStatus : 'ACTIVE';

  const updated: StoredUser = user ? {
    ...user,
    accountStatus: status as 'ACTIVE' | 'SUSPENDED' | 'BANNED',
    statusReason: reason || (status === 'ACTIVE' ? 'Restored by administrator' : 'Moderation review'),
    statusUpdatedAt: new Date().toISOString(),
  } : {
    id: userId,
    name: targetUserName || 'User',
    email: targetUserEmail || '',
    joinedDate: new Date().toISOString(),
    isProfileComplete: true,
    accountStatus: status as 'ACTIVE' | 'SUSPENDED' | 'BANNED',
    statusReason: reason || 'Moderation review',
    statusUpdatedAt: new Date().toISOString(),
    role: 'user',
    offeredSkillsCount: 0,
    wantedSkillsCount: 0,
  };

  serverUsersStore.set(userId, updated);
  persistUsers();

  // Record audit log
  const actionType = status === 'ACTIVE' ? 'RESTORE' : status === 'SUSPENDED' ? 'SUSPEND' : 'BAN';
  const auditLog: StoredAuditLog = {
    id: `log_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    adminId: auth.userId,
    adminEmail: auth.email,
    adminName: auth.name,
    targetUserId: userId,
    targetUserName: updated.name,
    targetUserEmail: updated.email,
    action: actionType,
    previousStatus,
    newStatus: status,
    reason: reason || `Account status changed to ${status}`,
    timestamp: new Date().toISOString(),
  };

  serverAuditLogs.unshift(auditLog);
  persistAuditLogs();
  console.log(`[ADMIN ACTION] ${auth.email} performed ${actionType} on user ${userId} (${updated.email}). Reason: ${reason}`);

  broadcastToAdmins('USER_STATUS_CHANGED', {
    user: updated,
    log: auditLog,
    stats: calculateAdminStats(),
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, user: updated, log: auditLog });
});

app.get('/api/admin/reports', (req: Request, res: Response): void => {
  const auth = checkAdminAuthorization(req);
  if (!auth.authorized) {
    res.status(403).json({ success: false, error: 'Access Denied: Admin privileges required.' });
    return;
  }

  const reports = Array.from(serverReportsStore.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  res.json({ success: true, reports });
});

app.post('/api/admin/reports/:reportId/status', (req: Request, res: Response): void => {
  const auth = checkAdminAuthorization(req);
  if (!auth.authorized) {
    res.status(403).json({ success: false, error: 'Access Denied: Admin privileges required.' });
    return;
  }

  const { reportId } = req.params;
  const { status, resolutionNotes } = req.body;

  if (!status || !['PENDING_REVIEW', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'].includes(status)) {
    res.status(400).json({ success: false, error: 'Valid report status is required.' });
    return;
  }

  const report = serverReportsStore.get(reportId);
  if (!report) {
    res.status(404).json({ success: false, error: 'Report not found.' });
    return;
  }

  const previousStatus = report.status;
  report.status = status;
  report.resolutionNotes = resolutionNotes || report.resolutionNotes;
  report.resolvedAt = (status === 'RESOLVED' || status === 'DISMISSED') ? new Date().toISOString() : undefined;
  report.resolvedBy = auth.email;

  serverReportsStore.set(reportId, report);
  persistReports();

  // Log report action
  const auditEntry: StoredAuditLog = {
    id: `log_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    adminId: auth.userId,
    adminEmail: auth.email,
    adminName: auth.name,
    targetUserId: report.reportedUserId,
    targetUserName: report.reportedUserName,
    targetUserEmail: report.reportedUserEmail || '',
    action: 'REPORT_STATUS_CHANGE',
    previousStatus,
    newStatus: status,
    reason: resolutionNotes || `Report status updated to ${status}`,
    timestamp: new Date().toISOString(),
    relatedReportId: reportId,
  };

  serverAuditLogs.unshift(auditEntry);
  persistAuditLogs();

  broadcastToAdmins('REPORT_STATUS_CHANGED', {
    report,
    log: auditEntry,
    stats: calculateAdminStats(),
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, report });
});

app.get('/api/admin/audit-logs', (req: Request, res: Response): void => {
  const auth = checkAdminAuthorization(req);
  if (!auth.authorized) {
    res.status(403).json({ success: false, error: 'Access Denied: Admin privileges required.' });
    return;
  }

  res.json({ success: true, logs: serverAuditLogs.slice(0, 100) });
});

// -------------------------------------------------------------
// 9. API: Live Availability Endpoints
// -------------------------------------------------------------
interface StoredAvailability {
  userId: string;
  status: 'AVAILABLE' | 'UNAVAILABLE';
  mode: 'SKILL_EXCHANGE' | 'MENTORSHIP' | 'BOTH';
  customStatus?: string;
  timezone?: string;
  updatedAt: string;
}

const AVAILABILITY_FILE = path.join(DATA_DIR, 'availability.json');
const serverAvailabilityStore: Map<string, StoredAvailability> = new Map();

function loadAvailabilityStore() {
  try {
    const list = safeLoadJson<StoredAvailability[]>(AVAILABILITY_FILE, []);
    for (const item of list) {
      serverAvailabilityStore.set(item.userId, item);
    }
  } catch (err) {
    console.warn('[SERVER] Load availability notice:', err);
  }
}
loadAvailabilityStore();

function persistAvailabilityStore() {
  safeSaveJson(AVAILABILITY_FILE, Array.from(serverAvailabilityStore.values()));
}

// Update availability
app.post('/api/availability', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, status, mode, customStatus, timezone } = req.body;
    if (!userId) {
      res.status(400).json({ success: false, error: 'User ID is required.' });
      return;
    }

    const availStatus = status === 'AVAILABLE' ? 'AVAILABLE' : 'UNAVAILABLE';
    const availMode = ['SKILL_EXCHANGE', 'MENTORSHIP', 'BOTH'].includes(mode) ? mode : 'BOTH';
    const now = new Date().toISOString();

    const record: StoredAvailability = {
      userId,
      status: availStatus,
      mode: availMode,
      customStatus: customStatus ? String(customStatus).slice(0, 100) : undefined,
      timezone: timezone || undefined,
      updatedAt: now,
    };

    serverAvailabilityStore.set(userId, record);
    persistAvailabilityStore();

    // Also update server user store if user is present
    const user = serverUsersStore.get(userId);
    if (user) {
      user.availabilityStatus = availStatus;
      user.availabilityMode = availMode;
      user.availabilityUpdatedAt = now;
      if (timezone) user.timezone = timezone;
      serverUsersStore.set(userId, user);
      persistUsers();
    }

    // Persist to Supabase asynchronously
    saveSupabaseUserAvailability(record).catch(err =>
      console.warn('[SUPABASE] save availability notice:', err)
    );

    res.json({ success: true, availability: record });
  } catch (err: any) {
    console.error('[SERVER] POST /api/availability error:', err);
    res.status(500).json({ success: false, error: 'Failed to update availability.' });
  }
});

// Get user availability (with 30-minute stale auto-expiry if no heartbeat)
app.get('/api/availability/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    let record = serverAvailabilityStore.get(userId);

    if (!record) {
      const supabaseAvail = await fetchSupabaseUserAvailability(userId);
      if (supabaseAvail) {
        record = supabaseAvail;
        serverAvailabilityStore.set(userId, supabaseAvail);
      }
    }

    if (!record) {
      res.json({
        success: true,
        availability: {
          userId,
          status: 'UNAVAILABLE',
          mode: 'BOTH',
          updatedAt: new Date().toISOString(),
        },
      });
      return;
    }

    // Check if stale (older than 35 mins without heartbeat)
    const lastTime = new Date(record.updatedAt).getTime();
    const isStale = Date.now() - lastTime > 35 * 60 * 1000;
    const computedStatus = isStale ? 'UNAVAILABLE' : record.status;

    res.json({
      success: true,
      availability: {
        ...record,
        status: computedStatus,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to get availability.' });
  }
});

// Get batch availabilities
app.get('/api/availability', async (req: Request, res: Response): Promise<void> => {
  try {
    const result: Record<string, StoredAvailability> = {};
    const now = Date.now();
    const staleThreshold = 35 * 60 * 1000;

    // First load from memory
    for (const [uid, item] of serverAvailabilityStore.entries()) {
      const isStale = now - new Date(item.updatedAt).getTime() > staleThreshold;
      result[uid] = {
        ...item,
        status: isStale ? 'UNAVAILABLE' : item.status,
      };
    }

    // Try merging Supabase records if any missing
    try {
      const supabaseMap = await fetchAllSupabaseAvailabilities();
      for (const [uid, item] of Object.entries(supabaseMap)) {
        if (!result[uid]) {
          const isStale = now - new Date(item.updatedAt).getTime() > staleThreshold;
          result[uid] = {
            ...item,
            status: isStale ? 'UNAVAILABLE' : item.status,
          };
          serverAvailabilityStore.set(uid, item);
        }
      }
    } catch {
      // ignore
    }

    res.json({ success: true, availabilities: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch availabilities.' });
  }
});

// -------------------------------------------------------------
// 10. API: Mentorship Requests & Management Endpoints
// -------------------------------------------------------------
const MENTORSHIP_REQS_FILE = path.join(DATA_DIR, 'mentorship_requests.json');
const MENTORSHIPS_FILE = path.join(DATA_DIR, 'mentorships.json');
const MENTORSHIP_SESSIONS_FILE = path.join(DATA_DIR, 'mentorship_sessions.json');
const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'notifications.json');

const serverMentorshipRequestsStore: Map<string, any> = new Map();
const serverMentorshipsStore: Map<string, any> = new Map();
const serverMentorshipSessionsStore: Map<string, any> = new Map();
const serverNotificationsStore: Map<string, any> = new Map();

function loadMentorshipStores() {
  try {
    const reqs = safeLoadJson<any[]>(MENTORSHIP_REQS_FILE, []);
    for (const r of reqs) serverMentorshipRequestsStore.set(r.id, r);

    const ms = safeLoadJson<any[]>(MENTORSHIPS_FILE, []);
    for (const m of ms) serverMentorshipsStore.set(m.id, m);

    const sessions = safeLoadJson<any[]>(MENTORSHIP_SESSIONS_FILE, []);
    for (const s of sessions) serverMentorshipSessionsStore.set(s.id, s);

    const notifs = safeLoadJson<any[]>(NOTIFICATIONS_FILE, []);
    for (const n of notifs) serverNotificationsStore.set(n.id, n);
  } catch (err) {
    console.warn('[SERVER] Load mentorship stores notice:', err);
  }
}
loadMentorshipStores();

function persistMentorshipStores() {
  safeSaveJson(MENTORSHIP_REQS_FILE, Array.from(serverMentorshipRequestsStore.values()));
  safeSaveJson(MENTORSHIPS_FILE, Array.from(serverMentorshipsStore.values()));
  safeSaveJson(MENTORSHIP_SESSIONS_FILE, Array.from(serverMentorshipSessionsStore.values()));
  safeSaveJson(NOTIFICATIONS_FILE, Array.from(serverNotificationsStore.values()));
}

// Helper to create and persist in-app notifications
export async function createServerNotification(data: {
  recipientId: string;
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
  type: string;
  title: string;
  message: string;
  relatedId?: string;
}) {
  if (!data.recipientId) return null;
  const id = `notif_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const notif = {
    id,
    recipientId: data.recipientId,
    senderId: data.senderId,
    senderName: data.senderName,
    senderAvatar: data.senderAvatar,
    type: data.type,
    title: data.title,
    message: data.message,
    relatedId: data.relatedId,
    isRead: false,
    createdAt: new Date().toISOString()
  };

  serverNotificationsStore.set(id, notif);
  persistMentorshipStores();

  // Asynchronously save to Supabase
  saveSupabaseNotification(notif).catch(() => {});
  return notif;
}

// Send a mentorship request
app.post('/api/mentorship/requests', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      mentorId,
      menteeId,
      topic,
      message,
      experienceLevel,
      sessionStyle,
      preferredAvailability,
      proposedStart,
      proposedEnd,
      durationMinutes,
      timezone,
      recurringPreference,
    } = req.body;

    if (!mentorId || !menteeId || !topic || !message) {
      res.status(400).json({ success: false, error: 'Mentor, mentee, topic, and message are required.' });
      return;
    }

    if (mentorId === menteeId) {
      res.status(400).json({ success: false, error: 'You cannot request mentorship from yourself.' });
      return;
    }

    const mentor = serverUsersStore.get(mentorId) || (await fetchSupabaseUserProfileById(mentorId));
    const mentee = serverUsersStore.get(menteeId) || (await fetchSupabaseUserProfileById(menteeId));

    if (!mentor || !mentee) {
      res.status(404).json({ success: false, error: 'User profile not found.' });
      return;
    }

    // Check for existing pending request
    const existing = Array.from(serverMentorshipRequestsStore.values()).find(
      r => r.mentorId === mentorId && r.menteeId === menteeId && r.status === 'PENDING'
    );
    if (existing) {
      res.status(400).json({ success: false, error: 'You already have a pending mentorship request to this mentor.' });
      return;
    }

    const requestId = `mreq_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const newRequest = {
      id: requestId,
      mentorId,
      mentorName: mentor.name,
      mentorAvatar: mentor.avatarUrl,
      mentorTitle: (mentor as any).titleOrRole || 'Mentor',
      menteeId,
      menteeName: mentee.name,
      menteeAvatar: mentee.avatarUrl,
      menteeTitle: (mentee as any).titleOrRole || 'Member',
      topic: topic.trim(),
      message: message.trim(),
      experienceLevel: experienceLevel || 'Beginner',
      sessionStyle: sessionStyle || 'Flexible',
      preferredAvailability: preferredAvailability?.trim() || undefined,
      proposedStart: proposedStart || undefined,
      proposedEnd: proposedEnd || undefined,
      durationMinutes: durationMinutes || 45,
      timezone: timezone || 'UTC',
      recurringPreference: recurringPreference || 'ONE_OFF',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    serverMentorshipRequestsStore.set(requestId, newRequest);
    persistMentorshipStores();

    // Persist to Supabase
    saveSupabaseMentorshipRequest(newRequest).catch(err =>
      console.warn('[SUPABASE] save mentorship request notice:', err)
    );

    // Notify the mentor
    createServerNotification({
      recipientId: mentorId,
      senderId: menteeId,
      senderName: mentee.name,
      senderAvatar: mentee.avatarUrl,
      type: 'MENTORSHIP_REQUEST',
      title: 'New Mentorship Request',
      message: `${mentee.name} requested mentorship in "${topic.trim()}"`,
      relatedId: requestId,
    });

    res.json({ success: true, request: newRequest });
  } catch (err: any) {
    console.error('[SERVER] POST /api/mentorship/requests error:', err);
    res.status(500).json({ success: false, error: 'Failed to send mentorship request.' });
  }
});

// Fetch mentorship requests for a user
app.get('/api/mentorship/requests', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.query.userId as string || '').trim();
    if (!userId) {
      res.status(400).json({ success: false, error: 'User ID is required.' });
      return;
    }

    // Pull from Supabase first if configured, else use memory store
    let requests = await fetchSupabaseMentorshipRequests(userId);
    if (requests.length === 0) {
      requests = Array.from(serverMentorshipRequestsStore.values()).filter(
        r => r.mentorId === userId || r.menteeId === userId
      );
    } else {
      for (const r of requests) serverMentorshipRequestsStore.set(r.id, r);
    }

    requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const incoming = requests.filter(r => r.mentorId === userId);
    const outgoing = requests.filter(r => r.menteeId === userId);

    res.json({ success: true, incoming, outgoing, all: requests });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch mentorship requests.' });
  }
});

// Respond to mentorship request (ACCEPT, DECLINE, CANCEL)
app.post('/api/mentorship/requests/:requestId/respond', async (req: Request, res: Response): Promise<void> => {
  try {
    const { requestId } = req.params;
    const { userId, action } = req.body;

    if (!requestId || !userId || !action) {
      res.status(400).json({ success: false, error: 'Request ID, user ID, and action are required.' });
      return;
    }

    const request = serverMentorshipRequestsStore.get(requestId);
    if (!request) {
      res.status(404).json({ success: false, error: 'Mentorship request not found.' });
      return;
    }

    const now = new Date().toISOString();

    if (action === 'ACCEPT') {
      if (request.mentorId !== userId) {
        res.status(403).json({ success: false, error: 'Only the designated mentor can accept this request.' });
        return;
      }

      // Check or create an active 1-on-1 connection so chat is immediately unlocked
      let connection = Array.from(serverConnectionsStore.values()).find(
        c => ((c.senderId === request.mentorId && c.receiverId === request.menteeId) ||
             (c.senderId === request.menteeId && c.receiverId === request.mentorId)) &&
             c.status === 'ACCEPTED'
      );

      if (!connection) {
        const connId = `conn_mentor_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
        connection = {
          id: connId,
          senderId: request.menteeId,
          senderName: request.menteeName,
          senderAvatar: request.menteeAvatar,
          senderSkill: request.topic,
          receiverId: request.mentorId,
          receiverName: request.mentorName,
          receiverAvatar: request.mentorAvatar,
          receiverSkill: 'Mentorship: ' + request.topic,
          offeredSkillName: 'Mentee Learning: ' + request.topic,
          wantedSkillName: 'Mentorship: ' + request.topic,
          note: 'Mentorship connection established for ' + request.topic,
          status: 'ACCEPTED',
          createdAt: now,
          updatedAt: now,
        };
        serverConnectionsStore.set(connId, connection);
        persistConnections();
        saveSupabaseConnectionOnServer(connection).catch(() => {});
      }

      request.status = 'ACCEPTED';
      request.connectionId = connection.id;
      request.updatedAt = now;

      // Create Active Mentorship record
      const mentorshipId = `mship_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const newMentorship = {
        id: mentorshipId,
        requestId: request.id,
        mentorId: request.mentorId,
        mentorName: request.mentorName,
        mentorAvatar: request.mentorAvatar,
        mentorTitle: request.mentorTitle,
        menteeId: request.menteeId,
        menteeName: request.menteeName,
        menteeAvatar: request.menteeAvatar,
        menteeTitle: request.menteeTitle,
        topic: request.topic,
        status: 'ACTIVE',
        startDate: now,
        connectionId: connection.id,
        createdAt: now,
      };

      serverMentorshipsStore.set(mentorshipId, newMentorship);
      saveSupabaseActiveMentorship(newMentorship).catch(() => {});
      serverMentorshipRequestsStore.set(requestId, request);

      // Automatically create a scheduled session based on proposed dates or next 48 hours
      const sessionId = `msess_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const proposedStart = request.proposedStart || new Date(Date.now() + 48 * 3600 * 1000).toISOString();
      const dur = request.durationMinutes || 45;
      const proposedEnd = request.proposedEnd || new Date(new Date(proposedStart).getTime() + dur * 60 * 1000).toISOString();

      const newSession = {
        id: sessionId,
        mentorshipRequestId: request.id,
        mentorId: request.mentorId,
        mentorName: request.mentorName,
        mentorAvatar: request.mentorAvatar,
        mentorTitle: request.mentorTitle,
        menteeId: request.menteeId,
        menteeName: request.menteeName,
        menteeAvatar: request.menteeAvatar,
        menteeTitle: request.menteeTitle,
        topic: request.topic,
        scheduledStart: proposedStart,
        scheduledEnd: proposedEnd,
        durationMinutes: dur,
        timezone: request.timezone || 'UTC',
        status: 'UPCOMING',
        connectionId: connection.id,
        createdAt: now,
        updatedAt: now
      };

      serverMentorshipSessionsStore.set(sessionId, newSession);
      saveSupabaseMentorshipSession(newSession).catch(() => {});
      persistMentorshipStores();
      saveSupabaseMentorshipRequest(request).catch(() => {});

      // Notify the mentee that request was accepted
      createServerNotification({
        recipientId: request.menteeId,
        senderId: request.mentorId,
        senderName: request.mentorName,
        senderAvatar: request.mentorAvatar,
        type: 'MENTORSHIP_ACCEPTED',
        title: 'Mentorship Accepted!',
        message: `${request.mentorName} accepted your mentorship request in "${request.topic}". Chat and calling are now unlocked!`,
        relatedId: connection.id,
      });

      // Notify mentee of scheduled session
      createServerNotification({
        recipientId: request.menteeId,
        senderId: request.mentorId,
        senderName: request.mentorName,
        senderAvatar: request.mentorAvatar,
        type: 'SESSION_SCHEDULED',
        title: 'Mentorship Session Scheduled',
        message: `Your session with ${request.mentorName} on "${request.topic}" is scheduled.`,
        relatedId: sessionId,
      });

      res.json({
        success: true,
        request,
        mentorship: newMentorship,
        session: newSession,
        connectionId: connection.id
      });
      return;
    } else if (action === 'DECLINE') {
      if (request.mentorId !== userId) {
        res.status(403).json({ success: false, error: 'Only the mentor can decline this request.' });
        return;
      }
      request.status = 'DECLINED';
      request.updatedAt = now;
      serverMentorshipRequestsStore.set(requestId, request);
      persistMentorshipStores();
      saveSupabaseMentorshipRequest(request).catch(() => {});

      // Notify mentee of decline
      createServerNotification({
        recipientId: request.menteeId,
        senderId: request.mentorId,
        senderName: request.mentorName,
        senderAvatar: request.mentorAvatar,
        type: 'MENTORSHIP_DECLINED',
        title: 'Mentorship Request Declined',
        message: `${request.mentorName} was unable to accept your mentorship request in "${request.topic}".`,
        relatedId: request.id,
      });

      res.json({ success: true, request });
      return;
    } else if (action === 'CANCEL') {
      if (request.menteeId !== userId) {
        res.status(403).json({ success: false, error: 'Only the mentee can cancel this request.' });
        return;
      }
      request.status = 'CANCELLED';
      request.updatedAt = now;
      serverMentorshipRequestsStore.set(requestId, request);
      persistMentorshipStores();
      saveSupabaseMentorshipRequest(request).catch(() => {});
      res.json({ success: true, request });
      return;
    } else {
      res.status(400).json({ success: false, error: 'Invalid action.' });
    }
  } catch (err: any) {
    console.error('[SERVER] Respond mentorship error:', err);
    res.status(500).json({ success: false, error: 'Failed to process mentorship response.' });
  }
});

// Fetch active & completed mentorships for user
app.get('/api/mentorships', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.query.userId as string || '').trim();
    if (!userId) {
      res.status(400).json({ success: false, error: 'User ID is required.' });
      return;
    }

    let mentorships = await fetchSupabaseActiveMentorships(userId);
    if (mentorships.length === 0) {
      mentorships = Array.from(serverMentorshipsStore.values()).filter(
        m => m.mentorId === userId || m.menteeId === userId
      );
    } else {
      for (const m of mentorships) serverMentorshipsStore.set(m.id, m);
    }

    mentorships.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ success: true, mentorships });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch mentorships.' });
  }
});

// Complete or end mentorship
app.post('/api/mentorships/:mentorshipId/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { mentorshipId } = req.params;
    const { userId, status, notes } = req.body;

    if (!mentorshipId || !userId || !status) {
      res.status(400).json({ success: false, error: 'Mentorship ID, user ID, and status are required.' });
      return;
    }

    const mentorship = serverMentorshipsStore.get(mentorshipId);
    if (!mentorship) {
      res.status(404).json({ success: false, error: 'Mentorship not found.' });
      return;
    }

    if (mentorship.mentorId !== userId && mentorship.menteeId !== userId) {
      res.status(403).json({ success: false, error: 'You are not a participant in this mentorship.' });
      return;
    }

    const now = new Date().toISOString();
    mentorship.status = status;
    mentorship.completedAt = (status === 'COMPLETED' || status === 'ENDED') ? now : undefined;
    if (notes) mentorship.notes = notes;

    serverMentorshipsStore.set(mentorshipId, mentorship);
    persistMentorshipStores();
    saveSupabaseActiveMentorship(mentorship).catch(() => {});

    // If completed, notify both participants that they can rate/review each other
    if (status === 'COMPLETED' || status === 'ENDED') {
      const otherId = mentorship.mentorId === userId ? mentorship.menteeId : mentorship.mentorId;
      const myName = mentorship.mentorId === userId ? mentorship.mentorName : mentorship.menteeName;
      createServerNotification({
        recipientId: otherId,
        senderId: userId,
        senderName: myName,
        type: 'REVIEW_RECEIVED',
        title: 'Mentorship Completed',
        message: `Your mentorship interaction with ${myName} is completed. You can now leave a peer review and rating!`,
        relatedId: mentorship.id,
      });
    }

    res.json({ success: true, mentorship });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to update mentorship status.' });
  }
});

// -------------------------------------------------------------
// 10.1 API: Mentorship Sessions (Schedule, Manage, Complete)
// -------------------------------------------------------------
app.get('/api/mentorship/sessions', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.query.userId as string || '').trim();
    if (!userId) {
      res.status(400).json({ success: false, error: 'User ID is required.' });
      return;
    }

    let sessions = await fetchSupabaseMentorshipSessions(userId);
    if (sessions.length === 0) {
      sessions = Array.from(serverMentorshipSessionsStore.values()).filter(
        s => s.mentorId === userId || s.menteeId === userId
      );
    } else {
      for (const s of sessions) serverMentorshipSessionsStore.set(s.id, s);
    }

    sessions.sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime());

    const upcoming = sessions.filter(s => s.status === 'UPCOMING');
    const completed = sessions.filter(s => s.status === 'COMPLETED');
    const cancelled = sessions.filter(s => s.status === 'CANCELLED');

    res.json({
      success: true,
      sessions,
      upcoming,
      completed,
      cancelled,
      count: sessions.length
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch mentorship sessions.' });
  }
});

// Create/Schedule a new mentorship session
app.post('/api/mentorship/sessions', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      mentorshipRequestId,
      mentorId,
      mentorName,
      mentorAvatar,
      mentorTitle,
      menteeId,
      menteeName,
      menteeAvatar,
      menteeTitle,
      topic,
      scheduledStart,
      scheduledEnd,
      durationMinutes,
      timezone,
      notes,
      connectionId
    } = req.body;

    if (!mentorId || !menteeId || !topic || !scheduledStart) {
      res.status(400).json({ success: false, error: 'Mentor, mentee, topic, and scheduled start are required.' });
      return;
    }

    const now = new Date().toISOString();
    const sessionId = `msess_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const dur = durationMinutes || 45;
    const end = scheduledEnd || new Date(new Date(scheduledStart).getTime() + dur * 60 * 1000).toISOString();

    const newSession = {
      id: sessionId,
      mentorshipRequestId: mentorshipRequestId || null,
      mentorId,
      mentorName: mentorName || 'Mentor',
      mentorAvatar: mentorAvatar || null,
      mentorTitle: mentorTitle || 'Mentor',
      menteeId,
      menteeName: menteeName || 'Mentee',
      menteeAvatar: menteeAvatar || null,
      menteeTitle: menteeTitle || 'Member',
      topic,
      scheduledStart,
      scheduledEnd: end,
      durationMinutes: dur,
      timezone: timezone || 'UTC',
      status: 'UPCOMING',
      notes: notes || null,
      connectionId: connectionId || null,
      createdAt: now,
      updatedAt: now
    };

    serverMentorshipSessionsStore.set(sessionId, newSession);
    persistMentorshipStores();
    saveSupabaseMentorshipSession(newSession).catch(() => {});

    // Notify both mentor and mentee
    createServerNotification({
      recipientId: menteeId,
      senderId: mentorId,
      senderName: mentorName || 'Mentor',
      type: 'SESSION_SCHEDULED',
      title: 'New Session Scheduled',
      message: `A mentorship session on "${topic}" has been scheduled for ${new Date(scheduledStart).toLocaleDateString()}.`,
      relatedId: sessionId
    });

    createServerNotification({
      recipientId: mentorId,
      senderId: menteeId,
      senderName: menteeName,
      type: 'SESSION_SCHEDULED',
      title: 'Mentorship Session Confirmed',
      message: `Your session with ${menteeName} on "${topic}" is scheduled.`,
      relatedId: sessionId
    });

    res.json({ success: true, session: newSession });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to create mentorship session.' });
  }
});

// Update session status (e.g. mark COMPLETED or CANCELLED)
app.post('/api/mentorship/sessions/:sessionId/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { userId, status, notes, cancelledReason } = req.body;

    if (!sessionId || !userId || !status) {
      res.status(400).json({ success: false, error: 'Session ID, user ID, and status are required.' });
      return;
    }

    const session = serverMentorshipSessionsStore.get(sessionId);
    if (!session) {
      res.status(404).json({ success: false, error: 'Session not found.' });
      return;
    }

    if (session.mentorId !== userId && session.menteeId !== userId) {
      res.status(403).json({ success: false, error: 'You are not a participant in this session.' });
      return;
    }

    const now = new Date().toISOString();
    session.status = status;
    session.updatedAt = now;
    if (notes) session.notes = notes;

    if (status === 'COMPLETED') {
      session.completedAt = now;
      session.completedBy = userId;

      // Notify the other participant that session is complete and reviews are unlocked
      const otherId = session.mentorId === userId ? session.menteeId : session.mentorId;
      const myName = session.mentorId === userId ? session.mentorName : session.menteeName;

      createServerNotification({
        recipientId: otherId,
        senderId: userId,
        senderName: myName,
        type: 'REVIEW_RECEIVED',
        title: 'Session Completed — Leave a Review',
        message: `${myName} marked your mentorship session on "${session.topic}" as completed. Please leave a rating and review!`,
        relatedId: session.id
      });
    } else if (status === 'CANCELLED') {
      session.cancelledReason = cancelledReason || 'Cancelled by participant';
      const otherId = session.mentorId === userId ? session.menteeId : session.mentorId;
      const myName = session.mentorId === userId ? session.mentorName : session.menteeName;

      createServerNotification({
        recipientId: otherId,
        senderId: userId,
        senderName: myName,
        type: 'SESSION_REMINDER',
        title: 'Session Cancelled',
        message: `${myName} cancelled the session scheduled for "${session.topic}".`,
        relatedId: session.id
      });
    }

    serverMentorshipSessionsStore.set(sessionId, session);
    persistMentorshipStores();
    saveSupabaseMentorshipSession(session).catch(() => {});

    res.json({ success: true, session });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to update session status.' });
  }
});

// -------------------------------------------------------------
// 10.2 API: Persistent Notifications Center
// -------------------------------------------------------------
app.get('/api/notifications', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.query.userId as string || '').trim();
    if (!userId) {
      res.status(400).json({ success: false, error: 'User ID is required.' });
      return;
    }

    let notifs = await fetchSupabaseNotifications(userId);
    if (notifs.length === 0) {
      notifs = Array.from(serverNotificationsStore.values()).filter(n => n.recipientId === userId);
    } else {
      for (const n of notifs) serverNotificationsStore.set(n.id, n);
    }

    notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const unreadCount = notifs.filter(n => !n.isRead).length;

    res.json({
      success: true,
      notifications: notifs,
      unreadCount,
      count: notifs.length
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch notifications.' });
  }
});

app.post('/api/notifications', async (req: Request, res: Response): Promise<void> => {
  try {
    const notif = await createServerNotification(req.body);
    if (!notif) {
      res.status(400).json({ success: false, error: 'Recipient ID is required.' });
      return;
    }
    res.json({ success: true, notification: notif });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to create notification.' });
  }
});

app.post('/api/notifications/:id/read', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const notif = serverNotificationsStore.get(id);
    if (notif) {
      notif.isRead = true;
      notif.readAt = new Date().toISOString();
      serverNotificationsStore.set(id, notif);
      persistMentorshipStores();
    }
    markSupabaseNotificationAsRead(id).catch(() => {});
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to mark notification as read.' });
  }
});

app.post('/api/notifications/read-all', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ success: false, error: 'User ID is required.' });
      return;
    }

    const now = new Date().toISOString();
    for (const [id, notif] of serverNotificationsStore.entries()) {
      if (notif.recipientId === userId && !notif.isRead) {
        notif.isRead = true;
        notif.readAt = now;
        serverNotificationsStore.set(id, notif);
      }
    }
    persistMentorshipStores();
    markAllSupabaseNotificationsAsRead(userId).catch(() => {});

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to mark all notifications as read.' });
  }
});

// -------------------------------------------------------------
// 10.3 API: Chat Read Tracking & Unread Counts
// -------------------------------------------------------------
app.post('/api/messages/mark-read', (req: Request, res: Response): void => {
  try {
    const { connectionId, userId } = req.body;
    if (!connectionId || !userId) {
      res.status(400).json({ success: false, error: 'Connection ID and User ID are required.' });
      return;
    }

    let updatedCount = 0;
    const now = new Date().toISOString();
    for (const msg of serverMessagesStore) {
      if (msg.connectionId === connectionId && msg.receiverId === userId && !msg.isRead) {
        msg.isRead = true;
        msg.readAt = now;
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      persistMessages();
    }

    res.json({ success: true, updatedCount });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to mark messages as read.' });
  }
});

app.get('/api/messages/unread-counts', (req: Request, res: Response): void => {
  try {
    const userId = (req.query.userId as string || '').trim();
    if (!userId) {
      res.status(400).json({ success: false, error: 'User ID is required.' });
      return;
    }

    const unreadByConnection: Record<string, number> = {};
    let totalUnread = 0;

    for (const msg of serverMessagesStore) {
      if (msg.receiverId === userId && !msg.isRead) {
        unreadByConnection[msg.connectionId] = (unreadByConnection[msg.connectionId] || 0) + 1;
        totalUnread++;
      }
    }

    res.json({ success: true, unreadByConnection, totalUnread });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch unread counts.' });
  }
});

// -------------------------------------------------------------
// 10.4 API: Profile Banner & Chat Attachment Uploads
// -------------------------------------------------------------
app.post('/api/profile/banner', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, bannerData, mimeType } = req.body;
    if (!userId || !bannerData) {
      res.status(400).json({ success: false, error: 'User ID and banner image data are required.' });
      return;
    }

    const base64Clean = bannerData.replace(/^data:image\/[a-zA-Z0-9.-]+;base64,/, '');
    const buffer = Buffer.from(base64Clean, 'base64');
    const cleanMime = mimeType || 'image/jpeg';
    const ext = cleanMime.includes('png') ? 'png' : cleanMime.includes('webp') ? 'webp' : 'jpg';
    const fileName = `banner_${userId}_${Date.now()}.${ext}`;

    let publicUrl = await uploadBannerToSupabaseStorage(fileName, buffer, cleanMime);

    // Also store locally for instant local availability
    const localFilePath = path.join(bannersDir, fileName);
    fs.writeFileSync(localFilePath, buffer);

    if (!publicUrl) {
      publicUrl = `/uploads/banners/${fileName}`;
    }

    // Update profile in serverUsersStore
    const user = serverUsersStore.get(userId);
    if (user) {
      user.bannerUrl = publicUrl;
      serverUsersStore.set(userId, user);
      persistUsers();
      saveSupabaseUserOnServer(user).catch(() => {});
    }

    res.json({ success: true, bannerUrl: publicUrl });
  } catch (err: any) {
    console.error('[SERVER] Banner upload error:', err);
    res.status(500).json({ success: false, error: 'Failed to upload banner.' });
  }
});

// Remove Profile Banner API
app.delete('/api/profile/banner/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const user = serverUsersStore.get(userId);
    if (user) {
      delete user.bannerUrl;
      serverUsersStore.set(userId, user);
      persistUsers();
      saveSupabaseUserOnServer(user).catch(() => {});
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to remove banner.' });
  }
});

// User Projects APIs
app.get('/api/users/:userId/projects', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const user = serverUsersStore.get(userId);
    const projects = (user as any)?.projects || [];
    res.json({ success: true, projects });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch projects.' });
  }
});

app.post('/api/users/:userId/projects', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { projects, project } = req.body;
    const user = serverUsersStore.get(userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found.' });
      return;
    }

    let updatedProjects = Array.isArray(projects) ? projects : ((user as any).projects || []);
    if (project) {
      const idx = updatedProjects.findIndex((p: any) => p.id === project.id);
      if (idx >= 0) {
        updatedProjects[idx] = { ...updatedProjects[idx], ...project };
      } else {
        const newProj = {
          id: project.id || `proj_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
          title: project.title || 'Untitled Project',
          description: project.description || '',
          skillsUsed: Array.isArray(project.skillsUsed) ? project.skillsUsed : [],
          githubUrl: project.githubUrl || undefined,
          liveDemoUrl: project.liveDemoUrl || undefined,
          imageUrl: project.imageUrl || undefined,
          createdAt: project.createdAt || new Date().toISOString(),
        };
        updatedProjects.push(newProj);
      }
    }

    (user as any).projects = updatedProjects;
    serverUsersStore.set(userId, user);
    persistUsers();
    saveSupabaseUserOnServer(user).catch(() => {});

    res.json({ success: true, projects: updatedProjects });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to save project.' });
  }
});

app.delete('/api/users/:userId/projects/:projectId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, projectId } = req.params;
    const user = serverUsersStore.get(userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found.' });
      return;
    }

    const currentProjects = (user as any).projects || [];
    const updatedProjects = currentProjects.filter((p: any) => p.id !== projectId);
    (user as any).projects = updatedProjects;
    serverUsersStore.set(userId, user);
    persistUsers();
    saveSupabaseUserOnServer(user).catch(() => {});

    res.json({ success: true, projects: updatedProjects });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to delete project.' });
  }
});

// Profile Avatar Image Upload API
app.post('/api/profile/avatar', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, avatarData, mimeType } = req.body;
    if (!userId || !avatarData) {
      res.status(400).json({ success: false, error: 'User ID and avatar image data are required.' });
      return;
    }

    const base64Clean = avatarData.replace(/^data:image\/[a-zA-Z0-9.-]+;base64,/, '');
    const buffer = Buffer.from(base64Clean, 'base64');
    const cleanMime = mimeType || 'image/jpeg';
    const ext = cleanMime.includes('png') ? 'png' : cleanMime.includes('webp') ? 'webp' : 'jpg';
    const fileName = `avatar_${userId}_${Date.now()}.${ext}`;

    let publicUrl = await uploadBannerToSupabaseStorage(fileName, buffer, cleanMime);

    // Also store locally for fast preview access
    const localFilePath = path.join(bannersDir, fileName);
    fs.writeFileSync(localFilePath, buffer);

    if (!publicUrl) {
      publicUrl = `/uploads/banners/${fileName}`;
    }

    // Update profile in serverUsersStore
    const user = serverUsersStore.get(userId);
    if (user) {
      user.avatarUrl = publicUrl;
      serverUsersStore.set(userId, user);
      persistUsers();
      saveSupabaseUserOnServer(user).catch(() => {});
    }

    res.json({ success: true, avatarUrl: publicUrl });
  } catch (err: any) {
    console.error('[SERVER] Avatar upload error:', err);
    res.status(500).json({ success: false, error: 'Failed to upload avatar image.' });
  }
});

app.post('/api/chat/upload', async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileData, fileName, mimeType, size } = req.body;
    if (!fileData || !fileName) {
      res.status(400).json({ success: false, error: 'File data and file name are required.' });
      return;
    }

    const base64Clean = fileData.replace(/^data:[a-zA-Z0-9.\/-]+;base64,/, '');
    const buffer = Buffer.from(base64Clean, 'base64');
    const cleanMime = mimeType || 'application/octet-stream';
    const safeExt = path.extname(fileName) || '.dat';
    const uniqueFileName = `attach_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${safeExt}`;

    let publicUrl = await uploadChatAttachmentToSupabaseStorage(uniqueFileName, buffer, cleanMime);

    // Also write locally
    const localFilePath = path.join(chatAttachmentsDir, uniqueFileName);
    fs.writeFileSync(localFilePath, buffer);

    if (!publicUrl) {
      publicUrl = `/uploads/chat-attachments/${uniqueFileName}`;
    }

    res.json({
      success: true,
      url: publicUrl,
      fileName,
      mimeType: cleanMime,
      size: size || buffer.length
    });
  } catch (err: any) {
    console.error('[SERVER] Chat attachment upload error:', err);
    res.status(500).json({ success: false, error: 'Failed to upload chat attachment.' });
  }
});

// -------------------------------------------------------------
// 10.5 API: Admin User Verification, Deep Details & Analytics
// -------------------------------------------------------------
app.post('/api/admin/verify-user', async (req: Request, res: Response): Promise<void> => {
  try {
    const auth = checkAdminAuthorization(req);
    if (!auth.authorized) {
      res.status(403).json({ success: false, error: 'Access Denied: Admin privileges required.' });
      return;
    }

    const { userId, isVerified, notes } = req.body;
    if (!userId) {
      res.status(400).json({ success: false, error: 'User ID is required.' });
      return;
    }

    const verified = Boolean(isVerified);
    const status = verified ? 'verified' : 'unverified';
    const now = new Date().toISOString();

    const user = serverUsersStore.get(userId);
    if (user) {
      user.isVerified = verified;
      (user as any).verificationStatus = status;
      (user as any).verifiedAt = verified ? now : null;
      (user as any).verifiedBy = verified ? (auth.name || auth.email || 'SkillMesh Administrator') : null;
      (user as any).verificationNotes = notes || null;
      serverUsersStore.set(userId, user);
      persistUsers();
      saveSupabaseUserOnServer(user).catch(() => {});
    }

    updateSupabaseProfileVerification(userId, verified, status, notes, auth.email).catch(() => {});

    // Save persistent audit log in memory and Supabase audit_logs table
    const auditAction = verified ? 'VERIFIED' : 'REVOKED';
    const auditReason = notes || (verified ? 'Profile verified by administrator after credentials review' : 'Verification badge revoked by administrator');
    const auditEntry = {
      id: `audit_verify_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      adminId: auth.userId,
      adminEmail: auth.email,
      adminName: auth.name,
      targetUserId: userId,
      targetUserName: user?.name || 'SkillMesh Member',
      targetUserEmail: user?.email || '',
      action: auditAction,
      previousStatus: user?.isVerified ? 'VERIFIED' : 'UNVERIFIED',
      newStatus: verified ? 'VERIFIED' : 'UNVERIFIED',
      reason: auditReason,
      timestamp: now,
    };
    serverAuditLogs.unshift(auditEntry as any);
    persistAuditLogs();
    saveSupabaseAuditLogOnServer(auditEntry).catch(() => {});

    // Broadcast SSE update to connected admin consoles
    broadcastToAdmins('USER_STATUS_CHANGE', {
      type: 'VERIFICATION_UPDATE',
      userId,
      isVerified: verified,
      action: auditAction,
      adminEmail: auth.email,
    });

    // Notify user
    createServerNotification({
      recipientId: userId,
      senderName: 'SkillMesh Administration',
      type: verified ? 'VERIFICATION_GRANTED' : 'VERIFICATION_REVOKED',
      title: verified ? 'Profile Verified! ✓' : 'Verification Status Updated',
      message: verified
        ? 'Congratulations! Your SkillMesh profile has been reviewed and awarded a verified badge.'
        : 'Your verified status was updated by an administrator.',
    });

    res.json({
      success: true,
      userId,
      isVerified: verified,
      verificationStatus: status,
      verifiedAt: verified ? now : null,
      verifiedBy: verified ? (auth.name || auth.email) : null,
      notes,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to update user verification.' });
  }
});

app.get('/api/admin/users/:userId/details', async (req: Request, res: Response): Promise<void> => {
  try {
    const auth = checkAdminAuthorization(req);
    if (!auth.authorized) {
      res.status(403).json({ success: false, error: 'Access Denied: Admin privileges required.' });
      return;
    }

    const { userId } = req.params;
    let user = serverUsersStore.get(userId);
    if (!user) {
      user = await fetchSupabaseUserProfileById(userId);
    }
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found.' });
      return;
    }

    // Connections / Exchanges involving this user
    const rawConnections = Array.from(serverConnectionsStore.values()).filter(
      c => c.senderId === userId || c.receiverId === userId
    );
    const enrichedConnections = rawConnections.map(c => {
      const isSender = c.senderId === userId;
      const otherId = isSender ? c.receiverId : c.senderId;
      const otherUser = serverUsersStore.get(otherId);
      return {
        ...c,
        otherUserName: otherUser?.name || (isSender ? c.receiverName : c.senderName) || 'Member',
        otherUserEmail: otherUser?.email || '',
        otherUserAvatar: otherUser?.avatarUrl || '',
        otherUserSkillmeshId: otherUser ? getSkillMeshUserId(otherUser) : 'SM-000000',
        otherUserVerified: Boolean(otherUser?.isVerified),
      };
    });

    // Mentorships
    const mentorshipRequests = Array.from(serverMentorshipRequestsStore.values()).filter(
      r => r.mentorId === userId || r.menteeId === userId
    );
    const activeMentorships = Array.from(serverMentorshipsStore.values()).filter(
      m => m.mentorId === userId || m.menteeId === userId
    );
    const sessions = Array.from(serverMentorshipSessionsStore.values()).filter(
      s => s.mentorId === userId || s.menteeId === userId
    );

    // Ratings & Reviews - ensure remote Supabase ratings are synchronized
    try {
      const remoteRatings = await fetchSupabaseRatingsForUser(userId);
      if (remoteRatings && remoteRatings.length > 0) {
        remoteRatings.forEach(r => serverRatingsStore.set(r.id, r));
      }
    } catch {}

    const receivedRatings = Array.from(serverRatingsStore.values()).filter(r => r.ratedUserId === userId);
    const enrichedRatings = receivedRatings.map(r => {
      const rater = serverUsersStore.get(r.raterId);
      return {
        ...r,
        raterName: rater?.name || r.raterName || 'Anonymous Member',
        raterAvatar: rater?.avatarUrl || r.raterAvatar || '',
        raterSkillmeshId: rater ? getSkillMeshUserId(rater) : 'SM-000000',
        raterVerified: Boolean(rater?.isVerified),
      };
    });
    const givenRatings = Array.from(serverRatingsStore.values()).filter(r => r.raterId === userId);
    const ratingSummary = computeRatingSummary(receivedRatings);

    // Reports against or by this user
    const reportsAgainst = Array.from(serverReportsStore.values()).filter(r => r.reportedUserId === userId);
    const reportsBy = Array.from(serverReportsStore.values()).filter(r => r.reporterId === userId);

    // Blocks against this user
    const blocksAgainst = Array.from(serverBlocksStore.values()).filter(b => b.blockedUserId === userId);

    // Audit logs & Verification history for this user
    const auditHistory = serverAuditLogs.filter(l => l.targetUserId === userId);

    // Calculate detailed stats
    const completedExchanges = rawConnections.filter(c => c.status === 'ENDED' || (c as any).status === 'COMPLETED').length;
    const activeExchanges = rawConnections.filter(c => c.status === 'ACCEPTED').length;
    const cancelledExchanges = rawConnections.filter(c => (c as any).status === 'DECLINED' || (c as any).status === 'CANCELLED').length;
    const completedSessions = sessions.filter(s => s.status === 'COMPLETED').length;

    const enrichedUser = {
      ...user,
      skillmeshId: getSkillMeshUserId(user),
      isVerified: Boolean(user.isVerified),
      verificationStatus: user.verificationStatus || (user.isVerified ? 'verified' : 'unverified'),
      verifiedAt: (user as any).verifiedAt || null,
      verifiedBy: (user as any).verifiedBy || null,
      verificationNotes: (user as any).verificationNotes || null,
    };

    res.json({
      success: true,
      user: enrichedUser,
      stats: {
        totalExchanges: rawConnections.length,
        activeExchanges,
        completedExchanges,
        successfulExchanges: activeExchanges + completedExchanges,
        cancelledExchanges,
        mentorshipRequestsCount: mentorshipRequests.length,
        activeMentorshipsCount: activeMentorships.length,
        completedSessionsCount: completedSessions,
        averageRating: ratingSummary.averageRating,
        totalReviews: ratingSummary.totalRatings,
        reportsAgainstCount: reportsAgainst.length,
        blocksAgainstCount: blocksAgainst.length,
      },
      connections: enrichedConnections,
      mentorshipRequests,
      activeMentorships,
      sessions,
      ratings: enrichedRatings,
      givenRatings,
      ratingSummary,
      reportsAgainst,
      reportsBy,
      blocksAgainst,
      auditHistory,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch user admin details.' });
  }
});

app.get('/api/admin/analytics', async (_req: Request, res: Response): Promise<void> => {
  try {
    const allUsers = Array.from(serverUsersStore.values());
    const totalUsers = allUsers.length;
    const activeUsers = allUsers.filter(u => u.accountStatus !== 'BANNED' && u.accountStatus !== 'SUSPENDED').length;
    const bannedUsers = allUsers.filter(u => u.accountStatus === 'BANNED').length;
    const suspendedUsers = allUsers.filter(u => u.accountStatus === 'SUSPENDED').length;
    const verifiedUsers = allUsers.filter(u => u.isVerified).length;

    const allConnections = Array.from(serverConnectionsStore.values());
    const totalExchanges = allConnections.length;
    const activeExchanges = allConnections.filter(c => c.status === 'ACCEPTED').length;
    const completedExchanges = allConnections.filter(c => c.status === 'ENDED').length;

    const allRequests = Array.from(serverMentorshipRequestsStore.values());
    const totalMentorshipRequests = allRequests.length;
    const acceptedRequests = allRequests.filter(r => r.status === 'ACCEPTED').length;

    const allSessions = Array.from(serverMentorshipSessionsStore.values());
    const totalSessions = allSessions.length;
    const upcomingSessions = allSessions.filter(s => s.status === 'UPCOMING').length;
    const completedSessions = allSessions.filter(s => s.status === 'COMPLETED').length;

    const allRatings = Array.from(serverRatingsStore.values());
    const totalReviews = allRatings.length;
    let sumRating = 0;
    for (const r of allRatings) sumRating += r.rating;
    const platformAvgRating = totalReviews > 0 ? Number((sumRating / totalReviews).toFixed(2)) : 5.0;

    const allReports = Array.from(serverReportsStore.values());
    const pendingReports = allReports.filter(r => r.status === 'PENDING_REVIEW').length;

    res.json({
      success: true,
      analytics: {
        users: {
          total: totalUsers,
          active: activeUsers,
          banned: bannedUsers,
          suspended: suspendedUsers,
          verified: verifiedUsers,
        },
        exchanges: {
          total: totalExchanges,
          active: activeExchanges,
          completed: completedExchanges,
        },
        mentorship: {
          totalRequests: totalMentorshipRequests,
          acceptedRequests,
          totalSessions,
          upcomingSessions,
          completedSessions,
        },
        reviews: {
          total: totalReviews,
          average: platformAvgRating,
        },
        safety: {
          totalReports: allReports.length,
          pendingReports,
        }
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch analytics.' });
  }
});


// -------------------------------------------------------------
// 11. API: Voice Notes Upload & Storage
// -------------------------------------------------------------
app.post('/api/voice-notes/upload', async (req: Request, res: Response): Promise<void> => {
  try {
    const { audioData, fileName, mimeType, duration } = req.body;
    if (!audioData) {
      res.status(400).json({ success: false, error: 'Audio data is required.' });
      return;
    }

    // Clean up base64
    const base64Clean = audioData.replace(/^data:audio\/[a-zA-Z0-9.-]+;base64,/, '');
    const buffer = Buffer.from(base64Clean, 'base64');

    const cleanMime = mimeType || 'audio/webm';
    const extension = cleanMime.includes('mp4') ? 'mp4' : cleanMime.includes('ogg') ? 'ogg' : 'webm';
    const uniqueFileName = `${Date.now()}_${crypto.randomBytes(6).toString('hex')}.${extension}`;

    // 1. Try Supabase Storage upload
    let publicUrl: string | null = null;
    try {
      publicUrl = await uploadVoiceNoteToSupabaseStorage(uniqueFileName, buffer, cleanMime);
    } catch {
      // fallback to local
    }

    // 2. Also save to local uploads directory as robust fallback
    const localFilePath = path.join(voiceNotesDir, uniqueFileName);
    fs.writeFileSync(localFilePath, buffer);

    if (!publicUrl) {
      publicUrl = `/uploads/voice-notes/${uniqueFileName}`;
    }

    res.json({
      success: true,
      url: publicUrl,
      duration: duration || 0,
      fileName: uniqueFileName,
    });
  } catch (err: any) {
    console.error('[SERVER] Voice note upload error:', err);
    res.status(500).json({ success: false, error: 'Failed to upload voice note.' });
  }
});

// -------------------------------------------------------------
// 12. API: Real-Time WebRTC Calling Signaling & Call History
// -------------------------------------------------------------
interface StoredCallSession {
  id: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  receiverId: string;
  receiverName: string;
  receiverAvatar?: string;
  callType: 'VOICE' | 'VIDEO';
  status: 'RINGING' | 'ACCEPTED' | 'REJECTED' | 'BUSY' | 'ENDED' | 'MISSED';
  connectionId?: string;
  startedAt?: string;
  endedAt?: string;
  durationSeconds: number;
  createdAt: string;
}

const CALLS_FILE = path.join(DATA_DIR, 'call_sessions.json');
const CALL_HISTORY_FILE = path.join(DATA_DIR, 'call_history.json');

const serverCallSessionsStore: Map<string, StoredCallSession> = new Map();
const serverCallHistoryStore: Map<string, any> = new Map();

// Signal message store for WebRTC signaling exchange: callId -> list of signals
interface CallSignalMessage {
  fromUserId: string;
  type: 'offer' | 'answer' | 'ice-candidate';
  data: any;
  timestamp: number;
}
const serverCallSignalsStore: Map<string, CallSignalMessage[]> = new Map();

function loadCallStores() {
  try {
    const sessions = safeLoadJson<StoredCallSession[]>(CALLS_FILE, []);
    for (const s of sessions) serverCallSessionsStore.set(s.id, s);

    const history = safeLoadJson<any[]>(CALL_HISTORY_FILE, []);
    for (const h of history) serverCallHistoryStore.set(h.id, h);
  } catch (err) {
    console.warn('[SERVER] Load call stores notice:', err);
  }
}
loadCallStores();

function persistCallStores() {
  safeSaveJson(CALLS_FILE, Array.from(serverCallSessionsStore.values()));
  safeSaveJson(CALL_HISTORY_FILE, Array.from(serverCallHistoryStore.values()));
}

// Initiate Call
app.post('/api/calls/initiate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { callerId, receiverId, callType, connectionId } = req.body;
    if (!callerId || !receiverId) {
      res.status(400).json({ success: false, error: 'Caller ID and Receiver ID are required.' });
      return;
    }

    if (callerId === receiverId) {
      res.status(400).json({ success: false, error: 'You cannot call yourself.' });
      return;
    }

    // Check if blocked
    const caller = serverUsersStore.get(callerId) || (await fetchSupabaseUserProfileById(callerId));
    const receiver = serverUsersStore.get(receiverId) || (await fetchSupabaseUserProfileById(receiverId));

    if (!caller || !receiver) {
      res.status(404).json({ success: false, error: 'User profile not found.' });
      return;
    }

    // Check receiver availability
    const receiverAvail = serverAvailabilityStore.get(receiverId);
    if (receiverAvail && receiverAvail.status === 'UNAVAILABLE') {
      res.status(400).json({
        success: false,
        error: `${receiver.name} is currently marked as unavailable. You can leave a voice note or message in chat.`,
      });
      return;
    }

    const callId = `call_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const newSession: StoredCallSession = {
      id: callId,
      callerId,
      callerName: caller.name,
      callerAvatar: caller.avatarUrl,
      receiverId,
      receiverName: receiver.name,
      receiverAvatar: receiver.avatarUrl,
      callType: callType === 'VIDEO' ? 'VIDEO' : 'VOICE',
      status: 'RINGING',
      connectionId: connectionId || undefined,
      durationSeconds: 0,
      createdAt: new Date().toISOString(),
    };

    serverCallSessionsStore.set(callId, newSession);
    serverCallSignalsStore.set(callId, []);
    persistCallStores();

    saveSupabaseCallSession(newSession).catch(() => {});

    res.json({ success: true, session: newSession });
  } catch (err: any) {
    console.error('[SERVER] Initiate call error:', err);
    res.status(500).json({ success: false, error: 'Failed to initiate call.' });
  }
});

// Check for incoming ringing call for a user
app.get('/api/calls/incoming', (req: Request, res: Response): void => {
  try {
    const userId = (req.query.userId as string || '').trim();
    if (!userId) {
      res.status(400).json({ success: false, error: 'User ID is required.' });
      return;
    }

    const now = Date.now();
    // Find active ringing session created in last 45 seconds
    const active = Array.from(serverCallSessionsStore.values()).find(
      s => s.receiverId === userId &&
           s.status === 'RINGING' &&
           now - new Date(s.createdAt).getTime() < 45000
    );

    res.json({ success: true, incomingCall: active || null });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to check incoming calls.' });
  }
});

// Send WebRTC signal (offer, answer, ICE candidate)
app.post('/api/calls/:callId/signal', (req: Request, res: Response): void => {
  try {
    const { callId } = req.params;
    const { fromUserId, type, data } = req.body;

    if (!callId || !fromUserId || !type || !data) {
      res.status(400).json({ success: false, error: 'Missing signal parameters.' });
      return;
    }

    const session = serverCallSessionsStore.get(callId);
    if (!session) {
      res.status(404).json({ success: false, error: 'Call session not found.' });
      return;
    }

    let signals = serverCallSignalsStore.get(callId);
    if (!signals) {
      signals = [];
      serverCallSignalsStore.set(callId, signals);
    }

    signals.push({
      fromUserId,
      type,
      data,
      timestamp: Date.now(),
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to store call signal.' });
  }
});

// Poll WebRTC signals
app.get('/api/calls/:callId/signals', (req: Request, res: Response): void => {
  try {
    const { callId } = req.params;
    const forUserId = (req.query.forUserId as string || '').trim();
    const afterIndex = parseInt((req.query.afterIndex as string) || '-1', 10);

    const session = serverCallSessionsStore.get(callId);
    if (!session) {
      res.status(404).json({ success: false, error: 'Call session not found.' });
      return;
    }

    const signals = serverCallSignalsStore.get(callId) || [];
    // Only return signals sent from the OTHER party
    const relevant = signals
      .map((s, idx) => ({ ...s, index: idx }))
      .filter(s => s.fromUserId !== forUserId && s.index > afterIndex);

    res.json({
      success: true,
      sessionStatus: session.status,
      signals: relevant,
      lastIndex: signals.length - 1,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to poll signals.' });
  }
});

// Respond to call (ACCEPT, DECLINE, BUSY)
app.post('/api/calls/:callId/respond', async (req: Request, res: Response): Promise<void> => {
  try {
    const { callId } = req.params;
    const { receiverId, action } = req.body;

    const session = serverCallSessionsStore.get(callId);
    if (!session) {
      res.status(404).json({ success: false, error: 'Call session not found.' });
      return;
    }

    if (session.receiverId !== receiverId) {
      res.status(403).json({ success: false, error: 'Unauthorized response.' });
      return;
    }

    const now = new Date().toISOString();

    if (action === 'ACCEPT') {
      session.status = 'ACCEPTED';
      session.startedAt = now;
      serverCallSessionsStore.set(callId, session);
      persistCallStores();
      saveSupabaseCallSession(session).catch(() => {});
      res.json({ success: true, session });
      return;
    } else {
      session.status = action === 'BUSY' ? 'BUSY' : 'REJECTED';
      session.endedAt = now;
      serverCallSessionsStore.set(callId, session);

      // Record in call history
      const histId = `chist_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const historyRecord = {
        id: histId,
        callSessionId: session.id,
        callerId: session.callerId,
        callerName: session.callerName,
        callerAvatar: session.callerAvatar,
        receiverId: session.receiverId,
        receiverName: session.receiverName,
        receiverAvatar: session.receiverAvatar,
        callType: session.callType,
        status: 'DECLINED',
        durationSeconds: 0,
        createdAt: now,
      };
      serverCallHistoryStore.set(histId, historyRecord);
      persistCallStores();
      saveSupabaseCallHistoryRecord(historyRecord).catch(() => {});

      res.json({ success: true, session });
      return;
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to respond to call.' });
  }
});

// End Call
app.post('/api/calls/:callId/end', async (req: Request, res: Response): Promise<void> => {
  try {
    const { callId } = req.params;
    const { userId, durationSeconds } = req.body;

    const session = serverCallSessionsStore.get(callId);
    if (!session) {
      res.status(404).json({ success: false, error: 'Call session not found.' });
      return;
    }

    const now = new Date().toISOString();
    const dur = Math.max(0, parseInt(durationSeconds, 10) || 0);

    session.status = 'ENDED';
    session.endedAt = now;
    session.durationSeconds = dur;
    serverCallSessionsStore.set(callId, session);

    // Record in history
    const histId = `chist_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const historyRecord = {
      id: histId,
      callSessionId: session.id,
      callerId: session.callerId,
      callerName: session.callerName,
      callerAvatar: session.callerAvatar,
      receiverId: session.receiverId,
      receiverName: session.receiverName,
      receiverAvatar: session.receiverAvatar,
      callType: session.callType,
      status: dur > 0 ? 'COMPLETED' : 'MISSED',
      durationSeconds: dur,
      createdAt: now,
    };

    serverCallHistoryStore.set(histId, historyRecord);
    persistCallStores();

    saveSupabaseCallSession(session).catch(() => {});
    saveSupabaseCallHistoryRecord(historyRecord).catch(() => {});

    // Clean up signals
    serverCallSignalsStore.delete(callId);

    res.json({ success: true, session, historyRecord });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to end call.' });
  }
});

// Get call history for a user
app.get('/api/calls/history', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.query.userId as string || '').trim();
    if (!userId) {
      res.status(400).json({ success: false, error: 'User ID is required.' });
      return;
    }

    let history = await fetchSupabaseCallHistory(userId);
    if (history.length === 0) {
      history = Array.from(serverCallHistoryStore.values()).filter(
        c => c.callerId === userId || c.receiverId === userId
      );
    } else {
      for (const h of history) serverCallHistoryStore.set(h.id, h);
    }

    history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ success: true, history });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch call history.' });
  }
});

// -------------------------------------------------------------
// 8. API: Health Check
// -------------------------------------------------------------
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// -------------------------------------------------------------
// Vite Middleware / Static Serving
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Skill Mesh Server] running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
