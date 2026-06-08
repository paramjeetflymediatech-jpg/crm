const { NextResponse } = require('next/server');
const bcrypt = require('bcryptjs');
const { User, AuditLog } = require('@/models');
const { withApiAuth } = require('@/lib/apiGuard');
const { userProfileSchema } = require('@/validations/schemas');

async function putHandler(request) {
  try {
    const user = request.user;
    const body = await request.json();

    // Validate request schema
    const validation = userProfileSchema.safeParse(body);
    if (!validation.success) {
      const errorMsg = validation.error.errors.map(e => e.message).join(', ');
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const { name, email, phone, password, avatar } = validation.data;

    // Check email uniqueness if email is changed
    if (email !== user.email) {
      const dupeUser = await User.findOne({ where: { email } });
      if (dupeUser) {
        return NextResponse.json({ error: 'Email is already in use.' }, { status: 400 });
      }
    }

    // Prepare updates
    const updates = { name, email, phone, avatar: avatar || user.avatar };
    if (password && password.trim() !== '') {
      updates.password = await bcrypt.hash(password, 10);
    }

    await user.update(updates);

    // Write audit log
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    await AuditLog.create({
      company_id: user.company_id,
      user_id: user.id,
      action: 'Profile Updated',
      module: 'Settings',
      description: `User "${user.name}" updated their profile info.`,
      ip_address: ip
    });

    const responseUser = user.toJSON();
    delete responseUser.password;

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully.',
      user: responseUser
    });

  } catch (error) {
    console.error('PUT Profile Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const PUT = withApiAuth(putHandler);
