const { NextResponse } = require('next/server');
const { Company, AuditLog } = require('@/models');
const { withApiAuth } = require('@/lib/apiGuard');

async function putHandler(request, { params }) {
  try {
    const { id } = await params;
    const currentUser = request.user;

    // Enforce Super Admin
    if (currentUser.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden: Super Admin access required.' }, { status: 403 });
    }

    const company = await Company.findByPk(id);
    if (!company) {
      return NextResponse.json({ error: 'Company not found.' }, { status: 404 });
    }

    const body = await request.json();
    const { company_name, website, email, phone, subscription_plan, status } = body;

    // Track status modifications
    const changedFields = [];
    if (status && status !== company.status) {
      changedFields.push(`status updated from "${company.status}" to "${status}"`);
    }
    if (subscription_plan && subscription_plan !== company.subscription_plan) {
      changedFields.push(`subscription updated from "${company.subscription_plan}" to "${subscription_plan}"`);
    }

    await company.update({
      company_name: company_name || company.company_name,
      website: website !== undefined ? website : company.website,
      email: email !== undefined ? email : company.email,
      phone: phone !== undefined ? phone : company.phone,
      subscription_plan: subscription_plan || company.subscription_plan,
      status: status || company.status
    });

    // Write audit log
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    await AuditLog.create({
      company_id: company.id,
      user_id: currentUser.id,
      action: 'Company Status Updated',
      module: 'Admin',
      description: `Company "${company.company_name}" updated by ${currentUser.name}: ${changedFields.join(', ') || 'No plan changes'}.`,
      ip_address: ip
    });

    return NextResponse.json({
      success: true,
      message: 'Company settings updated successfully.',
      company
    });

  } catch (error) {
    console.error('PUT Admin Company Detail Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const PUT = withApiAuth(putHandler);
