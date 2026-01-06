import request from 'supertest';
import app from '../src/app';
import prisma from '../src/prisma';
import bcrypt from 'bcrypt';

let token: string;

beforeAll(async () => {
  const hash = await bcrypt.hash('userpass', 10);
  await prisma.user.create({ data: { email: 'user1@vision.org', password: hash, name: 'User1', role: 'employee' } });
  const res = await request(app).post('/api/auth/login').send({ email: 'user1@vision.org', password: 'userpass' });
  token = res.body.token;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: 'user1@vision.org' } });
  await prisma.$disconnect();
});

describe('User projects', () => {
  it('allows user to list own projects', async () => {
    const res = await request(app).get('/api/user/projects').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
