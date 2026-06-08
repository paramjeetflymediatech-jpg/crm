const { NextResponse } = require('next/server');
const { Lead, LeadNote, LeadActivity, User } = require('@/models');
const { withApiAuth } = require('@/lib/apiGuard');

async function postHandler(request, { params }) {
  try {
    const { id } = await params;
    const user = request.user;
    const companyId = request.companyId;
    const body = await request.json();

    const { note } = body;
    if (!note || note.trim() === '') {
      return NextResponse.json({ error: 'Note content cannot be empty.' }, { status: 400 });
    }

    // Verify authorized access to lead
    const lead = await Lead.findByPk(id);
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });
    }

    // Access control
    if (user.role !== 'super_admin') {
      if (lead.company_id !== companyId) {
        return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
      }
      if (user.role === 'staff' && lead.assigned_to !== user.id) {
        return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
      }
    }

    // Create Note
    const newNote = await LeadNote.create({
      lead_id: lead.id,
      user_id: user.id,
      note: note
    });

    // Create Activity
    await LeadActivity.create({
      lead_id: lead.id,
      user_id: user.id,
      action: 'Note Added',
      description: `${user.name} added a note: "${note.substring(0, 50)}${note.length > 50 ? '...' : ''}"`
    });

    // Include user details in response
    const noteWithUser = {
      ...newNote.toJSON(),
      User: {
        id: user.id,
        name: user.name,
        avatar: user.avatar
      }
    };

    return NextResponse.json({
      success: true,
      message: 'Note added successfully.',
      note: noteWithUser
    }, { status: 201 });

  } catch (error) {
    console.error('POST Lead Note Route Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const POST = withApiAuth(postHandler);
