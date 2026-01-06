import request from 'supertest';
import app from '../src/app';
import prisma from '../src/prisma';
import { sign } from '../src/lib/jwt';

jest.mock('../src/lib/s3', () => ({
  getPresignedUploadUrl: async (_key: string, _contentType?: string) => `https://signed.test/mock`
}));

describe('Reports routes', () => {
  let token: string;

  beforeAll(async () => {
    // ensure a test user exists
    await prisma.user.upsert({
      where: { email: 'reporter@test.local' },
      update: {},
      create: { email: 'reporter@test.local', name: 'Reporter', password: '$2b$10$abcdefghijklmnopqrstuv', role: 'employee' }
    });

    // create a signed token; we don't need to depend on the login flow here
    token = sign({ sub: 'reporter-1', email: 'reporter@test.local', role: 'employee' });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: 'reporter@test.local' } });
    await prisma.$disconnect();
  });

  it('presign returns 400 when key missing', async () => {
    const res = await request(app).post('/api/reports/presign').set('Authorization', `Bearer ${token}`).send({});
    expect(res.status).toBe(400);
  });

  it('presign returns url when key provided', async () => {
    const res = await request(app).post('/api/reports/presign').set('Authorization', `Bearer ${token}`).send({ key: 'uploads/x' });
    expect(res.status).toBe(200);
    expect(res.body.url).toMatch(/^https:\/\/signed.test\//);
  });

  it('creating report validates required fields', async () => {
    const res = await request(app).post('/api/reports').set('Authorization', `Bearer ${token}`).send({});
    expect(res.status).toBe(400);
  });

  it('creating report succeeds with required fields', async () => {
    // mock prisma.report.create to avoid DB schema dependencies
    const mock = jest.spyOn(prisma.report, 'create' as any).mockResolvedValue({ id: 'r1', projectId: 'p1', type: 'daily' } as any);
    const res = await request(app).post('/api/reports').set('Authorization', `Bearer ${token}`).send({ projectId: 'p1', type: 'daily' });
    expect(res.status).toBe(201);
    expect(res.body.projectId).toBe('p1');
    mock.mockRestore();
  });
});
