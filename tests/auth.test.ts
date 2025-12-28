import request from 'supertest';
import app from '../src/app';
import prisma from '../src/prisma';

describe('Auth', () => {
  beforeAll(async () => {
    // ensure seed user exists
    await prisma.user.upsert({
      where: { email: 'test@vision.org' },
      update: {},
      create: { email: 'test@vision.org', name: 'Tester', password: '$2b$10$abcdefghijklmnopqrstuv', role: 'employee' }
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: 'test@vision.org' } });
    await prisma.$disconnect();
  });

  it('rejects missing credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
  });
});
