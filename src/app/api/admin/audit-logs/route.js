const { NextResponse } = require('next/server');
const { AuditLog, User, Company } = require('@/models');
const { withApiAuth } = require('@/lib/apiGuard');

async function getHandler(request) {
  try {
    const user = request.user;
    const companyId = request.companyId;

    // Direct access to Admin roles only
    if (user.role === 'staff') {
      return NextResponse.json({ error: 'Forbidden: Staff cannot inspect audit logs.' }, { status: 403 });
    }

    const where = {};
    if (user.role !== 'super_admin') {
      where.company_id = companyId;
    }

    const logs = await AuditLog.findAll({
      where,
      limit: 100,
      order: [['created_at', 'DESC']],
      include: [
        { model: User, attributes: ['id', 'name', 'email'] },
        { model: Company, attributes: ['id', 'company_name'] }
      ]
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('GET Audit Logs Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const GET = withApiAuth(getHandler);
