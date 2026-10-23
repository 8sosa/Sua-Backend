const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { MongoMemoryServer } = require('mongodb-memory-server');

// sessionCtrl opens a Redis connection at import time; stub it so tests don't need Redis and can exit.
jest.mock('ioredis', () => jest.fn().mockImplementation(() => ({ set: jest.fn(), get: jest.fn() })));

process.env.JWT_SECRET = 'test-secret';
const app = require('../app');
const PortalUser = require('../Models/portal/user');

let mongo;
const api = () => request(app);
const login = async (email, password = 'password123') => {
  const res = await api().post('/api/portal/auth/login').send({ email, password });
  return res.body.token;
};
const as = (token) => ({ Authorization: `Bearer ${token}` });

let adminT, teacherT, studentT, otherStudentT;

beforeAll(async () => {
  // MONGO_TEST_URI lets you point at an existing mongod; otherwise an in-memory server is started.
  let uri = process.env.MONGO_TEST_URI;
  if (!uri) {
    mongo = await MongoMemoryServer.create();
    uri = mongo.getUri();
  }
  await mongoose.connect(uri, { dbName: `portal_test_${Date.now()}` });
  await PortalUser.create({ name: 'Ada Admin', email: 'admin@vcf.org', role: 'admin', password: await bcrypt.hash('password123', 10) });
  adminT = await login('admin@vcf.org');

  await api().post('/api/portal/cohorts').set(as(adminT)).send({ name: 'Cohort A' }).expect(201);
  await api().post('/api/portal/cohorts').set(as(adminT)).send({ name: 'Cohort B' }).expect(201);
  await api().post('/api/portal/users').set(as(adminT))
    .send({ name: 'Tola Teacher', email: 'teacher@vcf.org', role: 'teacher', cohorts: ['Cohort A'], subjects: ['Coding'], password: 'password123' }).expect(201);
  await api().post('/api/portal/users').set(as(adminT))
    .send({ name: 'Sade Student', email: 'student@vcf.org', role: 'student', cohort: 'Cohort A', password: 'password123' }).expect(201);
  await api().post('/api/portal/users').set(as(adminT))
    .send({ name: 'Bisi Other', email: 'other@vcf.org', role: 'student', cohort: 'Cohort B', password: 'password123' }).expect(201);
  teacherT = await login('teacher@vcf.org');
  studentT = await login('student@vcf.org');
  otherStudentT = await login('other@vcf.org');
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

describe('auth', () => {
  test('rejects a wrong password with a generic message', async () => {
    const res = await api().post('/api/portal/auth/login').send({ email: 'student@vcf.org', password: 'nope' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Email or password is incorrect.');
  });

  test('requires a token', async () => {
    await api().get('/api/portal/auth/me').expect(401);
  });

  test('does not accept shop admin tokens', async () => {
    const jwt = require('jsonwebtoken');
    const shopToken = jwt.sign({ id: new mongoose.Types.ObjectId() }, 'test-secret');
    await api().get('/api/portal/auth/me').set(as(shopToken)).expect(401);
  });

  test('new accounts are asked to change their password, and can', async () => {
    const me = await api().get('/api/portal/auth/me').set(as(studentT)).expect(200);
    expect(me.body.user.mustChangePassword).toBe(true);
    await api().post('/api/portal/auth/password').set(as(studentT)).send({ current: 'wrong', next: 'newpassword1' }).expect(400);
    const res = await api().post('/api/portal/auth/password').set(as(studentT)).send({ current: 'password123', next: 'newpassword1' }).expect(200);
    expect(res.body.user.mustChangePassword).toBe(false);
    studentT = await login('student@vcf.org', 'newpassword1');
    expect(studentT).toBeTruthy();
  });

  test('admin-generated temporary passwords work, and deactivated accounts are locked out', async () => {
    const created = await api().post('/api/portal/users').set(as(adminT))
      .send({ name: 'Temp Person', email: 'temp@vcf.org', role: 'student', cohort: 'Cohort B' }).expect(201);
    expect(created.body.tempPassword).toHaveLength(10);
    const token = await login('temp@vcf.org', created.body.tempPassword);
    await api().get('/api/portal/auth/me').set(as(token)).expect(200);
    await api().patch(`/api/portal/users/${created.body.user.id}`).set(as(adminT)).send({ active: false }).expect(200);
    await api().get('/api/portal/auth/me').set(as(token)).expect(401);
  });
});

describe('role-based access', () => {
  test('only admins manage accounts', async () => {
    await api().get('/api/portal/users').set(as(teacherT)).expect(403);
    await api().post('/api/portal/users').set(as(studentT)).send({}).expect(403);
    await api().get('/api/portal/users').set(as(adminT)).expect(200);
  });

  test('students cannot create content', async () => {
    await api().post('/api/portal/materials').set(as(studentT)).expect(403);
    await api().post('/api/portal/assignments').set(as(studentT)).send({}).expect(403);
  });

  test('teachers can only post to cohorts they teach', async () => {
    const res = await api().post('/api/portal/assignments').set(as(teacherT))
      .send({ title: 'X', subject: 'Coding', cohort: 'Cohort B', due: '2099-01-01' });
    expect(res.status).toBe(403);
  });
});

describe('materials', () => {
  let id;
  test('teacher uploads a file that only their cohort can download', async () => {
    const up = await api().post('/api/portal/materials').set(as(teacherT))
      .field('subject', 'Coding').field('cohort', 'Cohort A').field('kind', 'Notes')
      .attach('file', Buffer.from('hello learners'), 'week1.txt').expect(201);
    id = up.body.id;
    expect(up.body.title).toBe('week1');

    const list = await api().get('/api/portal/materials').set(as(studentT)).expect(200);
    expect(list.body.map((m) => m.id)).toContain(id);
    const file = await api().get(`/api/portal/materials/${id}/file`).set(as(studentT)).buffer(true).parse((res, cb) => {
      let d = ''; res.on('data', (c) => { d += c; }); res.on('end', () => cb(null, d));
    }).expect(200);
    expect(file.body).toBe('hello learners');

    const other = await api().get('/api/portal/materials').set(as(otherStudentT)).expect(200);
    expect(other.body).toHaveLength(0);
    await api().get(`/api/portal/materials/${id}/file`).set(as(otherStudentT)).expect(404);
  });

  test('teacher removes it', async () => {
    await api().delete(`/api/portal/materials/${id}`).set(as(teacherT)).expect(200);
    const list = await api().get('/api/portal/materials').set(as(studentT)).expect(200);
    expect(list.body).toHaveLength(0);
  });
});

describe('assignments', () => {
  test('student submits a file and the teacher can download it', async () => {
    const a = await api().post('/api/portal/assignments').set(as(teacherT))
      .send({ title: 'Build a web page', subject: 'Coding', cohort: 'Cohort A', due: '2099-01-01' }).expect(201);
    await api().post(`/api/portal/assignments/${a.body.id}/submission`).set(as(studentT))
      .attach('file', Buffer.from('<h1>hi</h1>'), 'page.html').expect(200);
    const mine = await api().get('/api/portal/assignments').set(as(studentT)).expect(200);
    expect(mine.body[0].submission.fileName).toBe('page.html');
    const teacherView = await api().get('/api/portal/assignments').set(as(teacherT)).expect(200);
    expect(teacherView.body[0].submissions).toBe(1);
    const subs = await api().get(`/api/portal/assignments/${a.body.id}/submissions`).set(as(teacherT)).expect(200);
    expect(subs.body[0].student.name).toBe('Sade Student');
    await api().get(`/api/portal/submissions/${subs.body[0].id}/file`).set(as(teacherT)).expect(200);
    await api().get(`/api/portal/submissions/${subs.body[0].id}/file`).set(as(otherStudentT)).expect(404);
  });
});
