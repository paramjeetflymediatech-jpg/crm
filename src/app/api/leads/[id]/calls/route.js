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

    // Enforce role-based access: Only super_admin and company_admin can access audio recordings
    const canListenRecordings = user.role === 'super_admin' || user.role === 'company_admin';

    const sanitizedCalls = calls.map(c => {
      const plain = c.toJSON ? c.toJSON() : { ...c };
      plain.has_recording = Boolean(plain.recording_url);
      if (!canListenRecordings) {
        plain.recording_url = null; // Strip audio file URL from staff
      }
      return plain;
    });

    return NextResponse.json({ calls: sanitizedCalls });
  } catch (error) {
    console.error('Fetch Lead Calls Error:', error);
    return NextResponse.json({ error: 'Failed to fetch call logs.' }, { status: 500 });
  }
}

export const GET = withApiAuth(getHandler);
