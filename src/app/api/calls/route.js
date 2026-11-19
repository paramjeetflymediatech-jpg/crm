const { NextResponse } = require('next/server');
const { Op } = require('sequelize');
const { CallLog, Lead, User, Company } = require('@/models');
const { withApiAuth } = require('@/lib/apiGuard');

async function getHandler(request) {
  try {
    const user = request.user;
    const companyId = request.companyId;

    // RBAC: Strictly restricted to super_admin and company_admin
    if (user.role !== 'super_admin' && user.role !== 'company_admin') {
      return NextResponse.json({
        error: 'Forbidden: Access to call records is restricted to administrators only.'
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').trim();
    const status = searchParams.get('status');
    const agentId = searchParams.get('agentId');
    const hasRecording = searchParams.get('hasRecording');
    const filterCompanyId = searchParams.get('companyId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '25', 10);
    const offset = (page - 1) * limit;

    // Build where clause
    const where = {};

    // 1. Enforce Tenancy
    if (user.role === 'super_admin') {
      if (filterCompanyId && filterCompanyId !== '_all') {
        where.company_id = parseInt(filterCompanyId, 10);
      }
    } else {
      where.company_id = companyId;
    }

    // 2. Status filter
    if (status && status !== '_all') {
      where.status = status;
    }

    // 3. Agent filter
    if (agentId && agentId !== '_all') {
      where.user_id = parseInt(agentId, 10);
    }

    // 4. Recording filter
    if (hasRecording === 'true') {
      where.recording_url = { [Op.ne]: null };
    }

    // 5. Date filter
    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) where.created_at[Op.gte] = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.created_at[Op.lte] = end;
      }
    }

    // 6. Search query (search phone, notes, or lead name)
    const leadWhere = {};
    if (search) {
      where[Op.or] = [
        { to_number: { [Op.like]: `%${search}%` } },
        { from_number: { [Op.like]: `%${search}%` } },
        { notes: { [Op.like]: `%${search}%` } }
      ];
    }

    // Query records with pagination
    const { count, rows: calls } = await CallLog.findAndCountAll({
      where,
      include: [
        {
          model: Lead,
          attributes: ['id', 'first_name', 'last_name', 'phone', 'status', 'email']
        },
        {
          model: User,
          attributes: ['id', 'name', 'email', 'avatar']
        },
        ...(user.role === 'super_admin' ? [{
          model: Company,
          attributes: ['id', 'company_name']
        }] : [])
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    // Compute summary stats for the current tenant/filter
    const statsWhere = { ...where };
    delete statsWhere[Op.or];

    const totalCalls = await CallLog.count({ where: statsWhere });
    const recordedCalls = await CallLog.count({
      where: {
        ...statsWhere,
        recording_url: { [Op.ne]: null }
      }
    });
    const completedCalls = await CallLog.count({
      where: {
        ...statsWhere,
        status: 'completed'
      }
    });
    const totalDurationSeconds = await CallLog.sum('duration', { where: statsWhere }) || 0;

    return NextResponse.json({
      success: true,
      calls,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit) || 1
      },
      stats: {
        totalCalls,
        recordedCalls,
        completedCalls,
        totalDurationMinutes: Math.round(totalDurationSeconds / 60)
      }
    });
  } catch (error) {
    console.error('All Call Records Route Error:', error);
    return NextResponse.json({ error: 'Failed to fetch call records.' }, { status: 500 });
  }
}

export const GET = withApiAuth(getHandler);
