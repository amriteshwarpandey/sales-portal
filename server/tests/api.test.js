/**
 * Integration tests: run the real app against a throwaway MongoDB database.
 *   npm test   (uses MONGO_TEST_URI, default mongodb://127.0.0.1:27017/salesportal_test)
 */
process.env.NODE_ENV = 'test';

const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const request = require('supertest');
const { createApp } = require('../app');
const Admin = require('../models/Admin');
const Counter = require('../models/Counter');
const { hashPassword } = require('../controllers/accountController');
const { outbox } = require('../utils/sendEmail');

const TEST_URI = process.env.MONGO_TEST_URI || 'mongodb://127.0.0.1:27017/salesportal_test';
const app = createApp();

/** A cookie-keeping client, like a browser session. */
const session = () => request.agent(app);
const lastEmailTo = (to) => [...outbox].reverse().find((mail) => mail.to === to);

let master;
let admin;
let adminUser;
let employee;
let employeeUser;
let employeePassword;
let candidateId;

before(async () => {
  await mongoose.connect(TEST_URI);
  await mongoose.connection.dropDatabase();
  const seq = await Counter.next('adminId');
  await Admin.create({
    firstName: 'Master',
    lastName: 'Admin',
    email: 'master@test.local',
    adminId: `ADM${seq}`,
    role: 'masteradmin',
    password: await hashPassword('Master@12345'),
  });
});

after(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe('admin accounts', () => {
  test('master admin logs in with a cookie and a token', async () => {
    master = session();
    const res = await master.post('/api/admin/login').send({ email: 'master@test.local', password: 'Master@12345' });
    assert.equal(res.status, 200);
    assert.equal(res.body.role, 'masteradmin');
    assert.ok(res.body.token);
    assert.match(res.headers['set-cookie'][0], /token=.*HttpOnly.*SameSite=Strict/i);
    assert.equal(res.body.user.password, undefined);
  });

  test('wrong password is 401, unknown email is 400', async () => {
    const bad = await request(app).post('/api/admin/login').send({ email: 'master@test.local', password: 'nope' });
    assert.equal(bad.status, 401);
    const unknown = await request(app).post('/api/admin/login').send({ email: 'x@test.local', password: 'nope' });
    assert.equal(unknown.status, 400);
  });

  test('only the master admin can register admins', async () => {
    const anon = await request(app)
      .post('/api/admin/register')
      .send({ firstName: 'A', lastName: 'B', email: 'a@test.local', password: 'Password1!' });
    assert.equal(anon.status, 401);

    const res = await master
      .post('/api/admin/register')
      .send({ firstName: 'Riya', lastName: 'Kapoor', email: 'riya@test.local', password: 'Admin@12345' });
    assert.equal(res.status, 201);
    assert.match(res.body.admin.adminId, /^ADM\d+$/);
    adminUser = res.body.admin;

    const dup = await master
      .post('/api/admin/register')
      .send({ firstName: 'R', lastName: 'K', email: 'riya@test.local', password: 'Admin@12345' });
    assert.equal(dup.status, 409);
  });

  test('admin logs in with their admin ID and can only read their own record', async () => {
    admin = session();
    const res = await admin.post('/api/admin/login').send({ email: adminUser.adminId, password: 'Admin@12345' });
    assert.equal(res.status, 200);
    assert.equal(res.body.role, 'admin');

    assert.equal((await admin.get(`/api/admin/${adminUser._id}`)).status, 200);
    const masterRecord = (await master.get('/api/admin/fetchadmin')).body.admins.find((a) => a.role === 'masteradmin');
    assert.equal((await admin.get(`/api/admin/${masterRecord._id}`)).status, 403);
    assert.equal((await admin.delete(`/api/admin/${masterRecord._id}`)).status, 403);
  });

  test('email change needs password, then OTP, then the update', async () => {
    const id = adminUser._id;
    assert.equal((await admin.put(`/api/admin/updateEmail/${id}`).send({ newEmail: 'new@test.local' })).status, 403);
    assert.equal((await admin.post(`/api/admin/checkPass/${id}`).send({ currentPassword: 'wrong' })).status, 401);

    const sent = await admin.post(`/api/admin/checkPass/${id}`).send({ currentPassword: 'Admin@12345' });
    assert.equal(sent.status, 200);
    const otp = lastEmailTo('riya@test.local').html.match(/\b\d{6}\b/)[0];

    assert.equal((await admin.post(`/api/admin/otp/${id}`).send({ OTP: '000000' })).status, 401);
    assert.equal((await admin.post(`/api/admin/otp/${id}`).send({ OTP: otp })).status, 200);
    // OTPs are single use
    assert.equal((await admin.post(`/api/admin/otp/${id}`).send({ OTP: otp })).status, 404);

    const same = await admin.put(`/api/admin/updateEmail/${id}`).send({ newEmail: 'riya@test.local' });
    assert.equal(same.status, 400);
    const res = await admin.put(`/api/admin/updateEmail/${id}`).send({ newEmail: 'riya.k@test.local' });
    assert.equal(res.status, 200);
    assert.equal(res.body.user.email, 'riya.k@test.local');
  });

  test('password change re-checks the current password', async () => {
    const id = adminUser._id;
    assert.equal((await admin.post(`/api/admin/checkpass-pass/${id}`).send({ currentPassword: 'Admin@12345' })).status, 200);
    const noCurrent = await admin.put(`/api/admin/passupdate/${id}`).send({ newPassword: 'Changed@123' });
    assert.equal(noCurrent.status, 401);
    const res = await admin
      .put(`/api/admin/passupdate/${id}`)
      .send({ currentPassword: 'Admin@12345', newPassword: 'Changed@123' });
    assert.equal(res.status, 200);
    const relogin = await request(app).post('/api/admin/login').send({ email: 'riya.k@test.local', password: 'Changed@123' });
    assert.equal(relogin.status, 200);
  });
});

describe('candidate pipeline', () => {
  const application = {
    firstName: 'Aarav',
    lastName: 'Sharma',
    email: 'aarav@test.local',
    phone: '9876543210',
    college: 'IIT Delhi',
    state: 'Delhi',
    branch: 'CSE',
    degree: 'B.Tech',
    passingYear: 2025,
  };

  test('anyone can apply; duplicates and missing fields are rejected', async () => {
    const res = await request(app).post('/api/candidate').send(application);
    assert.equal(res.status, 200);
    candidateId = res.body.candidate._id;

    assert.equal((await request(app).post('/api/candidate').send(application)).status, 409);
    assert.equal((await request(app).post('/api/candidate').send({ firstName: 'x' })).status, 400);
  });

  test('candidate data is admin-only', async () => {
    assert.equal((await request(app).get(`/api/candidate/${candidateId}`)).status, 401);
    const res = await admin.get(`/api/candidate/admin-candidate/${adminUser._id}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.candidates.length, 1);
    assert.equal(res.body.counts.pending, 1);
  });

  test('shortlist, reject a repeat, and list by status', async () => {
    const res = await admin.post(`/api/candidate/shortlist/${adminUser._id}`).send({ candidateId });
    assert.equal(res.status, 200);
    assert.equal(res.body.candidate.status, 'shortlisted');
    assert.equal(res.body.candidate.actionBy, 'Riya Kapoor');

    assert.equal((await admin.post(`/api/candidate/shortlist/${adminUser._id}`).send({ candidateId })).status, 400);
    const list = await admin.post('/api/candidate/shortlisted');
    assert.equal(list.body.candidates.length, 1);
  });

  test('an admin cannot act under another admin ID', async () => {
    const other = await master.get('/api/admin/fetchadmin');
    const masterId = other.body.admins.find((a) => a.role === 'masteradmin')._id;
    assert.equal((await admin.post(`/api/candidate/discard/${masterId}`).send({ candidateId })).status, 403);
  });

  test('bulk invite emails a resume link, and the candidate submits a resume', async () => {
    const res = await admin.post('/api/candidate/sendemail');
    assert.equal(res.status, 200);
    assert.equal(res.body.sent, 1);

    const link = lastEmailTo('aarav@test.local').html.match(/\/submission\/([a-f0-9]{64})/);
    assert.ok(link, 'invite email contains a submission link');
    const hash = link[1];

    assert.equal((await request(app).get(`/api/candidate/submission/${hash}`)).body.firstName, 'Aarav');
    const mismatch = await request(app)
      .post(`/api/candidate/submission/${hash}`)
      .send({ email: 'someone@else.com', resumeLink: 'https://example.com/cv.pdf' });
    assert.equal(mismatch.status, 400);
    const badUrl = await request(app)
      .post(`/api/candidate/submission/${hash}`)
      .send({ email: 'aarav@test.local', resumeLink: 'javascript:alert(1)' });
    assert.equal(badUrl.status, 400);
    const ok = await request(app)
      .post(`/api/candidate/submission/${hash}`)
      .send({ email: 'aarav@test.local', resumeLink: 'https://example.com/cv.pdf' });
    assert.equal(ok.status, 200);
  });

  test('converting a candidate creates an employee and emails credentials', async () => {
    const res = await admin.post(`/api/candidate/employee/${adminUser._id}`).send({ candidateId });
    assert.equal(res.status, 200);
    assert.equal(res.body.candidate.status, 'employee');
    employeeUser = res.body.employee;
    assert.match(employeeUser.referralId, /^EMP[A-Z0-9]{6}$/);

    const mail = lastEmailTo('aarav@test.local');
    employeePassword = mail.html.match(/Temporary password: <b>([^<]+)<\/b>/)[1].replace(/&amp;/g, '&');

    assert.equal((await admin.post(`/api/candidate/employee/${adminUser._id}`).send({ candidateId })).status, 400);
  });
});

describe('employees', () => {
  test('employee logs in with their referral ID', async () => {
    employee = session();
    const res = await employee
      .post('/api/employee/login')
      .send({ email: employeeUser.referralId.toLowerCase(), password: employeePassword });
    assert.equal(res.status, 200);
    assert.equal(res.body.role, 'employee');
  });

  test('employees can see themselves but not other records or admin lists', async () => {
    assert.equal((await employee.get(`/api/employee/${employeeUser._id}`)).status, 200);
    assert.equal((await employee.get('/api/employee/fetchemployees')).status, 403);
    assert.equal((await employee.get(`/api/employee/${new mongoose.Types.ObjectId()}`)).status, 403);
  });

  test('admins get a paginated, sorted employee list', async () => {
    const res = await admin.get('/api/employee/fetchemployees?page=1&limit=5&sortField=email&sortOrder=desc');
    assert.equal(res.status, 200);
    assert.equal(res.body.pagination.total, 1);
    assert.deepEqual(res.body.sort, { sortField: 'email', sortOrder: 'desc' });

    const bogusSort = await admin.get('/api/employee/fetchemployees?sortField=password');
    assert.equal(bogusSort.body.sort.sortField, '_id');
  });
});

describe('customers and payments', () => {
  let customerId;

  test('customer registers with a referral ID; price comes from the server', async () => {
    const bad = await request(app).post('/api/customer/register').send({
      firstName: 'V', lastName: 'S', email: 'v@test.local', phone: '1', referralId: 'EMPNOPE00', plan: 'basic',
    });
    assert.equal(bad.status, 400);

    const res = await request(app).post('/api/customer/register').send({
      firstName: 'Vikram',
      lastName: 'Singh',
      email: 'vikram@test.local',
      phone: '9123456789',
      referralId: employeeUser.referralId,
      plan: 'premium',
      amount: 1,
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.customer.amount, 1999900);
    customerId = res.body.customer._id;
  });

  test('checkout: initiate, reject a wrong order, confirm', async () => {
    const order = await request(app).post(`/api/customer/payment/initiate/${customerId}`);
    assert.equal(order.status, 200);
    assert.match(order.body.orderId, /^order_/);

    const wrong = await request(app).post(`/api/customer/payment/confirm/${customerId}`).send({ orderId: 'order_fake' });
    assert.equal(wrong.status, 400);

    const paid = await request(app)
      .post(`/api/customer/payment/confirm/${customerId}`)
      .send({ orderId: order.body.orderId });
    assert.equal(paid.status, 200);
    assert.match(paid.body.transactionId, /^txn_/);
    assert.ok(lastEmailTo('vikram@test.local'), 'receipt emailed');

    const again = await request(app).post(`/api/customer/payment/initiate/${customerId}`);
    assert.equal(again.status, 400);
  });

  test('employee sees their customers and total count', async () => {
    const list = await employee.get(`/api/customer/${employeeUser._id}`);
    assert.equal(list.status, 200);
    assert.equal(list.body.customers.length, 1);

    const total = await employee.get(`/api/employee/employee/total-customers/${employeeUser._id}`);
    assert.equal(total.body.totalCustomers, 1);
    assert.equal(total.body.paidCustomers, 1);
  });

  test('admin stats reflect the sale', async () => {
    const res = await admin.get('/api/admin/stats/summary');
    assert.equal(res.status, 200);
    assert.equal(res.body.totals.revenue, 1999900);
    assert.equal(res.body.totals.employees, 1);
    assert.equal(res.body.candidates.employee, 1);
    assert.equal(res.body.monthly.length, 6);
    assert.equal(res.body.topEmployees[0].referralId, employeeUser.referralId);
  });

  test('admin can refund; employees cannot change payment status', async () => {
    const denied = await employee.put(`/api/customer/payment/status/${customerId}`).send({ paymentStatus: 'refunded' });
    assert.equal(denied.status, 403);
    const res = await admin.put(`/api/customer/payment/status/${customerId}`).send({ paymentStatus: 'refunded' });
    assert.equal(res.status, 200);
    assert.equal(res.body.customer.paymentStatus, 'refunded');
  });
});

describe('master admin', () => {
  test('audit log records important actions', async () => {
    const res = await master.get('/api/master/audit-logs?action=candidate');
    assert.equal(res.status, 200);
    const actions = res.body.logs.map((log) => log.action);
    assert.ok(actions.includes('candidate.shortlisted'));
    assert.ok(actions.includes('candidate.converted'));
    assert.equal((await admin.get('/api/master/audit-logs')).status, 403);
  });

  test('deleted accounts lose access immediately', async () => {
    assert.equal((await master.delete(`/api/admin/${adminUser._id}`)).status, 200);
    assert.equal((await admin.get(`/api/admin/${adminUser._id}`)).status, 401);
  });

  test('logout clears the cookie', async () => {
    const res = await employee.post('/api/employee/logout');
    assert.equal(res.status, 200);
    assert.equal((await employee.get('/api/session/me')).body.user, null);
    assert.equal((await request(app).post('/api/employee/logout')).status, 400);
  });
});
