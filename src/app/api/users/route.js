const { NextResponse } = require('next/server');
const bcrypt = require('bcryptjs');
const { User, Company, AuditLog } = require('@/models');
const { withApiAuth } = require('@/lib/apiGuard');
const { createUserSchema } = require('@/validations/schemas');

async function getHandler(request) {
  try {
    const user = request.user;
    const companyId = request.companyId;

    // Direct access to only Admin roles
    if (user.role === 'staff') {
      return NextResponse.json({ error: 'Forbidden: Staff users cannot view user lists.' }, { status: 403 });
    }

    const where = {};
    if (user.role !== 'super_admin') {
      where.company_id = companyId;
    }

    const users = await User.findAll({
      where,
      include: [{ model: Company, attributes: ['id', 'company_name'] }],
      attributes: { exclude: ['password'] },
      order: [['created_at', 'DESC']]
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('GET Users Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

async function postHandler(request) {
  try {
    const user = request.user;
    const companyId = request.companyId;

    if (user.role === 'staff') {
      return NextResponse.json({ error: 'Forbidden: Staff users cannot create users.' }, { status: 403 });
    }

    const body = await request.json();

    // Validate request schema
    const validation = createUserSchema.safeParse(body);
    if (!validation.success) {
      const errorMsg = validation.error.errors.map(e => e.message).join(', ');
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const userData = validation.data;

    // Check if email already exists
    const existingUser = await User.findOne({ where: { email: userData.email } });
    if (existingUser) {
      return NextResponse.json({ error: 'Email is already in use.' }, { status: 400 });
    }

    // Encrypt password
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    const targetCompanyId = user.role === 'super_admin' ? body.company_id : companyId;

    if (!targetCompanyId && user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Target company_id is required.' }, { status: 400 });
    }

    // Create user record
    const newUser = await User.create({
      ...userData,
      password: hashedPassword,
      company_id: targetCompanyId
    });

    // Write audit log
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    await AuditLog.create({
      company_id: targetCompanyId,
      user_id: user.id,
      action: 'User Created',
      module: 'Users',
      description: `User "${newUser.name}" (${newUser.role}) created by ${user.name}.`,
      ip_address: ip
    });

    const responseUser = newUser.toJSON();
    delete responseUser.password;

    return NextResponse.json({
      success: true,
      message: 'User created successfully.',
      user: responseUser
    }, { status: 201 });

  } catch (error) {
    console.error('POST Users Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const GET = withApiAuth(getHandler);
export const POST = withApiAuth(postHandler);
