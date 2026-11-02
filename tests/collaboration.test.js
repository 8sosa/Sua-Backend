const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.mock('ioredis', () => jest.fn().mockImplementation(() => ({ set: jest.fn(), get: jest.fn() })));

process.env.JWT_SECRET = 'test-secret';
const app = require('../app');
const PortalUser = require('../Models/portal/user');
const CollaborationRequest = require('../Models/collaborationRequest');

let mongo;
const api = () => request(app);
const valid = {
  organization: 'Softcare',
  contactName: 'Ada Lovelace',
  email: 'ada@softcare.example',
  collaborationType: 'Sponsorship',
  message: 'We would like to sponsor pads for the Period Bank.',
};

beforeAll(async () => {
  let uri = process.env.MONGO_TEST_URI;
  if (!uri) {
    mongo = await MongoMemoryServer.create();
    uri = mongo.getUri();
  }
  await mongoose.connect(uri, { dbName: `collab_test_${Date.now()}` });
  const hash = await bcrypt.hash('password123', 10);
  await PortalUser.create({ name: 'Ada Admin', email: 'admin@vcf.org', role: 'admin', password: hash });
  await PortalUser.create({ name: 'Tola Teacher', email: 'teacher@vcf.org', role: 'teacher', password: hash });
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

const tokenFor = async (email) =>
  (await api().post('/api/portal/auth/login').send({ email, password: 'password123' })).body.token;

describe('collaboration form', () => {
  test('saves a valid request', async () => {
    const res = await api().post('/api/form/collaborate').send({ ...valid, country: 'Nigeria' });
    expect(res.status).toBe(201);
    const saved = await CollaborationRequest.findOne({ email: 'ada@softcare.example' });
    expect(saved.organization).toBe('Softcare');
    expect(saved.status).toBe('new');
  });

  test('rejects missing required fields', async () => {
    const res = await api().post('/api/form/collaborate').send({ organization: 'X' });
    expect(res.status).toBe(400);
    expect(res.body.fields).toEqual(expect.arrayContaining(['contactName', 'email', 'collaborationType', 'message']));
  });

  test('rejects a bad email and an unknown collaboration type', async () => {
    expect((await api().post('/api/form/collaborate').send({ ...valid, email: 'nope' })).status).toBe(400);
    expect((await api().post('/api/form/collaborate').send({ ...valid, collaborationType: 'Hacking' })).status).toBe(400);
  });

  test('silently drops honeypot submissions', async () => {
    const before = await CollaborationRequest.countDocuments();
    const res = await api().post('/api/form/collaborate').send({ ...valid, botField: 'spam' });
    expect(res.status).toBe(201);
    expect(await CollaborationRequest.countDocuments()).toBe(before);
  });

  test('only portal admins can list and update requests', async () => {
    expect((await api().get('/api/portal/collaborations')).status).toBe(401);
    const teacher = await tokenFor('teacher@vcf.org');
    expect((await api().get('/api/portal/collaborations').set('Authorization', `Bearer ${teacher}`)).status).toBe(403);

    const admin = await tokenFor('admin@vcf.org');
    const list = await api().get('/api/portal/collaborations').set('Authorization', `Bearer ${admin}`);
    expect(list.status).toBe(200);
    expect(list.body[0].organization).toBe('Softcare');

    const upd = await api()
      .patch(`/api/portal/collaborations/${list.body[0]._id}`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ status: 'contacted' });
    expect(upd.status).toBe(200);
    expect(upd.body.status).toBe('contacted');
  });
});
