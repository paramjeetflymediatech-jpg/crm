const { NextResponse } = require('next/server');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User } = require('@/models');

require('dotenv').config();

const RESET_SECRET = process.env.JWT_SECRET + '_password_reset';

export async function POST(request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and new password are required.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    // Verify the reset token
    let decoded;
    try {
      decoded = jwt.verify(token, RESET_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return NextResponse.json({ error: 'This reset link has expired. Please request a new one.' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Invalid or tampered reset link.' }, { status: 400 });
    }

    if (decoded.purpose !== 'password_reset') {
      return NextResponse.json({ error: 'Invalid reset token.' }, { status: 400 });
    }

    // Find user
    const user = await User.findByPk(decoded.userId);
    if (!user || user.email !== decoded.email) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    if (user.status !== 'active') {
      return NextResponse.json({ error: 'This account has been deactivated.' }, { status: 403 });
    }

    // Hash and update password
    const hashedPassword = await bcrypt.hash(password, 12);
    await user.update({ password: hashedPassword });

    return NextResponse.json({
      success: true,
      message: 'Your password has been reset successfully. You can now log in.'
    });
  } catch (error) {
    console.error('[Reset Password] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
