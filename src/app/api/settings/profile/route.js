const { NextResponse } = require('next/server');
const bcrypt = require('bcryptjs');
const { User, Company, AuditLog } = require('@/models');
const { withApiAuth } = require('@/lib/apiGuard');
const { userProfileSchema } = require('@/validations/schemas');

async function getHandler(request) {
  try {
    const user = await User.findByPk(request.user.id, {
      include: [{ model: Company }]
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let company = user.Company;
    if (!company && user.role === 'super_admin') {
      company = await Company.findOne({ order: [['id', 'ASC']] });
    }

    const userData = user.toJSON();
    delete userData.password;
    userData.companyId = user.company_id || (company ? company.id : null);
    userData.companyName = company ? company.company_name : 'System Platform';
    userData.companyLogo = company ? company.logo : null;
    userData.avatar = user.avatar;
    userData.phone = user.phone;

    return NextResponse.json({
      success: true,
      user: userData
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
      }
    });
  } catch (error) {
    console.error('GET Profile Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

async function putHandler(request) {
  try {
    const user = request.user;
    const body = await request.json();

    // Validate request schema
    const validation = userProfileSchema.safeParse(body);
    if (!validation.success) {
      const errorMsg = validation.error.issues.map(e => e.message).join(', ');
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const { name, email, phone, password, avatar } = validation.data;

    // Check email uniqueness if email is changed
    if (email !== user.email) {
      const dupeUser = await User.findOne({ where: { email } });
      if (dupeUser && dupeUser.id !== user.id) {
        return NextResponse.json({ error: 'Email is already in use.' }, { status: 400 });
      }
    }

    // Prepare updates
    const updates = { name, email };
    if (phone !== undefined) {
      updates.phone = phone || null;
    }
    if (avatar !== undefined) {
      updates.avatar = avatar || null;
    }
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
      ip_address: ip
    });

    let company = user.Company;
    if (!company && user.role === 'super_admin') {
      company = await Company.findOne({ order: [['id', 'ASC']] });
    }

    const responseUser = user.toJSON();
    delete responseUser.password;
    responseUser.companyId = user.company_id || (company ? company.id : null);
    responseUser.companyName = company ? company.company_name : 'System Platform';
    responseUser.companyLogo = company ? company.logo : null;
    responseUser.avatar = user.avatar;
    responseUser.phone = user.phone;

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully.',
      user: responseUser
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
      }
    });

  } catch (error) {
    console.error('PUT Profile Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const GET = withApiAuth(getHandler);
export const PUT = withApiAuth(putHandler);
