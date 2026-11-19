const { NextResponse } = require('next/server');
const { CallLog, User, Lead } = require('@/models');
const { withApiAuth } = require('@/lib/apiGuard');

async function getHandler(request, { params }) {
  try {
    const { id } = await params;
    const user = request.user;
    const companyId = request.companyId;

    const lead = await Lead.findByPk(id);
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });
    }

    // Tenancy check
    if (user.role !== 'super_admin' && lead.company_id !== companyId) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
    }

    const calls = await CallLog.findAll({
      where: { lead_id: id },
      include: [
        { model: User, attributes: ['id', 'name', 'email', 'avatar'] }
      ],
      order: [['created_at', 'DESC']]
    });

    return NextResponse.json({ calls });
  } catch (error) {
    console.error('Fetch Lead Calls Error:', error);
    return NextResponse.json({ error: 'Failed to fetch call logs.' }, { status: 500 });
  }
}

export const GET = withApiAuth(getHandler);
