const { NextResponse } = require('next/server');
const { User } = require('@/models');
const { withApiAuth } = require('@/lib/apiGuard');

async function postHandler(request) {
  try {
    const user = request.user;
    const body = await request.json();
    const { token } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Device token is required' }, { status: 400 });
    }

    // Get current FCM tokens array
    let tokens = user.fcm_tokens;
    if (!tokens || !Array.isArray(tokens)) {
      tokens = [];
    }

    // Add token if it doesn't already exist
    if (!tokens.includes(token)) {
      tokens.push(token);
      // Sequelize requires updating the field and saving
      await user.update({ fcm_tokens: tokens });
    }

    return NextResponse.json({ success: true, message: 'Device token registered successfully', tokens });
  } catch (error) {
    console.error('POST Device Token Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

async function deleteHandler(request) {
  try {
    const user = request.user;
    const body = await request.json();
    const { token } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Device token is required' }, { status: 400 });
    }

    // Get current FCM tokens array
    let tokens = user.fcm_tokens;
    if (tokens && Array.isArray(tokens)) {
      const updatedTokens = tokens.filter(t => t !== token);
      if (updatedTokens.length !== tokens.length) {
        await user.update({ fcm_tokens: updatedTokens });
      }
    }

    return NextResponse.json({ success: true, message: 'Device token unregistered successfully' });
  } catch (error) {
    console.error('DELETE Device Token Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const POST = withApiAuth(postHandler);
export const DELETE = withApiAuth(deleteHandler);
