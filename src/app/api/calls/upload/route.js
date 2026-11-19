const { NextResponse } = require('next/server');
const { withApiAuth } = require('@/lib/apiGuard');
const { CallLog, Lead, LeadActivity, User } = require('@/models');
const { getIo } = require('@/socket/socketServer');
const path = require('path');
const fs = require('fs/promises');

async function postHandler(request) {
  try {
    const user = request.user;
    const companyId = request.companyId;

    const formData = await request.formData();
    const file = formData.get('file');
    const inputLeadId = formData.get('lead_id') || formData.get('leadId');
    const phoneNumber = formData.get('phone_number') || formData.get('phoneNumber');
    const fromNumber = formData.get('from_number') || formData.get('fromNumber') || user.phone || '';
    const duration = parseInt(formData.get('duration') || '0', 10);
    const direction = formData.get('direction') || 'outbound';
    const status = formData.get('status') || 'completed';
    const leadStatus = formData.get('lead_status') || formData.get('leadStatus');
    const notes = formData.get('notes') || '';

    // 1. Resolve Target Lead
    let targetLead = null;
    if (inputLeadId) {
      targetLead = await Lead.findByPk(inputLeadId);
      if (targetLead && user.role !== 'super_admin' && targetLead.company_id !== companyId) {
        return NextResponse.json({ error: 'Unauthorized: Lead does not belong to your company.' }, { status: 403 });
      }
    } else if (phoneNumber) {
      const cleanPhone = phoneNumber.replace(/[^0-9]/g, '').slice(-10);
      if (cleanPhone.length >= 7) {
        targetLead = await Lead.findOne({
          where: {
            company_id: companyId,
            phone: cleanPhone
          }
        });
      }
    }

    // 2. Handle Audio Recording File (if provided)
    let recordingUrl = null;
    if (file && typeof file !== 'string') {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'call-recordings');
      await fs.mkdir(uploadDir, { recursive: true });

      // Determine extension
      let ext = path.extname(file.name || '');
      if (!ext) {
        const type = file.type || '';
        if (type.includes('mp4') || type.includes('m4a')) ext = '.m4a';
        else if (type.includes('wav')) ext = '.wav';
        else if (type.includes('3gp') || type.includes('3gpp')) ext = '.3gp';
        else if (type.includes('amr')) ext = '.amr';
        else if (type.includes('ogg')) ext = '.ogg';
        else ext = '.mp3';
      }

      const safeBase = (file.name || 'recording')
        .replace(/\.[^/.]+$/, '')
        .replace(/[^a-zA-Z0-9_-]/g, '')
        .slice(0, 16);

      const filename = `call-${Date.now()}-${safeBase || 'audio'}${ext}`;
      const filePath = path.join(uploadDir, filename);

      const bytes = await file.arrayBuffer();
      await fs.writeFile(filePath, Buffer.from(bytes));

      recordingUrl = `/uploads/call-recordings/${filename}`;
    }

    const effectivePhone = phoneNumber || targetLead?.phone || 'Unknown';

    // 3. Create CallLog Entry
    const callLog = await CallLog.create({
      company_id: companyId,
      lead_id: targetLead ? targetLead.id : null,
      user_id: user.id,
      from_number: fromNumber,
      to_number: effectivePhone,
      direction,
      duration,
      status,
      recording_url: recordingUrl,
      notes: notes || null
    });

    // 4. Update Lead & Log Activity
    if (targetLead) {
      const durationText = duration > 0 ? ` (${Math.floor(duration / 60)}m ${duration % 60}s)` : '';
      const recText = recordingUrl ? ' • Audio recording attached' : '';
      const noteText = notes ? ` • Note: "${notes}"` : '';

      await LeadActivity.create({
        lead_id: targetLead.id,
        user_id: user.id,
        action: 'Call Logged',
        description: `${direction === 'outbound' ? 'Outbound' : 'Inbound'} SIM call logged by ${user.name}${durationText} • Status: ${status}${recText}${noteText}`
      });

      // Update lead status if user selected a new status in the post-call modal
      if (leadStatus && leadStatus !== targetLead.status) {
        const oldStatus = targetLead.status;
        await targetLead.update({ status: leadStatus });
        await LeadActivity.create({
          lead_id: targetLead.id,
          user_id: user.id,
          action: 'Status Changed',
          description: `Status changed from ${oldStatus} to ${leadStatus} after call.`
        });
      }
    }

    // 5. Emit real-time Socket event to Web Dashboard
    try {
      const io = getIo();
      if (io) {
        io.to(`company_${companyId}`).emit('call_logged', {
          leadId: targetLead ? targetLead.id : null,
          callLog,
          user: { id: user.id, name: user.name, avatar: user.avatar }
        });
      }
    } catch (e) {
      // Socket emission failure shouldn't fail HTTP request
    }

    return NextResponse.json({
      success: true,
      message: 'Call record saved successfully.',
      callLog
    });
  } catch (error) {
    console.error('Call upload route error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to save call record.'
    }, { status: 500 });
  }
}

export const POST = withApiAuth(postHandler);
