const { NextResponse } = require('next/server');
const { LeadSource } = require('@/models');
const { withApiAuth } = require('@/lib/apiGuard');

async function getHandler(request) {
  try {
    const companyId = request.companyId;

    const sources = await LeadSource.findAll({
      where: { company_id: companyId },
      order: [['source_name', 'ASC']]
    });

    return NextResponse.json({ sources });
  } catch (error) {
    console.error('GET Lead Sources Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

async function postHandler(request) {
  try {
    const user = request.user;
    const companyId = request.companyId;

    if (user.role === 'staff') {
      return NextResponse.json({ error: 'Forbidden: Staff cannot create sources.' }, { status: 403 });
    }

    const { source_name } = await request.json();

    if (!source_name) {
      return NextResponse.json({ error: 'Source name is required.' }, { status: 400 });
    }

    const newSource = await LeadSource.create({
      company_id: companyId,
      source_name
    });

    return NextResponse.json({
      success: true,
      source: newSource
    }, { status: 201 });
  } catch (error) {
    console.error('POST Lead Sources Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const GET = withApiAuth(getHandler);
export const POST = withApiAuth(postHandler);
