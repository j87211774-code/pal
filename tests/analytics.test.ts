import request from 'supertest';
import app from '../src/app';
import prisma from '../src/prisma';
import bcrypt from 'bcrypt';

let token: string;

beforeAll(async () => {
  const hash = await bcrypt.hash('analyst', 10);
  await prisma.user.create({ data: { email: 'analyst@vision.org', password: hash, name: 'Analyst', role: 'viewer' } });
  const res = await request(app).post('/api/auth/login').send({ email: 'analyst@vision.org', password: 'analyst' });
  token = res.body.token;
});

afterAll(async () => {
  await prisma.report.deleteMany({ where: { authorName: 'Analyst' } });
  await prisma.user.deleteMany({ where: { email: 'analyst@vision.org' } });
  await prisma.$disconnect();
});

describe('Analytics', () => {
  it('returns project summaries', async () => {
    const res = await request(app).get('/api/analytics/projects/summary').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('returns employees summaries', async () => {
    const res = await request(app).get('/api/analytics/employees/summary').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
