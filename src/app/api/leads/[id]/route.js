const { NextResponse } = require('next/server');
const { Lead, User, LeadActivity, LeadNote, Task } = require('@/models');
const { withApiAuth } = require('@/lib/apiGuard');
const { updateLeadSchema } = require('@/validations/schemas');

// Helper to check access and return lead if authorized
async function getAuthorizedLead(leadId, currentUser, currentCompanyId) {
  const lead = await Lead.findByPk(leadId, {
    include: [
      { model: User, as: 'AssignedUser', attributes: ['id', 'name', 'email', 'avatar'] },
      { 
        model: LeadNote, 
        as: 'Notes', 
        include: [{ model: User, attributes: ['id', 'name', 'avatar'] }] 
      },
      { 
        model: LeadActivity, 
        as: 'Activities',
        include: [{ model: User, attributes: ['id', 'name', 'avatar'] }] 
      },
      { 
        model: Task, 
        as: 'Tasks',
        include: [{ model: User, as: 'AssignedUser', attributes: ['id', 'name'] }]
      }
    ]
  });

  if (!lead) return null;

  // Enforce tenant boundary
  if (currentUser.role !== 'super_admin') {
    if (lead.company_id !== currentCompanyId) return null;
    
    // Staff user: only access assigned leads
    if (currentUser.role === 'staff' && lead.assigned_to !== currentUser.id) {
      return null;
    }
  }

  return lead;
}

async function getHandler(request, { params }) {
  try {
    const { id } = await params;
    const user = request.user;
    const companyId = request.companyId;

    const lead = await getAuthorizedLead(id, user, companyId);
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found or unauthorized.' }, { status: 404 });
    }

    return NextResponse.json({ lead });
  } catch (error) {
    console.error('GET Lead By ID Route Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

async function putHandler(request, { params }) {
  try {
    const { id } = await params;
    const user = request.user;
    const companyId = request.companyId;
    const body = await request.json();

    const lead = await getAuthorizedLead(id, user, companyId);
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found or unauthorized.' }, { status: 404 });
    }

    // Validate body (partial schema validation since it's a PUT update)
    const validation = updateLeadSchema.safeParse(body);
    if (!validation.success) {
      const errorMsg = validation.error.errors.map(e => e.message).join(', ');
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const updateData = validation.data;
    const originalStatus = lead.status;
    const originalAssignee = lead.assigned_to;

    // Track status change for activity log
    const changedFields = [];
    if (updateData.status && updateData.status !== originalStatus) {
      changedFields.push(`status changed from "${originalStatus}" to "${updateData.status}"`);
    }
    if (updateData.assigned_to !== undefined && updateData.assigned_to !== originalAssignee) {
      const newAssignee = updateData.assigned_to 
        ? (await User.findByPk(updateData.assigned_to))?.name || 'Unknown'
        : 'Unassigned';
      changedFields.push(`assigned representative set to "${newAssignee}"`);
    }

    // Save updates
    await lead.update(updateData);

    // Create activity logs for modifications
    if (changedFields.length > 0) {
      await LeadActivity.create({
        lead_id: lead.id,
        user_id: user.id,
        action: 'Lead Updated',
        description: `Lead details updated by ${user.name}: ${changedFields.join(', ')}.`
      });
    } else {
      await LeadActivity.create({
        lead_id: lead.id,
        user_id: user.id,
        action: 'Lead Updated',
        description: `Lead information updated by ${user.name}.`
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Lead updated successfully.',
      lead
    });
  } catch (error) {
    console.error('PUT Lead By ID Route Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

async function deleteHandler(request, { params }) {
  try {
    const { id } = await params;
    const user = request.user;
    const companyId = request.companyId;

    // Restrict Lead Deletion to Admin levels
    if (user.role === 'staff') {
      return NextResponse.json({ error: 'Forbidden: Staff users cannot delete leads.' }, { status: 403 });
    }

    const lead = await getAuthorizedLead(id, user, companyId);
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found or unauthorized.' }, { status: 404 });
    }

    await lead.destroy();

    return NextResponse.json({
      success: true,
      message: 'Lead deleted successfully.'
    });
  } catch (error) {
    console.error('DELETE Lead By ID Route Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const GET = withApiAuth(getHandler);
export const PUT = withApiAuth(putHandler);
export const DELETE = withApiAuth(deleteHandler);
