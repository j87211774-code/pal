import request from 'supertest';
import app from '../src/app';
import prisma from '../src/prisma';
import bcrypt from 'bcrypt';

let token: string;

beforeAll(async () => {
  const hash = await bcrypt.hash('audittest', 10);
  await prisma.user.create({ data: { email: 'auditor@vision.org', password: hash, name: 'Auditor', role: 'super_admin' } });
  const res = await request(app).post('/api/auth/login').send({ email: 'auditor@vision.org', password: 'audittest' });
  token = res.body.token;
});

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { actorId: { in: [] } } });
  await prisma.user.deleteMany({ where: { email: 'auditor@vision.org' } });
  await prisma.$disconnect();
});

describe('Audit logs', () => {
  it('creates an audit record when creating a project', async () => {
    const create = await request(app).post('/api/projects').set('Authorization', `Bearer ${token}`).send({ title: 'Audit Test Project', startDate: '2026-01-01', endDate: '2026-02-01' });
    expect(create.status).toBe(201);
    // small delay to allow audit write
    await new Promise((r) => setTimeout(r, 200));
    const logs = await prisma.auditLog.findMany({ where: { entity: 'project' }, orderBy: { createdAt: 'desc' }, take: 5 });
    expect(logs.length).toBeGreaterThan(0);
    const found = logs.some((l) => l.action === 'create' && l.entity === 'project');
    expect(found).toBe(true);
  });
});
