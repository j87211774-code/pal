import request from 'supertest';
import app from '../src/app';
import prisma from '../src/prisma';
import bcrypt from 'bcrypt';

let token: string;

beforeAll(async () => {
  const hash = await bcrypt.hash('admintest', 10);
  const user = await prisma.user.create({ data: { email: 'admin2@vision.org', password: hash, name: 'Admin2', role: 'super_admin' } });
  const res = await request(app).post('/api/auth/login').send({ email: 'admin2@vision.org', password: 'admintest' });
  token = res.body.token;
});

afterAll(async () => {
  await prisma.nGO.deleteMany({ where: { name: { contains: 'Test NGO' } } });
  await prisma.user.deleteMany({ where: { email: 'admin2@vision.org' } });
  await prisma.$disconnect();
});

describe('NGOs', () => {
  it('creates and lists ngos', async () => {
    const create = await request(app).post('/api/ngos').set('Authorization', `Bearer ${token}`).send({ name: 'Test NGO' });
    expect(create.status).toBe(201);
    const list = await request(app).get('/api/ngos').set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body)).toBe(true);
  });
});
