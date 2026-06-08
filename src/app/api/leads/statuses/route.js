const { NextResponse } = require('next/server');
const { LeadStatus } = require('@/models');
const { withApiAuth } = require('@/lib/apiGuard');

async function getHandler(request) {
  try {
    const companyId = request.companyId;

    const statuses = await LeadStatus.findAll({
      where: { company_id: companyId },
      order: [['sort_order', 'ASC']]
    });

    return NextResponse.json({ statuses });
  } catch (error) {
    console.error('GET Lead Statuses Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

async function postHandler(request) {
  try {
    const user = request.user;
    const companyId = request.companyId;

    if (user.role === 'staff') {
      return NextResponse.json({ error: 'Forbidden: Staff cannot create statuses.' }, { status: 403 });
    }

    const { name, color, sort_order = 0 } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
    }

    const newStatus = await LeadStatus.create({
      company_id: companyId,
      name,
      color: color || '#cccccc',
      sort_order
    });

    return NextResponse.json({
      success: true,
      status: newStatus
    }, { status: 201 });
  } catch (error) {
    console.error('POST Lead Statuses Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const GET = withApiAuth(getHandler);
export const POST = withApiAuth(postHandler);
