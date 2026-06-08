const { NextResponse } = require('next/server');
const { serialize } = require('cookie');
const { AuditLog } = require('@/models');
const { verifyAccessToken } = require('@/lib/jwt');
const { parse } = require('cookie');

export async function POST(request) {
  try {
    // Audit Log logging
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = parse(cookieHeader);
    const token = cookies.accessToken;
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';

    if (token) {
      const decoded = verifyAccessToken(token);
      if (decoded) {
        await AuditLog.create({
          company_id: decoded.companyId,
          user_id: decoded.id,
          action: 'Logout Successful',
          module: 'Auth',
          ip_address: ip
        });
      }
    }

    // Set cookie headers to clear them
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      expires: new Date(0) // Expire immediately
    };

    const clearAccess = serialize('accessToken', '', cookieOptions);
    const clearRefresh = serialize('refreshToken', '', cookieOptions);

    const response = NextResponse.json({ success: true, message: 'Logged out successfully.' });
    response.headers.append('Set-Cookie', clearAccess);
    response.headers.append('Set-Cookie', clearRefresh);

    return response;
  } catch (error) {
    console.error('Logout Route Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
