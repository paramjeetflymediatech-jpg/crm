const { NextResponse } = require('next/server');
const { User, Company } = require('../models');
const { verifyAccessToken } = require('./jwt');
const { parse } = require('cookie');

/**
 * API Guard wrapping handler routes with tenancy isolation, authentication, and RBAC
 */
function withApiAuth(handler, allowedRoles = []) {
  return async function (request, ...args) {
    try {
      let token = null;

      // 1. Extract token from Authorization Header or Cookies
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      } else {
        const cookieHeader = request.headers.get('cookie') || '';
        const cookies = parse(cookieHeader);
        token = cookies.accessToken || null;
      }

      if (!token) {
        return NextResponse.json({ error: 'Unauthorized: Authentication token required.' }, { status: 401 });
      }

      // 2. Verify JWT
      const decoded = verifyAccessToken(token);
      if (!decoded) {
        return NextResponse.json({ error: 'Unauthorized: Invalid or expired token.' }, { status: 401 });
      }

      // 3. Retrieve User from Database
      const user = await User.findByPk(decoded.id, {
        include: [{ model: Company }]
      });

      if (!user || user.status !== 'active') {
        return NextResponse.json({ error: 'Unauthorized: User account not found or deactivated.' }, { status: 401 });
      }

      // 4. Validate Company (Tenant)
      if (user.role !== 'super_admin') {
        if (!user.company_id || !user.Company) {
          return NextResponse.json({ error: 'Forbidden: User is not associated with any active company.' }, { status: 403 });
        }
        if (user.Company.status !== 'active') {
          return NextResponse.json({ error: 'Forbidden: Your company account has been suspended.' }, { status: 403 });
        }
      }

      // 5. Check Role Permissions
      if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        return NextResponse.json({ error: 'Forbidden: Insufficient permissions for this action.' }, { status: 403 });
      }

      // 6. Inject authenticated contexts into request context
      request.user = user;
      request.companyId = user.company_id;
      request.company = user.Company;

      return await handler(request, ...args);
    } catch (error) {
      console.error('API Auth Guard Exception:', error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  };
}

/**
 * API Key Guard specifically for WordPress Lead Integration
 */
function withApiKey(handler) {
  return async function (request, ...args) {
    try {
      let apiKey = null;

      // Extract API Key from Authorization Header or query param
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        apiKey = authHeader.substring(7);
      } else {
        const { searchParams } = new URL(request.url);
        apiKey = searchParams.get('api_key');
      }

      if (!apiKey) {
        return NextResponse.json({ error: 'Unauthorized: API Key is required.' }, { status: 401 });
      }

      // Identify Company by API Key
      const company = await Company.findOne({
        where: { api_key: apiKey }
      });

      if (!company) {
        return NextResponse.json({ error: 'Unauthorized: Invalid API Key.' }, { status: 401 });
      }

      if (company.status !== 'active') {
        return NextResponse.json({ error: 'Forbidden: Company account suspended.' }, { status: 403 });
      }

      // Inject company context
      request.companyId = company.id;
      request.company = company;

      return await handler(request, ...args);
    } catch (error) {
      console.error('API Key Guard Exception:', error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  };
}

module.exports = {
  withApiAuth,
  withApiKey
};
