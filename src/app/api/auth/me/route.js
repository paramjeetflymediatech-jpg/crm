const { NextResponse } = require('next/server');
const { Company } = require('@/models');
const { withApiAuth } = require('@/lib/apiGuard');

async function handler(request) {
  const user = request.user;
  let company = user.Company;
  if (!company && user.role === 'super_admin') {
    company = await Company.findOne({ order: [['id', 'ASC']] });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.company_id || (company ? company.id : null),
      companyName: company ? company.company_name : 'System Platform',
      avatar: user.avatar,
      companyLogo: company ? company.logo : null,
      phone: user.phone
    }
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
    }
  });
}

export const GET = withApiAuth(handler);
