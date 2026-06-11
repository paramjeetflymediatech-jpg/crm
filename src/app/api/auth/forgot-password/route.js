const { NextResponse } = require('next/server');
const jwt = require('jsonwebtoken');
const { User } = require('@/models');
const { sendEmail } = require('@/emails/mailer');

require('dotenv').config();

const RESET_SECRET = process.env.JWT_SECRET + '_password_reset';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email address is required.' }, { status: 400 });
    }

    // Find user — silently succeed even if not found (prevents email enumeration)
    const user = await User.findOne({ where: { email } });

    if (user) {
      // Generate a time-limited password reset JWT (valid 1 hour)
      const resetToken = jwt.sign(
        { userId: user.id, email: user.email, purpose: 'password_reset' },
        RESET_SECRET,
        { expiresIn: '1h' }
      );

      const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`;

      await sendEmail({
        to: user.email,
        subject: '[CRM] Password Reset Request',
        text: `Hello ${user.name},\n\nYou requested a password reset. Click the link below to set a new password (expires in 1 hour):\n\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email.\n\nThe CRM Team`,
        html: `
          <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1e293b;">
            <h2 style="color: #4f46e5; margin-bottom: 8px;">Password Reset</h2>
            <p>Hello <strong>${user.name}</strong>,</p>
            <p>You requested a password reset for your CRM account. Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${resetUrl}" 
                 style="background: #4f46e5; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p style="font-size: 13px; color: #64748b;">If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="font-size: 12px; color: #94a3b8; word-break: break-all;">${resetUrl}</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="font-size: 12px; color: #94a3b8;">If you did not request a password reset, you can safely ignore this email. Your password will not change.</p>
          </div>
        `
      });
    }

    // Always return success to prevent email enumeration attacks
    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    });
  } catch (error) {
    console.error('[Forgot Password] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
