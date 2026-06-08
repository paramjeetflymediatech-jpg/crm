const { NextResponse } = require('next/server');
const { Task, LeadActivity } = require('@/models');
const { withApiAuth } = require('@/lib/apiGuard');

async function putHandler(request) {
  try {
    const user = request.user;
    const companyId = request.companyId;
    const body = await request.json();

    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing required fields: id and status.' }, { status: 400 });
    }

    const task = await Task.findByPk(id);
    if (!task) {
      return NextResponse.json({ error: 'Task not found.' }, { status: 404 });
    }

    // Access control
    if (user.role !== 'super_admin' && task.company_id !== companyId) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const originalStatus = task.status;
    await task.update({ status });

    // Create Activity log on the lead
    if (task.lead_id && originalStatus !== status) {
      await LeadActivity.create({
        lead_id: task.lead_id,
        user_id: user.id,
        action: 'Task Updated',
        description: `Task "${task.title}" marked as ${status} by ${user.name}.`
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Task status updated successfully.',
      task
    });

  } catch (error) {
    console.error('PUT Tasks Route Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const PUT = withApiAuth(putHandler);
