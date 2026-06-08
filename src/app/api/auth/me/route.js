const { NextResponse } = require('next/server');
const { withApiAuth } = require('@/lib/apiGuard');

async function handler(request) {
  const user = request.user;
  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.company_id,
      companyName: user.Company ? user.Company.company_name : 'System Platform',
      avatar: user.avatar,
      phone: user.phone
    }
  });
}

export const GET = withApiAuth(handler);
