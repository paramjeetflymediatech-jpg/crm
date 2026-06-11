const { NextResponse } = require('next/server');
const { Company, User, Lead, LeadStatus, LeadSource, AuditLog } = require('@/models');
const { withApiAuth } = require('@/lib/apiGuard');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

async function getHandler(request) {
  try {
    const user = request.user;

    // Enforce Super Admin role
    if (user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden: Super Admin access required.' }, { status: 403 });
    }

    const companies = await Company.findAll({
      order: [['created_at', 'DESC']],
      include: [
        {
          model: User,
          attributes: ['id'],
          required: false
        }
      ]
    });

    // Enrich with lead counts
    const enriched = await Promise.all(companies.map(async (c) => {
      const leadCount = await Lead.count({ where: { company_id: c.id } });
      const userCount = c.Users ? c.Users.length : 0;
      return {
        ...c.toJSON(),
        lead_count: leadCount,
        user_count: userCount
      };
    }));

    return NextResponse.json({ companies: enriched });
  } catch (error) {
    console.error('GET Admin Companies Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}


async function postHandler(request) {
  try {
    const user = request.user;

    // Enforce Super Admin role
    if (user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden: Super Admin access required.' }, { status: 403 });
    }

    const body = await request.json();
    const { 
      company_name, 
      website, 
      email, 
      phone, 
      subscription_plan = 'free',
      admin_name, 
      admin_email, 
      admin_password 
    } = body;

    if (!company_name || !admin_name || !admin_email || !admin_password) {
      return NextResponse.json({ error: 'Missing required parameters. Company name, admin details are required.' }, { status: 400 });
    }

    // Check if admin email already in use
    const existingUser = await User.findOne({ where: { email: admin_email } });
    if (existingUser) {
      return NextResponse.json({ error: 'Administrator email is already in use.' }, { status: 400 });
    }

    // 1. Create Company
    const cleanCompanyName = company_name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const generatedApiKey = `${cleanCompanyName}_wp_key_${crypto.randomBytes(16).toString('hex')}`;

    const newCompany = await Company.create({
      company_name,
      website: website || null,
      email: email || null,
      phone: phone || null,
      api_key: generatedApiKey,
      subscription_plan,
      status: 'active'
    });

    // 2. Provision Company Admin User
    const hashedAdminPassword = await bcrypt.hash(admin_password, 10);
    const newAdmin = await User.create({
      company_id: newCompany.id,
      name: admin_name,
      email: admin_email,
      password: hashedAdminPassword,
      role: 'company_admin',
      status: 'active'
    });

    // 3. Seed Default Pipeline Statuses
    const defaultStatuses = [
      { name: 'New', color: '#3b82f6', sort_order: 1 },
      { name: 'Contacted', color: '#eab308', sort_order: 2 },
      { name: 'Qualified', color: '#10b981', sort_order: 3 },
      { name: 'Follow Up', color: '#a855f7', sort_order: 4 },
      { name: 'Proposal Sent', color: '#f97316', sort_order: 5 },
      { name: 'Converted', color: '#22c55e', sort_order: 6 },
      { name: 'Lost', color: '#ef4444', sort_order: 7 }
    ];

    for (const status of defaultStatuses) {
      await LeadStatus.create({
        ...status,
        company_id: newCompany.id
      });
    }

    // 4. Seed Default Lead Channels (Sources)
    const defaultSources = [
      'Contact Form',
      'Facebook Ads',
      'Google Ads',
      'Organic Search',
      'Referral'
    ];

    for (const source of defaultSources) {
      await LeadSource.create({
        source_name: source,
        company_id: newCompany.id
      });
    }

    // 5. Audit Log
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    await AuditLog.create({
      company_id: null,
      user_id: user.id,
      action: 'Company Created',
      module: 'Admin',
      description: `Tenant Company "${company_name}" created & provisioned with admin "${admin_email}" by ${user.name}.`,
      ip_address: ip
    });

    return NextResponse.json({
      success: true,
      message: 'Company tenant created and provisioned successfully.',
      company: newCompany,
      admin: {
        id: newAdmin.id,
        name: newAdmin.name,
        email: newAdmin.email
      }
    }, { status: 201 });

  } catch (error) {
    console.error('POST Admin Companies Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const GET = withApiAuth(getHandler);
export const POST = withApiAuth(postHandler);
