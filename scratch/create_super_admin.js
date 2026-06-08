const { User } = require('../src/models');
const bcrypt = require('bcryptjs');

// Read command line parameters or default
const email = process.argv[2] || 'superadmin@crm.com';
const password = process.argv[3] || 'super123';
const name = process.argv[4] || 'Super Admin';

async function run() {
  console.log(`Attempting to provision Super Admin: ${name} (${email})...`);
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      console.log(`User "${email}" already exists. Role: "${existingUser.role}", Status: "${existingUser.status}".`);
      process.exit(0);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'super_admin',
      status: 'active'
    });

    console.log('--------------------------------------------------');
    console.log('🎉 Super Admin account created successfully!');
    console.log(`   Name:     ${name}`);
    console.log(`   Email:    ${email}`);
    console.log(`   Password: ${password}`);
    console.log('--------------------------------------------------');
    process.exit(0);
  } catch (err) {
    console.error('Error creating Super Admin:', err);
    process.exit(1);
  }
}

run();
