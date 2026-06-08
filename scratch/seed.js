const { Company, User, Lead, LeadActivity, LeadNote, Task, Notification } = require('../src/models');

async function seedDummyData() {
  console.log('Starting dummy data database seeder...');
  try {
    // 1. Fetch Company
    const company = await Company.findOne();
    if (!company) {
      console.error('No company tenant found in database. Run npm run dev first to initialize.');
      process.exit(1);
    }
    const companyId = company.id;

    // 2. Fetch Users
    const adminUser = await User.findOne({ where: { company_id: companyId, role: 'company_admin' } });
    const staffUser = await User.findOne({ where: { company_id: companyId, role: 'staff' } });

    if (!adminUser || !staffUser) {
      console.error('Initial users not found. Run npm run dev first.');
      process.exit(1);
    }

    console.log(`Using Company: ${company.company_name} (ID: ${companyId})`);
    console.log(`Admin User: ${adminUser.name} (ID: ${adminUser.id})`);
    console.log(`Staff User: ${staffUser.name} (ID: ${staffUser.id})`);

    // 3. Clear existing leads to prevent cluttering or duplication
    console.log('Clearing old leads...');
    await Lead.destroy({ where: { company_id: companyId } });
    console.log('Old leads cleared.');

    // 4. Custom Leads List spread across past months (up to June 2026)
    const dummyLeads = [
      // January
      {
        first_name: 'David', last_name: 'Miller', email: 'david.m@example.com', phone: '+1 312 555 1201',
        source: 'Google Ads', status: 'Converted', priority: 'High', subject: 'Commercial Paint quote',
        message: 'Looking for a painting quotation for a 3-story warehouse building.',
        created_at: new Date('2026-01-12T10:00:00Z'), assigned_to: staffUser.id, lead_score: 95
      },
      {
        first_name: 'Emma', last_name: 'Watson', email: 'emma.w@example.com', phone: '+1 415 555 9011',
        source: 'Facebook Ads', status: 'Lost', priority: 'Low', subject: 'Residential consultation',
        message: 'Need general pricing list.',
        created_at: new Date('2026-01-20T14:30:00Z'), assigned_to: adminUser.id, lead_score: 25
      },
      // February
      {
        first_name: 'Sarah', last_name: 'Connor', email: 'connor.s@example.com', phone: '+1 206 555 4911',
        source: 'Contact Form', status: 'Converted', priority: 'High', subject: 'Roofing Repair urgent',
        message: 'Leaking ceiling needs inspection today.',
        created_at: new Date('2026-02-05T09:15:00Z'), assigned_to: staffUser.id, lead_score: 100
      },
      {
        first_name: 'Michael', last_name: 'Scott', email: 'michael.s@dundermifflin.com', phone: '+1 570 555 1212',
        source: 'Organic Search', status: 'Qualified', priority: 'Medium', subject: 'Paper Supply Agreement',
        message: 'Need a customized quote for regular corporate supply.',
        created_at: new Date('2026-02-18T11:45:00Z'), assigned_to: null, lead_score: 60
      },
      // March
      {
        first_name: 'Robert', last_name: 'Downey', email: 'robert@stark.com', phone: '+1 212 555 3000',
        source: 'Referral', status: 'Converted', priority: 'High', subject: 'Smart Home Installation',
        message: 'Need automated systems fitted in my penthouse.',
        created_at: new Date('2026-03-10T16:20:00Z'), assigned_to: staffUser.id, lead_score: 98
      },
      {
        first_name: 'Pam', last_name: 'Beesly', email: 'pam.b@dundermifflin.com', phone: '+1 570 555 3434',
        source: 'Google Ads', status: 'Proposal Sent', priority: 'Medium', subject: 'Office decoration quotation',
        message: 'Looking for local contractors to repaint lobby area.',
        created_at: new Date('2026-03-22T10:10:00Z'), assigned_to: adminUser.id, lead_score: 75
      },
      // April
      {
        first_name: 'John', last_name: 'Wick', email: 'babayaga@continental.com', phone: '+1 212 555 9900',
        source: 'Referral', status: 'Converted', priority: 'High', subject: 'Concrete Flooring quotes',
        message: 'Need heavy-duty basement sealing.',
        created_at: new Date('2026-04-02T13:40:00Z'), assigned_to: staffUser.id, lead_score: 90
      },
      {
        first_name: 'Walter', last_name: 'White', email: 'heisenberg@savewalterwhite.com', phone: '+1 505 555 4242',
        source: 'Facebook Ads', status: 'Lost', priority: 'Medium', subject: 'Lab HVAC renovation',
        message: 'Specialized air filtration quote request.',
        created_at: new Date('2026-04-14T08:00:00Z'), assigned_to: staffUser.id, lead_score: 30
      },
      {
        first_name: 'Jesse', last_name: 'Pinkman', email: 'jesse.p@example.com', phone: '+1 505 555 9182',
        source: 'Organic Search', status: 'Qualified', priority: 'Low', subject: 'Drywall Repair',
        message: 'Broke a wall, need it patched next week.',
        created_at: new Date('2026-04-28T15:15:00Z'), assigned_to: adminUser.id, lead_score: 55
      },
      // May
      {
        first_name: 'Clark', last_name: 'Kent', email: 'ckent@dailyplanet.com', phone: '+1 312 555 0192',
        source: 'Referral', status: 'Converted', priority: 'High', subject: 'Apartment refurbishment',
        message: 'Refurbishing historical flat in Metropolis.',
        created_at: new Date('2026-05-04T10:30:00Z'), assigned_to: staffUser.id, lead_score: 85
      },
      {
        first_name: 'Lois', last_name: 'Lane', email: 'llane@dailyplanet.com', phone: '+1 312 555 0193',
        source: 'Google Ads', status: 'Proposal Sent', priority: 'Medium', subject: 'Kitchen renovation quote',
        message: 'Replacing old countertops and cabinets.',
        created_at: new Date('2026-05-15T14:00:00Z'), assigned_to: staffUser.id, lead_score: 70
      },
      {
        first_name: 'Bruce', last_name: 'Banner', email: 'hulk@avengers.org', phone: '+1 650 555 0100',
        source: 'Contact Form', status: 'Contacted', priority: 'High', subject: 'Debris clean-up consultation',
        message: 'Looking for commercial site clean-up pricing.',
        created_at: new Date('2026-05-24T09:25:00Z'), assigned_to: staffUser.id, lead_score: 40
      },
      // June
      {
        first_name: 'Tony', last_name: 'Stark', email: 'tony@stark.com', phone: '+1 212 555 3001',
        source: 'Facebook Ads', status: 'Converted', priority: 'High', subject: 'Garage Ventilation',
        message: 'Custom exhaust routing system request.',
        created_at: new Date('2026-06-01T11:00:00Z'), assigned_to: staffUser.id, lead_score: 95
      },
      {
        first_name: 'Peter', last_name: 'Parker', email: 'spidey@dailybugle.com', phone: '+1 718 555 1928',
        source: 'Google Ads', status: 'New', priority: 'Low', subject: 'Camera rig brackets install',
        message: 'Need custom metal brackets welded to brick structures.',
        created_at: new Date('2026-06-03T16:45:00Z'), assigned_to: null, lead_score: 45
      },
      {
        first_name: 'Diana', last_name: 'Prince', email: 'diana@themyscira.gov', phone: '+1 202 555 0188',
        source: 'Contact Form', status: 'Follow Up', priority: 'High', subject: 'Museum Security Upgrade',
        message: 'Need shatterproof display glass quotes.',
        created_at: new Date('2026-06-05T10:15:00Z'), assigned_to: staffUser.id, lead_score: 90,
        follow_up_date: new Date('2026-06-08T15:00:00Z') // Due today!
      },
      {
        first_name: 'Arthur', last_name: 'Curry', email: 'aquaman@atlantis.org', phone: '+1 207 555 0177',
        source: 'Organic Search', status: 'New', priority: 'Medium', subject: 'Dock Seawall Repair',
        message: 'Seawall showing cracks. Needs inspection.',
        created_at: new Date('2026-06-07T08:30:00Z'), assigned_to: staffUser.id, lead_score: 50,
        follow_up_date: new Date('2026-06-09T10:00:00Z') // Due tomorrow!
      },
      {
        first_name: 'Barry', last_name: 'Allen', email: 'flash@star-labs.com', phone: '+1 512 555 0144',
        source: 'Referral', status: 'New', priority: 'Low', subject: 'Treadmill assembly',
        message: 'Need a heavy-duty professional treadmill assembled.',
        created_at: new Date('2026-06-08T09:00:00Z'), assigned_to: adminUser.id, lead_score: 35
      }
    ];

    console.log('Creating lead records...');
    for (const data of dummyLeads) {
      const createdLead = await Lead.create({
        ...data,
        company_id: companyId,
        // Override timestamps
        createdAt: data.created_at,
        updatedAt: data.created_at
      });

      // 5. Seed Activities
      await LeadActivity.create({
        lead_id: createdLead.id,
        user_id: null,
        action: 'Lead Created',
        description: `Lead synced automatically via ${createdLead.source}.`,
        createdAt: createdLead.createdAt
      });

      if (createdLead.status !== 'New') {
        await LeadActivity.create({
          lead_id: createdLead.id,
          user_id: adminUser.id,
          action: 'Status Updated',
          description: `Lead status updated to "${createdLead.status}" during processing.`,
          createdAt: new Date(createdLead.createdAt.getTime() + 2 * 60 * 60 * 1000)
        });
      }

      // 6. Seed Notes
      if (createdLead.status === 'Converted' || createdLead.status === 'Proposal Sent') {
        await LeadNote.create({
          lead_id: createdLead.id,
          user_id: staffUser.id,
          note: 'Contacted client. Discussed project options and agreed on the initial estimates.',
          createdAt: new Date(createdLead.createdAt.getTime() + 1 * 60 * 60 * 1000)
        });
        await LeadNote.create({
          lead_id: createdLead.id,
          user_id: adminUser.id,
          note: 'Sent official proposal PDF via email. Awaiting feedback.',
          createdAt: new Date(createdLead.createdAt.getTime() + 2 * 24 * 60 * 60 * 1000)
        });
      }

      // 7. Seed Tasks
      if (createdLead.status === 'Follow Up') {
        await Task.create({
          company_id: companyId,
          lead_id: createdLead.id,
          assigned_to: staffUser.id,
          title: 'Schedule Site Inspection',
          description: 'Call client to verify times for dock/museum measurements.',
          due_date: createdLead.follow_up_date,
          status: 'Pending'
        });
      } else if (createdLead.status === 'Converted') {
        await Task.create({
          company_id: companyId,
          lead_id: createdLead.id,
          assigned_to: staffUser.id,
          title: 'Follow-up Call',
          description: 'Contract signing check.',
          due_date: new Date(createdLead.createdAt.getTime() + 5 * 24 * 60 * 60 * 1000),
          status: 'Completed'
        });
      }
    }

    // 8. Create some past overdue tasks
    const overdueLead = await Lead.findOne({ where: { first_name: 'Lois' } });
    if (overdueLead) {
      await Task.create({
        company_id: companyId,
        lead_id: overdueLead.id,
        assigned_to: staffUser.id,
        title: 'Send Revised Quote',
        description: 'Lois requested kitchen island changes.',
        due_date: new Date('2026-06-04T09:00:00Z'), // Past date (overdue!)
        status: 'Pending'
      });
    }

    console.log('Seeder script executed successfully! 17 Leads, Activities, Notes, and Tasks seeded.');
    process.exit(0);

  } catch (error) {
    console.error('Seeder execution crash:', error);
    process.exit(1);
  }
}

seedDummyData();
