const { NextResponse } = require('next/server');
const { verifyRefreshToken, signAccessToken } = require('@/lib/jwt');
const { parse, serialize } = require('cookie');

export async function POST(request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = parse(cookieHeader);
    const refreshToken = cookies.refreshToken;

    if (!refreshToken) {
      return NextResponse.json({ error: 'Refresh token not found.' }, { status: 401 });
    }

    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid or expired refresh token.' }, { status: 401 });
    }

    // Sign new access token
    const tokenPayload = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      companyId: decoded.companyId
    };

    const newAccessToken = signAccessToken(tokenPayload);

    // Serialize new access token
    const accessCookie = serialize('accessToken', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 // 1 hour
    });

    const response = NextResponse.json({ success: true, message: 'Token refreshed.' });
    response.headers.append('Set-Cookie', accessCookie);

    return response;
  } catch (error) {
    console.error('Refresh Route Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
