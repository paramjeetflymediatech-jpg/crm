const { NextResponse } = require('next/server');
const { Notification, Lead } = require('@/models');
const { withApiAuth } = require('@/lib/apiGuard');
const { Op } = require('sequelize');

async function getHandler(request) {
  try {
    const user = request.user;
    const companyId = request.companyId;
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    const where = {
      user_id: user.id
    };

    if (user.role !== 'super_admin') {
      where.company_id = companyId;
    }

    if (unreadOnly) {
      where.is_read = false;
    }

    const notifications = await Notification.findAll({
      where,
      limit: 50,
      order: [['created_at', 'DESC']],
      include: [{ model: Lead, attributes: ['id', 'first_name', 'last_name'] }]
    });

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error('GET Notifications Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

async function postHandler(request) {
  try {
    const user = request.user;
    const companyId = request.companyId;
    const body = await request.json();

    const { markAll, notificationIds } = body;

    const where = {
      user_id: user.id
    };

    if (user.role !== 'super_admin') {
      where.company_id = companyId;
    }

    if (markAll === true) {
      await Notification.update({ is_read: true }, { where });
      return NextResponse.json({ success: true, message: 'All notifications marked as read.' });
    }

    if (notificationIds && Array.isArray(notificationIds) && notificationIds.length > 0) {
      where.id = { [Op.in]: notificationIds };
      await Notification.update({ is_read: true }, { where });
      return NextResponse.json({ success: true, message: 'Selected notifications marked as read.' });
    }

    return NextResponse.json({ error: 'Invalid parameters: markAll or notificationIds required.' }, { status: 400 });

  } catch (error) {
    console.error('POST Notifications Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const GET = withApiAuth(getHandler);
export const POST = withApiAuth(postHandler);
