const { NextResponse } = require('next/server');
const { Op } = require('sequelize');
const { Lead, LeadActivity, User } = require('@/models');
const { withApiAuth } = require('@/lib/apiGuard');

async function postHandler(request) {
  try {
    const user = request.user;
    const companyId = request.companyId;
    const body = await request.json();

    const { action, leadIds, assignedTo, status } = body;

    if (!action || !leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ error: 'Invalid payload: action and non-empty leadIds list are required.' }, { status: 400 });
    }

    // Staff cannot perform bulk deletions
    if (action === 'delete' && user.role === 'staff') {
      return NextResponse.json({ error: 'Forbidden: Staff users cannot perform bulk deletion.' }, { status: 403 });
    }

    // Build lead query with tenant checks
    const whereClause = {
      id: { [Op.in]: leadIds }
    };

    if (user.role !== 'super_admin') {
      whereClause.company_id = companyId;
      if (user.role === 'staff') {
        // Staff can only bulk update their own assigned leads
        whereClause.assigned_to = user.id;
      }
    }

    // Fetch leads to verify we can update them
    const leads = await Lead.findAll({ where: whereClause });
    if (leads.length === 0) {
      return NextResponse.json({ error: 'No valid leads found to update.' }, { status: 404 });
    }

    const actualLeadIds = leads.map(l => l.id);

    if (action === 'delete') {
      // Bulk Delete
      await Lead.destroy({ where: { id: { [Op.in]: actualLeadIds } } });
      
      // We don't need activity logs for deleted items, but we can write an audit log
      console.log(`[Bulk] ${user.name} deleted ${actualLeadIds.length} leads.`);
      
      return NextResponse.json({
        success: true,
        message: `Successfully deleted ${actualLeadIds.length} leads.`
      });
    }

    if (action === 'assign') {
      if (!assignedTo) {
        return NextResponse.json({ error: 'assignedTo value required for assignment.' }, { status: 400 });
      }

      // Verify assignee belongs to the tenant
      const assignee = await User.findByPk(assignedTo);
      if (!assignee || (user.role !== 'super_admin' && assignee.company_id !== companyId)) {
        return NextResponse.json({ error: 'Invalid assigned representative selected.' }, { status: 400 });
      }

      // Update assignment
      await Lead.update(
        { assigned_to: assignedTo },
        { where: { id: { [Op.in]: actualLeadIds } } }
      );

      // Create activity logs
      for (const lead of leads) {
        await LeadActivity.create({
          lead_id: lead.id,
          user_id: user.id,
          action: 'Lead Updated',
          description: `Lead bulk-assigned to ${assignee.name} by ${user.name}.`
        });
      }

      return NextResponse.json({
        success: true,
        message: `Successfully assigned ${actualLeadIds.length} leads to ${assignee.name}.`
      });
    }

    if (action === 'update_status') {
      if (!status) {
        return NextResponse.json({ error: 'status value required.' }, { status: 400 });
      }

      // Update status
      await Lead.update(
        { status },
        { where: { id: { [Op.in]: actualLeadIds } } }
      );

      // Create activity logs
      for (const lead of leads) {
        await LeadActivity.create({
          lead_id: lead.id,
          user_id: user.id,
          action: 'Lead Updated',
          description: `Lead status bulk-updated to "${status}" by ${user.name}.`
        });
      }

      return NextResponse.json({
        success: true,
        message: `Successfully updated status of ${actualLeadIds.length} leads to "${status}".`
      });
    }

    return NextResponse.json({ error: 'Unsupported bulk action.' }, { status: 400 });

  } catch (error) {
    console.error('POST Bulk Lead Action Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const POST = withApiAuth(postHandler);
