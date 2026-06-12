const { NextResponse } = require('next/server');
const { Lead, Task, LeadActivity, Notification, User } = require('@/models');
const { withApiAuth } = require('@/lib/apiGuard');
const { createTaskSchema } = require('@/validations/schemas');
const { sendEmail } = require('@/emails/mailer');
const { emitToCompany } = require('@/socket/socketServer');

async function postHandler(request, { params }) {
  try {
    const { id } = await params;
    const user = request.user;
    const companyId = request.companyId;
    const body = await request.json();

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

    // Validate request schema
    const validation = createTaskSchema.safeParse({
      ...body,
      lead_id: lead.id
    });

    if (!validation.success) {
      const errorMsg = validation.error.errors.map(e => e.message).join(', ');
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const taskData = validation.data;

    // Retrieve assignee details
    const assignee = await User.findByPk(taskData.assigned_to);
    if (!assignee || assignee.company_id !== lead.company_id) {
      return NextResponse.json({ error: 'Invalid assigned user.' }, { status: 400 });
    }

    // Create Task
    const newTask = await Task.create({
      company_id: lead.company_id,
      lead_id: lead.id,
      assigned_to: taskData.assigned_to,
      title: taskData.title,
      description: taskData.description || '',
      due_date: new Date(taskData.due_date),
      status: 'Pending'
    });

    // Create Activity log
    await LeadActivity.create({
      lead_id: lead.id,
      user_id: user.id,
      action: 'Task Assigned',
      description: `Task "${taskData.title}" created by ${user.name} and assigned to ${assignee.name}.`
    });

    // Notify assignee if it's someone else
    if (assignee.id !== user.id) {
      const notificationTitle = 'New Task Assigned';
      const notificationMessage = `Task: ${taskData.title} | Lead: ${lead.first_name} ${lead.last_name || ''}`;

      // Create Notification log
      const notification = await Notification.create({
        company_id: lead.company_id,
        user_id: assignee.id,
        lead_id: lead.id,
        title: notificationTitle,
        message: notificationMessage,
        type: 'Lead Assigned', // standard type
        is_read: false
      });

      // Broadcast Socket.IO event
      emitToCompany(lead.company_id, 'notification', {
        id: notification.id,
        title: notificationTitle,
        message: notificationMessage,
        type: 'Lead Assigned',
        leadId: lead.id,
        userId: assignee.id,
        createdAt: notification.createdAt
      });

      // Send push notification via FCM
      try {
        const { sendPushNotification } = require('@/lib/fcm');
        const fcmTokens = assignee.fcm_tokens;
        if (fcmTokens && Array.isArray(fcmTokens) && fcmTokens.length > 0) {
          sendPushNotification(fcmTokens, notificationTitle, notificationMessage, {
            type: 'New Task',
            leadId: lead.id,
            taskId: newTask.id
          }).catch(err => console.error('[FCM] Background push error:', err));
        }
      } catch (fcmErr) {
        console.error('[FCM] Push setup error:', fcmErr);
      }

      // Send Email Alert
      await sendEmail({
        to: assignee.email,
        subject: `[CRM] New Task Assigned: ${taskData.title}`,
        text: `Hello ${assignee.name},\n\nYou have been assigned a new task by ${user.name}.\n\nTask: ${taskData.title}\nDescription: ${taskData.description || 'No description'}\nDue Date: ${newTask.due_date}\n\nLead: ${lead.first_name} ${lead.last_name || ''}\n\nPlease check your CRM dashboard.`,
        html: `
          <p>Hello <strong>${assignee.name}</strong>,</p>
          <p>You have been assigned a new task by <strong>${user.name}</strong>.</p>
          <ul>
            <li><strong>Task:</strong> ${taskData.title}</li>
            <li><strong>Description:</strong> ${taskData.description || 'No description'}</li>
            <li><strong>Due Date:</strong> ${newTask.due_date.toLocaleString()}</li>
            <li><strong>Lead:</strong> ${lead.first_name} ${lead.last_name || ''}</li>
          </ul>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/leads/${lead.id}">Click here to view Lead details</a></p>
        `
      });
    }

    const taskWithAssignee = {
      ...newTask.toJSON(),
      AssignedUser: {
        id: assignee.id,
        name: assignee.name
      }
    };

    return NextResponse.json({
      success: true,
      message: 'Task created and assigned successfully.',
      task: taskWithAssignee
    }, { status: 201 });

  } catch (error) {
    console.error('POST Lead Task Route Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const POST = withApiAuth(postHandler);
