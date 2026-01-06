import request from 'supertest';
import app from '../src/app';
import prisma from '../src/prisma';
import bcrypt from 'bcrypt';

let token: string;

beforeAll(async () => {
  const hash = await bcrypt.hash('admintest2', 10);
  await prisma.user.create({ data: { email: 'admin3@vision.org', password: hash, name: 'Admin3', role: 'super_admin' } });
  const res = await request(app).post('/api/auth/login').send({ email: 'admin3@vision.org', password: 'admintest2' });
  token = res.body.token;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: 'admin3@vision.org' } });
  await prisma.$disconnect();
});

describe('Admin counts', () => {
  it('returns counts payload', async () => {
    const res = await request(app).get('/api/admin/projects/counts').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('byYear');
  });
});

describe('Admin projects listing & export', () => {
  let projA: any;
  let projB: any;
  beforeAll(async () => {
    const ngo = await prisma.nGO.findFirst() || await prisma.nGO.create({ data: { name: 'Test NGO', code: 'T-001' } });
    projA = await prisma.project.create({ data: { title: 'Export Test One', startDate: new Date('2025-01-01'), endDate: new Date('2025-12-31'), budget: 1000, ngoId: ngo.id } });
    projB = await prisma.project.create({ data: { title: 'Export Test Two', startDate: new Date('2024-01-01'), endDate: new Date('2024-06-01'), budget: 2000, ngoId: ngo.id } });
    // add reports to change activity counts
    const adminUser = await prisma.user.findUnique({ where: { email: 'admin3@vision.org' } });
    const authorId = adminUser?.id || '';
    await prisma.report.create({ data: { projectId: projA.id, type: 'survey', authorId, date: new Date() } });
    await prisma.report.create({ data: { projectId: projA.id, type: 'activity', authorId, date: new Date() } });
    await prisma.report.create({ data: { projectId: projB.id, type: 'activity', authorId, date: new Date() } });
  });

  afterAll(async () => {
    await prisma.report.deleteMany({ where: { projectId: { in: [projA.id, projB.id] } } });
    await prisma.project.deleteMany({ where: { id: { in: [projA.id, projB.id] } } });
  });

  it('filters by status and sorts by numActivities', async () => {
    const res = await request(app).get('/api/admin/projects').query({ filterStatus: 'in_progress', sortBy: 'numActivities', order: 'desc', perPage: 50 }).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('rows');
    const rows = res.body.rows;
    // Ensure rows are sorted by numActivities desc
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i-1].numActivities).toBeGreaterThanOrEqual(rows[i].numActivities);
    }
  });

  it('exports files for each format', async () => {
    const formats = [ {fmt:'excel', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}, {fmt:'pdf', type: 'application/pdf'}, {fmt:'word', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'} ];
    for (const f of formats) {
      const r = await request(app).get('/api/admin/projects/export').query({ format: f.fmt, status: 'in_progress' }).set('Authorization', `Bearer ${token}`);
      expect(r.status).toBe(200);
      expect(r.header['content-type']).toContain(f.type.split('/')[0]);
      expect(r.header['content-disposition']).toMatch(/attachment/);
      // ensure there is at least some response payload (length header or body/text)
      const lengthish = r.header['content-length'] || (r.body && (r.body.length || r.body.byteLength)) || (r.text && r.text.length);
      expect(Boolean(lengthish)).toBe(true);
    }
  });
});
