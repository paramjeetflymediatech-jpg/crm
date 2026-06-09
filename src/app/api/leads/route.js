const { NextResponse } = require('next/server');
const { Op } = require('sequelize');
const { Lead, User, LeadActivity, LeadNote, Company } = require('@/models');
const { withApiAuth } = require('@/lib/apiGuard');
const { createLeadSchema } = require('@/validations/schemas');

async function getHandler(request) {
  try {
    const user = request.user;
    const companyId = request.companyId;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const source = searchParams.get('source');
    const priority = searchParams.get('priority');
    const assignedTo = searchParams.get('assignedTo');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');
    const sortField = searchParams.get('sortField') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'DESC';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = (page - 1) * limit;

    // Build query conditions
    const where = {};

    // 1. Enforce Tenant & Role Isolation
    if (user.role === 'super_admin') {
      // Super Admin: can view all, or filter by specific company
      const filterCompanyId = searchParams.get('companyId');
      if (filterCompanyId) {
        where.company_id = filterCompanyId;
      }
    } else if (user.role === 'company_admin') {
      // Company Admin: view all leads in their company
      where.company_id = companyId;
    } else {
      // Staff User: view ONLY assigned leads
      where.company_id = companyId;
      where.assigned_to = user.id;
    }

    // 2. Field Filters (ignore the '_all' sentinel used by frontend dropdowns)
    if (status && status !== '_all') where.status = status;
    if (source && source !== '_all') where.source = source;
    if (priority && priority !== '_all') where.priority = priority;
    // Parse to integer — URL params are always strings but assigned_to is an INTEGER column
    // Also skip if user is staff (their isolation is already set above and cannot be overridden)
    if (assignedTo && assignedTo !== '_all' && user.role !== 'staff') {
      const assignedToInt = parseInt(assignedTo, 10);
      if (!isNaN(assignedToInt)) where.assigned_to = assignedToInt;
    }

    // Date Range filter (using created_at)
    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) {
        where.created_at[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        where.created_at[Op.lte] = new Date(endDate);
      }
    }

    // 3. Search text (matches first_name, last_name, email, phone, subject)
    if (search) {
      where[Op.or] = [
        { first_name: { [Op.like]: `%${search}%` } },
        { last_name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { subject: { [Op.like]: `%${search}%` } }
      ];
    }

    // 4. Execute Query with Count
    const { count, rows } = await Lead.findAndCountAll({
      where,
      include: [
        { model: User, as: 'AssignedUser', attributes: ['id', 'name', 'email', 'avatar'] },
        { model: Company, attributes: ['id', 'company_name'] }
      ],
      order: [[sortField, sortOrder]],
      limit,
      offset
    });

    return NextResponse.json({
      leads: rows,
      totalCount: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (error) {
    console.error('GET Leads Route Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

async function postHandler(request) {
  try {
    const user = request.user;
    const companyId = request.companyId;
    const body = await request.json();

    // Super admins need to provide a companyId to create a lead
    if (user.role === 'super_admin' && !body.company_id) {
      return NextResponse.json({ error: 'company_id is required for super admin lead creation.' }, { status: 400 });
    }

    const targetCompanyId = user.role === 'super_admin' ? body.company_id : companyId;

    // Validate request schema
    const validation = createLeadSchema.safeParse(body);
    if (!validation.success) {
      const errorMsg = validation.error.errors.map(e => e.message).join(', ');
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const leadData = validation.data;

    // Create Lead
    const newLead = await Lead.create({
      ...leadData,
      company_id: targetCompanyId
    });

    // Create Activity Log
    await LeadActivity.create({
      lead_id: newLead.id,
      user_id: user.id,
      action: 'Lead Created',
      description: `Lead created manually by ${user.name}.`
    });

    return NextResponse.json({
      success: true,
      message: 'Lead created successfully.',
      lead: newLead
    }, { status: 201 });
  } catch (error) {
    console.error('POST Leads Route Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const GET = withApiAuth(getHandler);
export const POST = withApiAuth(postHandler);
