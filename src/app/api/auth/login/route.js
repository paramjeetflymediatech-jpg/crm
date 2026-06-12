const { NextResponse } = require('next/server');
const bcrypt = require('bcryptjs');
const { User, Company, AuditLog } = require('@/models');
const { signAccessToken, signRefreshToken } = require('@/lib/jwt');
const { loginSchema } = require('@/validations/schemas');
const { serialize } = require('cookie');

export async function POST(request) {
  try {
    const body = await request.json();

    // 1. Zod Validation
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      const errorMsg = validation.error.issues.map(e => e.message).join(', ');
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const { email, password } = validation.data;

    // 2. Fetch User and check status
    const user = await User.findOne({
      where: { email },
      include: [{ model: Company }]
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    if (user.status !== 'active') {
      return NextResponse.json({ error: 'Your account has been deactivated.' }, { status: 401 });
    }

    // 3. Enforce Tenant suspended check if not Super Admin
    if (user.role !== 'super_admin' && user.Company && user.Company.status !== 'active') {
      return NextResponse.json({ error: 'Your company tenant has been suspended.' }, { status: 403 });
    }

    // 4. Verify password
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    // 5. Generate JWT tokens
    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.company_id
    };

    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    // 6. Update user's last login
    user.last_login = new Date();
    await user.save();

    // 7. Write Audit Log
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    await AuditLog.create({
      company_id: user.company_id,
      user_id: user.id,
      action: 'Login Successful',
      module: 'Auth',
      ip_address: ip
    });

    // 8. Serialize HttpOnly cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    };

    // Access token cookie (expires in 1h)
    const accessCookie = serialize('accessToken', accessToken, {
      ...cookieOptions,
      maxAge: 60 * 60 // 1 hour
    });

    // Refresh token cookie (expires in 7d)
    const refreshCookie = serialize('refreshToken', refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 // 7 days
    });

    const response = NextResponse.json({
      message: 'Login successful.',
      token: accessToken,
      refreshToken: refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.company_id,
        companyName: user.Company ? user.Company.company_name : 'System Platform'
      }
    });

    response.headers.append('Set-Cookie', accessCookie);
    response.headers.append('Set-Cookie', refreshCookie);

    return response;
  } catch (error) {
    console.error('Login Route Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
