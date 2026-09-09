const { NextResponse } = require('next/server');
const { Lead, Task, User, LeadNote, LeadActivity, sequelize } = require('@/models');
const { withApiAuth } = require('@/lib/apiGuard');
const { Op } = require('sequelize');

async function handler(request) {
  try {
    const user = request.user;
    const companyId = request.companyId;

    // Build base where clause for tenant boundary
    const where = {};
    const taskWhere = { status: 'Pending' };

    if (user.role !== 'super_admin') {
      where.company_id = companyId;
      taskWhere.company_id = companyId;

      if (user.role === 'staff') {
        // Staff can only view their own performance metrics
        where.assigned_to = user.id;
        taskWhere.assigned_to = user.id;
      }
    }

    // 1. KPI Counts
    const totalLeads = await Lead.count({ where });
    const newLeads = await Lead.count({ where: { ...where, status: 'New' } });
    const qualifiedLeads = await Lead.count({ where: { ...where, status: 'Qualified' } });
    const convertedLeads = await Lead.count({ where: { ...where, status: 'Converted' } });
    const lostLeads = await Lead.count({ where: { ...where, status: 'Lost' } });

    // Follow-ups today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    taskWhere.due_date = { [Op.between]: [todayStart, todayEnd] };
    const followupsToday = await Task.count({ where: taskWhere });

    // 2. Fetch all leads with full details (for table + aggregations + remarks + follow-ups)
    const leads = await Lead.findAll({
      where,
      attributes: [
        'id', 'first_name', 'last_name', 'email', 'phone',
        'source', 'status', 'priority', 'lead_score',
        'subject', 'message', 'follow_up_date', 'assigned_to',
        // Must be explicitly listed — Sequelize does NOT auto-include timestamps when attributes array is used
        'createdAt', 'updatedAt'
      ],
      include: [
        {
          model: User,
          as: 'AssignedUser',
          attributes: ['id', 'name'],
          required: false
        },
        {
          model: LeadNote,
          as: 'Notes',
          attributes: ['id', 'note', 'createdAt'],
          include: [{ model: User, attributes: ['id', 'name'], required: false }],
          required: false
        },
        {
          model: Task,
          as: 'Tasks',
          attributes: ['id', 'title', 'description', 'due_date', 'status'],
          include: [{ model: User, as: 'AssignedUser', attributes: ['id', 'name'], required: false }],
          required: false
        },
        {
          model: LeadActivity,
          as: 'Activities',
          attributes: ['id', 'action', 'description', 'createdAt'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // 3. Aggregate Leads by Month (Last 6 Months)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const leadsByMonthMap = {};
    
    // Initialize past 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      leadsByMonthMap[key] = { month: key, count: 0, converted: 0 };
    }

    leads.forEach(lead => {
      // Count lead in the month it was CREATED (use camelCase — underscored: true maps created_at <-> createdAt)
      const createdDate = new Date(lead.createdAt);
      const createdKey = `${monthNames[createdDate.getMonth()]} ${createdDate.getFullYear()}`;
      if (leadsByMonthMap[createdKey]) {
        leadsByMonthMap[createdKey].count++;
      }

      // Count conversion in the month it was CONVERTED
      if (lead.status === 'Converted') {
        const convertedDate = new Date(lead.updatedAt || lead.createdAt);
        const convertedKey = `${monthNames[convertedDate.getMonth()]} ${convertedDate.getFullYear()}`;
        if (leadsByMonthMap[convertedKey]) {
          leadsByMonthMap[convertedKey].converted++;
        }
      }
    });

    const leadsByMonth = Object.values(leadsByMonthMap);

    // 4. Aggregate Leads by Source
    const sourceMap = {};
    leads.forEach(lead => {
      const src = lead.source || 'Unknown';
      sourceMap[src] = (sourceMap[src] || 0) + 1;
    });

    const leadsBySource = Object.entries(sourceMap).map(([name, value]) => ({
      name,
      value
    }));

    // 5. Aggregate Lead Status Pipeline
    const statusMap = {};
    leads.forEach(lead => {
      const stat = lead.status || 'New';
      statusMap[stat] = (statusMap[stat] || 0) + 1;
    });

    const leadPipeline = Object.entries(statusMap).map(([name, value]) => ({
      name,
      value
    }));

    // 6. Team Performance
    const userQuery = {};
    if (user.role === 'staff') {
      userQuery.id = user.id;
    } else if (user.role !== 'super_admin') {
      userQuery.company_id = companyId;
    }

    const teamMembers = await User.findAll({
      where: userQuery,
      attributes: ['id', 'name']
    });

    const teamPerformance = teamMembers.map(member => {
      const memberLeads = leads.filter(l => l.assigned_to === member.id);
      const total = memberLeads.length;
      const converted = memberLeads.filter(l => l.status === 'Converted').length;
      const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0;

      return {
        name: member.name,
        leads: total,
        converted,
        conversionRate
      };
    });

    // 7. General Conversion Rate
    const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

    // 8. Full leads detail list for table + exports (including remarks, conversion & follow-ups)
    const leadsDetail = leads.map(lead => {
      const notes = (lead.Notes || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const tasks = (lead.Tasks || []).sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

      // 1. Remarks (Notes + Message)
      const notesRemarks = notes.map(n => {
        const author = n.User ? n.User.name : 'Staff';
        const date = n.createdAt ? new Date(n.createdAt).toLocaleDateString('en-GB') : '';
        return `[${date} - ${author}]: ${n.note.replace(/\r?\n/g, ' ')}`;
      }).join(' | ');

      const remarks = notesRemarks || lead.message || 'No remarks recorded';
      const latestRemark = notes.length > 0 ? notes[0].note : (lead.message || '');

      // 2. Follow-up
      let nextFollowUpDate = lead.follow_up_date 
        ? new Date(lead.follow_up_date).toLocaleDateString('en-GB') 
        : '';
      
      const pendingTasks = tasks.filter(t => t.status === 'Pending');
      if (!nextFollowUpDate && pendingTasks.length > 0) {
        nextFollowUpDate = new Date(pendingTasks[0].due_date).toLocaleDateString('en-GB');
      }

      const followUpDetails = tasks.length > 0
        ? tasks.map(t => {
            const dueDate = t.due_date ? new Date(t.due_date).toLocaleDateString('en-GB') : 'No Date';
            const assignee = t.AssignedUser ? ` (${t.AssignedUser.name})` : '';
            return `[${t.status}] ${t.title} - Due: ${dueDate}${assignee}${t.description ? ` (${t.description})` : ''}`;
          }).join('; ')
        : (nextFollowUpDate ? `Scheduled for ${nextFollowUpDate}` : 'No follow-up scheduled');

      // 3. Conversion Status & Details
      const isConverted = lead.status === 'Converted';
      const conversionDate = isConverted ? new Date(lead.updatedAt || lead.createdAt).toLocaleDateString('en-GB') : '';
      const conversionDetails = isConverted 
        ? `Converted on ${conversionDate}` 
        : (lead.status === 'Lost' ? 'Lost' : `In Pipeline (${lead.status})`);

      return {
        id: lead.id,
        name: `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
        email: lead.email || '',
        phone: lead.phone || '',
        source: lead.source || 'Unknown',
        status: lead.status || 'New',
        priority: lead.priority || 'Medium',
        lead_score: lead.lead_score || 0,
        subject: lead.subject || '',
        message: lead.message || '',
        assigned_to: lead.AssignedUser ? lead.AssignedUser.name : 'Unassigned',
        created_at: lead.createdAt,
        // Remarks & Conversion & Follow-up
        remarks,
        latest_remark: latestRemark,
        notes_count: notes.length,
        follow_up_date: nextFollowUpDate || 'None',
        follow_up_details: followUpDetails,
        conversion_status: lead.status,
        conversion_date: conversionDate,
        conversion_details: conversionDetails
      };
    });

    return NextResponse.json({
      summary: {
        totalLeads,
        newLeads,
        qualifiedLeads,
        convertedLeads,
        lostLeads,
        followupsToday,
        conversionRate
      },
      charts: {
        leadsByMonth,
        leadsBySource,
        leadPipeline,
        teamPerformance
      },
      leadsDetail
    });

  } catch (error) {
    console.error('GET Reports Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const GET = withApiAuth(handler);
