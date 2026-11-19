const { NextResponse } = require('next/server');
const path = require('path');
const fs = require('fs/promises');
const { parse } = require('cookie');
const { verifyAccessToken } = require('@/lib/jwt');

const MIME_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.wav': 'audio/wav',
  '.aac': 'audio/aac',
  '.ogg': 'audio/ogg',
  '.3gp': 'audio/3gpp',
  '.amr': 'audio/amr'
};

async function GET(request, { params }) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const fileSegments = resolvedParams?.file || [];
    const relativePath = fileSegments.join('/');

    // Security check: prevent directory traversal
    const safePath = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, '');
    const fullPath = path.join(process.cwd(), 'public', 'uploads', safePath);

    const uploadsBase = path.join(process.cwd(), 'public', 'uploads');
    if (!fullPath.startsWith(uploadsBase)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // RBAC: Restrict call audio recordings exclusively to super_admin and company_admin
    if (safePath.startsWith('call-recordings')) {
      let token = null;
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      } else {
        const cookieHeader = request.headers.get('cookie') || '';
        const cookies = parse(cookieHeader);
        token = cookies.accessToken || null;
      }

      if (!token) {
        return NextResponse.json({ error: 'Unauthorized: Authentication required to access call recordings.' }, { status: 401 });
      }

      const decoded = verifyAccessToken(token);
      if (!decoded || (decoded.role !== 'super_admin' && decoded.role !== 'company_admin')) {
        return NextResponse.json({ error: 'Forbidden: Only administrators can access call recordings.' }, { status: 403 });
      }
    }

    try {
      const fileBuffer = await fs.readFile(fullPath);
      const ext = path.extname(fullPath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=2592000, immutable',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('Uploads Serving Route Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

module.exports = { GET };

