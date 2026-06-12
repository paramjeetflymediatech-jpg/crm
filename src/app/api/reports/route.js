const { NextResponse } = require('next/server');
const { Lead, Task, User, sequelize } = require('@/models');
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

    // 2. Fetch all leads in scope to perform calculations (faster and highly customizable in JS)
    // We only retrieve needed fields for optimization
    const leads = await Lead.findAll({
      where,
      attributes: ['id', 'status', 'source', 'created_at', 'updated_at', 'assigned_to']
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
      // Count lead in the month it was CREATED
      const createdDate = new Date(lead.created_at);
      const createdKey = `${monthNames[createdDate.getMonth()]} ${createdDate.getFullYear()}`;
      if (leadsByMonthMap[createdKey]) {
        leadsByMonthMap[createdKey].count++;
      }

      // Count conversion in the month it was CONVERTED (updated_at)
      if (lead.status === 'Converted') {
        const convertedDate = new Date(lead.updated_at || lead.created_at);
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
      }
    });

  } catch (error) {
    console.error('GET Reports Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const GET = withApiAuth(handler);
