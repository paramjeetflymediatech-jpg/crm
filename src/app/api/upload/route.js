const { NextResponse } = require('next/server');
const { withApiAuth } = require('@/lib/apiGuard');
const path = require('path');
const fs = require('fs/promises');

async function postHandler(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    // Check size limit: 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 5MB limit.' }, { status: 400 });
    }

    // Allowed image mime types
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/svg+xml'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only JPG, PNG, WebP, GIF, and SVG images are allowed.' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure uploads directory exists in public folder
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });

    // Derive safe extension
    let ext = path.extname(file.name);
    if (!ext) {
      if (file.type === 'image/png') ext = '.png';
      else if (file.type === 'image/webp') ext = '.webp';
      else if (file.type === 'image/svg+xml') ext = '.svg';
      else if (file.type === 'image/gif') ext = '.gif';
      else ext = '.jpg';
    }

    const safeBase = (file.name || 'image')
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .slice(0, 16);

    const filename = `${Date.now()}-${safeBase || 'avatar'}${ext}`;
    const filePath = path.join(uploadsDir, filename);

    await fs.writeFile(filePath, buffer);

    const publicUrl = `/uploads/${filename}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename
    });
  } catch (error) {
    console.error('File Upload Error:', error);
    return NextResponse.json({ error: 'Failed to upload image.' }, { status: 500 });
  }
}

export const POST = withApiAuth(postHandler);

