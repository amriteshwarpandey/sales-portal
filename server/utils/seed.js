/**
 * Seeds the database.
 *   npm run seed            -> creates the master admin (from MASTER_ADMIN_* env vars)
 *   npm run seed -- --demo  -> also adds a demo admin, employee, candidates and customers
 * Safe to run more than once: existing records are left alone.
 */
const config = require('../config/config');
const { connectDB, disconnectDB } = require('../config/database');
const Admin = require('../models/Admin');
const Counter = require('../models/Counter');
const Employee = require('../models/Employee');
const Candidate = require('../models/Candidate');
const Customer = require('../models/Customer');
const { hashPassword } = require('../controllers/accountController');
const { emailHash } = require('./security');

const MASTER_EMAIL = (process.env.MASTER_ADMIN_EMAIL || 'master@salesportal.local').toLowerCase();
const MASTER_PASSWORD = process.env.MASTER_ADMIN_PASSWORD || 'Master@12345';

async function ensureAdmin({ email, password, firstName, lastName, role }) {
  const existing = await Admin.findOne({ email });
  if (existing) {
    console.log(`  = ${role} ${email} already exists (${existing.adminId})`);
    return existing;
  }
  const seq = await Counter.next('adminId');
  const admin = await Admin.create({
    email,
    firstName,
    lastName,
    role,
    adminId: `ADM${seq}`,
    password: await hashPassword(password),
  });
  console.log(`  + ${role} ${email} / ${password} (${admin.adminId})`);
  return admin;
}

const DEMO_CANDIDATES = [
  ['Aarav', 'Sharma', 'IIT Delhi', 'Delhi', 'Computer Science', 'B.Tech', 2025, 'pending'],
  ['Diya', 'Patel', 'NIT Surat', 'Gujarat', 'Electronics', 'B.Tech', 2025, 'pending'],
  ['Kabir', 'Verma', 'BITS Pilani', 'Rajasthan', 'Mechanical', 'B.E.', 2024, 'shortlisted'],
  ['Ananya', 'Iyer', 'Anna University', 'Tamil Nadu', 'Information Technology', 'B.E.', 2025, 'shortlisted'],
  ['Rohan', 'Gupta', 'DTU', 'Delhi', 'Civil', 'B.Tech', 2023, 'discarded'],
  ['Meera', 'Nair', 'Christ University', 'Karnataka', 'Commerce', 'BBA', 2024, 'invited'],
];

const DEMO_CUSTOMERS = [
  ['Vikram', 'Singh', 'premium', 'paid', 5],
  ['Priya', 'Menon', 'standard', 'paid', 4],
  ['Arjun', 'Reddy', 'basic', 'paid', 3],
  ['Sneha', 'Kulkarni', 'standard', 'paid', 2],
  ['Rahul', 'Joshi', 'premium', 'paid', 1],
  ['Neha', 'Kapoor', 'basic', 'paid', 0],
  ['Karan', 'Malhotra', 'standard', 'pending', 0],
  ['Isha', 'Bose', 'premium', 'failed', 0],
];

async function seedDemo() {
  const admin = await ensureAdmin({
    email: 'admin@salesportal.local',
    password: 'Admin@12345',
    firstName: 'Riya',
    lastName: 'Kapoor',
    role: 'admin',
  });
  const by = `${admin.firstName} ${admin.lastName}`;

  for (const [firstName, lastName, college, state, branch, degree, passingYear, status] of DEMO_CANDIDATES) {
    const email = `${firstName}.${lastName}@example.com`.toLowerCase();
    if (await Candidate.exists({ email })) continue;
    await Candidate.create({
      firstName,
      lastName,
      email,
      phone: '98765' + String(Math.floor(10000 + Math.random() * 89999)),
      college,
      state,
      branch,
      degree,
      passingYear,
      emailHash: emailHash(email),
      status,
      actionBy: status === 'pending' ? undefined : by,
      statusHistory: [{ status: 'pending', by: 'applicant' }, ...(status === 'pending' ? [] : [{ status, by }])],
    });
  }
  console.log(`  + ${DEMO_CANDIDATES.length} demo candidates`);

  let employee = await Employee.findOne({ email: 'employee@salesportal.local' });
  if (!employee) {
    const candidate = await Candidate.create({
      firstName: 'Aditya',
      lastName: 'Rao',
      email: 'employee@salesportal.local',
      phone: '9876500001',
      college: 'VIT Vellore',
      state: 'Tamil Nadu',
      branch: 'Computer Science',
      degree: 'B.Tech',
      passingYear: 2024,
      emailHash: emailHash('employee@salesportal.local'),
      status: 'employee',
      actionBy: by,
      statusHistory: [{ status: 'pending', by: 'applicant' }, { status: 'employee', by }],
    });
    employee = await Employee.create({
      firstName: 'Aditya',
      lastName: 'Rao',
      email: 'employee@salesportal.local',
      phone: '9876500001',
      college: 'VIT Vellore',
      state: 'Tamil Nadu',
      branch: 'Computer Science',
      degree: 'B.Tech',
      passingYear: 2024,
      candidate: candidate._id,
      referralId: 'EMPDEMO1',
      createdBy: by,
      password: await hashPassword('Employee@123'),
    });
    console.log('  + employee employee@salesportal.local / Employee@123 (referral EMPDEMO1)');
  } else {
    console.log('  = employee employee@salesportal.local already exists');
  }

  if (!(await Customer.exists({ referralId: employee.referralId }))) {
    for (const [firstName, lastName, plan, paymentStatus, monthsAgo] of DEMO_CUSTOMERS) {
      const paidAt = new Date();
      paidAt.setMonth(paidAt.getMonth() - monthsAgo);
      await Customer.create({
        firstName,
        lastName,
        email: `${firstName}.${lastName}@example.com`.toLowerCase(),
        phone: '91234' + String(Math.floor(10000 + Math.random() * 89999)),
        city: 'Bengaluru',
        referralId: employee.referralId,
        employee: employee._id,
        plan,
        amount: config.plans[plan].amount,
        paymentStatus,
        payment:
          paymentStatus === 'paid'
            ? { transactionId: `txn_demo_${firstName.toLowerCase()}`, method: 'card', paidAt, confirmedBy: 'mock' }
            : undefined,
        createdAt: paidAt,
      });
    }
    employee.totalCustomers = await Customer.countDocuments({ referralId: employee.referralId });
    await employee.save();
    console.log(`  + ${DEMO_CUSTOMERS.length} demo customers`);
  }
}

async function main() {
  await connectDB(config.mongoUri);
  console.log('[seed] master admin');
  await ensureAdmin({
    email: MASTER_EMAIL,
    password: MASTER_PASSWORD,
    firstName: 'Master',
    lastName: 'Admin',
    role: 'masteradmin',
  });
  if (process.argv.includes('--demo')) {
    console.log('[seed] demo data');
    await seedDemo();
  }
  await disconnectDB();
  console.log('[seed] done');
}

main().catch(async (error) => {
  console.error('[seed] failed:', error);
  await disconnectDB();
  process.exit(1);
});
