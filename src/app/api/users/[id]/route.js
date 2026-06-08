const { NextResponse } = require('next/server');
const bcrypt = require('bcryptjs');
const { User, AuditLog } = require('@/models');
const { withApiAuth } = require('@/lib/apiGuard');

async function putHandler(request, { params }) {
  try {
    const { id } = await params;
    const currentUser = request.user;
    const companyId = request.companyId;

    if (currentUser.role === 'staff') {
      return NextResponse.json({ error: 'Forbidden: Staff cannot modify users.' }, { status: 403 });
    }

    const userToEdit = await User.findByPk(id);
    if (!userToEdit) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    // Tenant boundary check
    if (currentUser.role !== 'super_admin' && userToEdit.company_id !== companyId) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, role, status, phone, password } = body;

    // Build update payload
    const updatePayload = {};
    if (name) updatePayload.name = name;
    if (email) {
      // Check if email already in use
      const dupeUser = await User.findOne({ where: { email } });
      if (dupeUser && dupeUser.id !== userToEdit.id) {
        return NextResponse.json({ error: 'Email is already in use.' }, { status: 400 });
      }
      updatePayload.email = email;
    }
    if (role && currentUser.role === 'super_admin') {
      updatePayload.role = role;
    } else if (role && currentUser.role === 'company_admin') {
      // Company admins cannot promote someone to super admin
      if (role !== 'super_admin') {
        updatePayload.role = role;
      }
    }
    if (status) updatePayload.status = status;
    if (phone !== undefined) updatePayload.phone = phone;
    if (password && password.trim() !== '') {
      updatePayload.password = await bcrypt.hash(password, 10);
    }

    await userToEdit.update(updatePayload);

    // Audit Log
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    await AuditLog.create({
      company_id: userToEdit.company_id,
      user_id: currentUser.id,
      action: 'User Updated',
      module: 'Users',
      description: `User "${userToEdit.name}" modified by ${currentUser.name}.`,
      ip_address: ip
    });

    const responseUser = userToEdit.toJSON();
    delete responseUser.password;

    return NextResponse.json({
      success: true,
      message: 'User updated successfully.',
      user: responseUser
    });

  } catch (error) {
    console.error('PUT User Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

async function deleteHandler(request, { params }) {
  try {
    const { id } = await params;
    const currentUser = request.user;
    const companyId = request.companyId;

    if (currentUser.role === 'staff') {
      return NextResponse.json({ error: 'Forbidden: Staff cannot delete users.' }, { status: 403 });
    }

    const userToDelete = await User.findByPk(id);
    if (!userToDelete) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    // Tenant check
    if (currentUser.role !== 'super_admin' && userToDelete.company_id !== companyId) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    // Cannot self delete
    if (currentUser.id === userToDelete.id) {
      return NextResponse.json({ error: 'Conflict: You cannot delete your own account.' }, { status: 400 });
    }

    await userToDelete.destroy();

    // Audit Log
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    await AuditLog.create({
      company_id: userToDelete.company_id,
      user_id: currentUser.id,
      action: 'User Deleted',
      module: 'Users',
      description: `User "${userToDelete.name}" deleted by ${currentUser.name}.`,
      ip_address: ip
    });

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully.'
    });

  } catch (error) {
    console.error('DELETE User Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const PUT = withApiAuth(putHandler);
export const DELETE = withApiAuth(deleteHandler);
