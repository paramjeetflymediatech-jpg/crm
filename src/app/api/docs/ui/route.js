import { NextResponse } from 'next/server';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function GET() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CRM API Documentation</title>
  <meta name="description" content="CRM SaaS REST API Documentation — Interactive Swagger UI" />
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; }
    
    .topbar { 
      background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
      padding: 16px 24px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 2px 10px rgba(79, 70, 229, 0.3);
    }
    .topbar-logo {
      width: 32px; height: 32px;
      background: rgba(255,255,255,0.2);
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px;
    }
    .topbar h1 { color: white; font-size: 18px; font-weight: 700; }
    .topbar span { color: rgba(255,255,255,0.7); font-size: 13px; }
    .topbar-right { margin-left: auto; }
    .topbar-right a {
      color: rgba(255,255,255,0.85); font-size: 13px; text-decoration: none;
      padding: 6px 14px; border: 1px solid rgba(255,255,255,0.3);
      border-radius: 6px; transition: all 0.15s;
    }
    .topbar-right a:hover { background: rgba(255,255,255,0.15); color: white; }

    #swagger-ui { max-width: 1200px; margin: 0 auto; padding: 24px 16px; }
    
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { border-bottom: 1px solid #e2e8f0; padding-bottom: 20px; }
    .swagger-ui .info .title { color: #1e293b; font-size: 26px; }
    .swagger-ui .info .description { color: #475569; }
    .swagger-ui .scheme-container { background: #f8fafc; border-radius: 8px; }
    
    .swagger-ui .opblock.opblock-post .opblock-summary { border-color: #10b981; }
    .swagger-ui .opblock.opblock-get .opblock-summary { border-color: #3b82f6; }
    .swagger-ui .opblock.opblock-put .opblock-summary { border-color: #f59e0b; }
    .swagger-ui .opblock.opblock-delete .opblock-summary { border-color: #ef4444; }
    
    .swagger-ui .btn.authorize { background: #4f46e5 !important; border-color: #4f46e5 !important; }
    .swagger-ui .btn.execute { background: #4f46e5 !important; border-color: #4f46e5 !important; }
  </style>
</head>
<body>
  <div class="topbar">
    <div class="topbar-logo">📋</div>
    <div>
      <h1>CRM SaaS API</h1>
      <span>Interactive REST API Documentation</span>
    </div>
    <div class="topbar-right">
      <a href="${APP_URL}/dashboard">← Back to CRM</a>
    </div>
  </div>

  <div id="swagger-ui"></div>

  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: '${APP_URL}/api/docs',
        dom_id: '#swagger-ui',
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [SwaggerUIBundle.plugins.DownloadUrl],
        layout: 'StandaloneLayout',
        deepLinking: true,
        displayOperationId: false,
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 1,
        docExpansion: 'list',
        filter: true,
        showExtensions: false,
        showCommonExtensions: false,
        persistAuthorization: true,
        tryItOutEnabled: true
      });
    };
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' }
  });
}
