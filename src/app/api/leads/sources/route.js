const { NextResponse } = require('next/server');
const { LeadSource, Lead, sequelize } = require('@/models');
const { withApiAuth } = require('@/lib/apiGuard');
const { QueryTypes } = require('sequelize');

async function getHandler(request) {
  try {
    const companyId = request.companyId;

    // 1. Get sources registered in the lead_sources table
    const registeredSources = await LeadSource.findAll({
      where: { company_id: companyId },
      order: [['source_name', 'ASC']]
    });

    // 2. Get distinct source values actually used in leads (covers WordPress/imported leads
    //    whose source string was never added to the lead_sources table)
    const actualSources = await sequelize.query(
      `SELECT DISTINCT source FROM leads WHERE company_id = :companyId AND source IS NOT NULL AND source != '' ORDER BY source ASC`,
      { replacements: { companyId }, type: QueryTypes.SELECT }
    );

    // 3. Merge both lists, deduplicate by source_name
    const registeredNames = new Set(registeredSources.map(s => s.source_name));
    const extraSources = actualSources
      .filter(row => !registeredNames.has(row.source))
      .map((row, i) => ({ id: `actual-${i}`, source_name: row.source }));

    const sources = [...registeredSources, ...extraSources]
      .sort((a, b) => a.source_name.localeCompare(b.source_name));

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
