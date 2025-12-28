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
});
