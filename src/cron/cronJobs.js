const { Op } = require('sequelize');
const { Task, User, Lead, Notification } = require('../models');
const { sendEmail } = require('../emails/mailer');
const { emitToCompany } = require('../socket/socketServer');

/**
 * Runs daily at 8 AM to remind users of tasks due today
 */
async function runDailyFollowUpCron() {
  console.log('[Cron] Checking for tasks due today...');
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const tasks = await Task.findAll({
      where: {
        status: 'Pending',
        due_date: {
          [Op.between]: [todayStart, todayEnd]
        }
      },
      include: [
        { model: User, as: 'AssignedUser' },
        { model: Lead }
      ]
    });

    console.log(`[Cron] Found ${tasks.length} tasks due today.`);

    for (const task of tasks) {
      const user = task.AssignedUser;
      if (!user) continue;

      // 1. Create In-App Notification
      const title = 'Follow-Up Task Due Today';
      const message = `Task "${task.title}" is due today for Lead: ${task.Lead ? `${task.Lead.first_name} ${task.Lead.last_name || ''}` : 'N/A'}`;
      
      const notification = await Notification.create({
        company_id: task.company_id,
        user_id: user.id,
        lead_id: task.lead_id,
        title,
        message,
        type: 'Follow-Up Reminder',
        is_read: false
      });

      // 2. Broadcast via Socket.IO
      emitToCompany(task.company_id, 'notification', {
        id: notification.id,
        title,
        message,
        type: 'Follow-Up Reminder',
        leadId: task.lead_id,
        userId: user.id,
        createdAt: notification.createdAt
      });

      // Send push notification via FCM
      try {
        const { sendPushNotification } = require('../lib/fcm');
        const fcmTokens = user.fcm_tokens;
        if (fcmTokens && Array.isArray(fcmTokens) && fcmTokens.length > 0) {
          sendPushNotification(fcmTokens, title, message, {
            type: 'Task Due Today',
            leadId: task.lead_id,
            taskId: task.id
          }).catch(err => console.error('[FCM] Background cron push error:', err));
        }
      } catch (fcmErr) {
        console.error('[FCM] Cron push setup error:', fcmErr);
      }

      // 3. Send Email Alert
      await sendEmail({
        to: user.email,
        subject: `[CRM] Follow-Up Reminder: ${task.title}`,
        text: `Hello ${user.name},\n\nThis is a reminder that the task "${task.title}" is due today.\n\nDescription: ${task.description || 'No description'}\nDue Date: ${task.due_date}\n\nPlease check your CRM dashboard to complete it.`,
        html: `<p>Hello <strong>${user.name}</strong>,</p><p>This is a reminder that the task <strong>"${task.title}"</strong> is due today.</p><p><strong>Description:</strong> ${task.description || 'No description'}<br/><strong>Due Date:</strong> ${task.due_date}</p><p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/leads/${task.lead_id}">Click here to view Lead details</a></p>`
      });
    }
  } catch (error) {
    console.error('[Cron] Error running daily follow-up cron:', error);
  }
}

/**
 * Runs hourly to check for overdue tasks
 */
async function runHourlyOverdueCron() {
  console.log('[Cron] Checking for overdue tasks...');
  try {
    const now = new Date();

    const tasks = await Task.findAll({
      where: {
        status: 'Pending',
        due_date: {
          [Op.lt]: now
        }
      },
      include: [
        { model: User, as: 'AssignedUser' },
        { model: Lead }
      ]
    });

    console.log(`[Cron] Found ${tasks.length} overdue tasks.`);

    for (const task of tasks) {
      const user = task.AssignedUser;
      if (!user) continue;

      // Check if we already sent an overdue notification in the last 24h to avoid spamming
      const existingNotification = await Notification.findOne({
        where: {
          user_id: user.id,
          lead_id: task.lead_id,
          type: 'Follow-Up Reminder',
          title: 'Overdue Task Alert',
          createdAt: {
            [Op.gt]: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      });

      if (existingNotification) {
        // Already alerted within last 24h, skip
        continue;
      }

      // 1. Create In-App Notification
      const title = 'Overdue Task Alert';
      const message = `Task "${task.title}" is OVERDUE. It was due at ${task.due_date.toLocaleString()}`;
      
      const notification = await Notification.create({
        company_id: task.company_id,
        user_id: user.id,
        lead_id: task.lead_id,
        title,
        message,
        type: 'Follow-Up Reminder',
        is_read: false
      });

      // 2. Broadcast via Socket.IO
      emitToCompany(task.company_id, 'notification', {
        id: notification.id,
        title,
        message,
        type: 'Follow-Up Reminder',
        leadId: task.lead_id,
        userId: user.id,
        createdAt: notification.createdAt
      });

      // Send push notification via FCM
      try {
        const { sendPushNotification } = require('../lib/fcm');
        const fcmTokens = user.fcm_tokens;
        if (fcmTokens && Array.isArray(fcmTokens) && fcmTokens.length > 0) {
          sendPushNotification(fcmTokens, title, message, {
            type: 'Task Overdue',
            leadId: task.lead_id,
            taskId: task.id
          }).catch(err => console.error('[FCM] Background cron push error:', err));
        }
      } catch (fcmErr) {
        console.error('[FCM] Cron push setup error:', fcmErr);
      }

      // 3. Send Email Alert
      await sendEmail({
        to: user.email,
        subject: `[CRM OVERDUE] Alert: ${task.title}`,
        text: `Hello ${user.name},\n\nThe task "${task.title}" assigned to you is now OVERDUE.\n\nDescription: ${task.description || 'No description'}\nDue Date: ${task.due_date}\n\nPlease update or complete the task in the CRM.`,
        html: `<p>Hello <strong>${user.name}</strong>,</p><p>The task <strong>"${task.title}"</strong> assigned to you is now <strong>OVERDUE</strong>.</p><p><strong>Description:</strong> ${task.description || 'No description'}<br/><strong>Due Date:</strong> ${task.due_date}</p><p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/leads/${task.lead_id}">Click here to open Lead details</a></p>`
      });
    }
  } catch (error) {
    console.error('[Cron] Error running hourly overdue cron:', error);
  }
}

module.exports = {
  runDailyFollowUpCron,
  runHourlyOverdueCron
};
