import request from 'supertest';
import app from '../src/app';
import prisma from '../src/prisma';
import bcrypt from 'bcrypt';

let token: string;

beforeAll(async () => {
  const hash = await bcrypt.hash('testpass', 10);
  const user = await prisma.user.create({ data: { email: 'pm@vision.org', password: hash, name: 'PM', role: 'project_manager' } });
  const res = await request(app).post('/api/auth/login').send({ email: 'pm@vision.org', password: 'testpass' });
  token = res.body.token;
});

afterAll(async () => {
  await prisma.project.deleteMany({ where: { title: { contains: 'Test' } } });
  await prisma.user.deleteMany({ where: { email: 'pm@vision.org' } });
  await prisma.$disconnect();
});

describe('Projects', () => {
  it('creates and retrieves a project', async () => {
    const create = await request(app).post('/api/projects').set('Authorization', `Bearer ${token}`).send({ title: 'Test Project', startDate: '2026-01-01', endDate: '2026-03-01' });
    expect(create.status).toBe(201);
    const id = create.body.id;
    const get = await request(app).get(`/api/projects/${id}`).set('Authorization', `Bearer ${token}`);
    expect(get.status).toBe(200);
    expect(get.body.title).toBe('Test Project');
  });

  it('can export a single project and save the export', async () => {
    const ngo = await prisma.nGO.findFirst() || await prisma.nGO.create({ data: { name: 'Test NGO', code: 'T-001' } });
    const project = await prisma.project.create({ data: { title: 'Single Export Project', startDate: new Date('2025-01-01'), endDate: new Date('2025-12-31'), budget: 1000, ngoId: ngo.id } });
    const u = await prisma.user.upsert({ where: { email: 'exporter@vision.org' }, update: { password: await bcrypt.hash('pass1234', 10) }, create: { email: 'exporter@vision.org', password: await bcrypt.hash('pass1234', 10), role: 'employee' } });
    // assign user to project
    await prisma.project.update({ where: { id: project.id }, data: { users: { connect: { id: u.id } } } });

    // login as assigned user
    const login = await request(app).post('/api/auth/login').send({ email: 'exporter@vision.org', password: 'pass1234' });
    const token = login.body.token;

    // generate stream export
    const r1 = await request(app).post(`/api/projects/${project.id}/export`).set('Authorization', `Bearer ${token}`).send({ format: 'excel' });
    expect(r1.status).toBe(200);
    expect(r1.header['content-disposition']).toMatch(/project-.*\.xlsx/);

    // save export
    const r2 = await request(app).post(`/api/projects/${project.id}/export`).set('Authorization', `Bearer ${token}`).send({ format: 'excel', save: true });
    expect(r2.status).toBe(200);
    expect(r2.body.saved).toBe(true);
    expect(r2.body.entry).toHaveProperty('filename');

    // list exports
    const r3 = await request(app).get(`/api/projects/${project.id}/exports`).set('Authorization', `Bearer ${token}`);
    expect(r3.status).toBe(200);
    expect(Array.isArray(r3.body)).toBe(true);
    expect(r3.body.length).toBeGreaterThan(0);

    // cleanup: remove stored exports and project/user
    const fs = require('fs');
    const path = require('path');
    const dir = path.join(process.cwd(), 'data', 'exports', project.id);
    if (fs.existsSync(dir)) { fs.rmSync(dir, { recursive: true, force: true }); }
    await prisma.project.update({ where: { id: project.id }, data: { users: { disconnect: { id: u.id } } } });
    // do not delete upserted user to avoid interfering with other tests
    await prisma.project.delete({ where: { id: project.id } });
  });
});
