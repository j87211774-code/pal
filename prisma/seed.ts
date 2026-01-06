import bcrypt from 'bcrypt';
import prisma from '../src/prisma';

async function main() {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('ChangeMe123!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@vision.org' },
    update: {},
    create: {
      email: 'admin@vision.org',
      name: 'Super Admin',
      password: passwordHash,
      role: 'super_admin'
    }
  });

  let ngo = await prisma.nGO.findFirst({ where: { name: 'Palestinian Vision' } });
  if (!ngo) {
    ngo = await prisma.nGO.create({ data: { name: 'Palestinian Vision', code: 'PV-001' } });
  }

  let project = await prisma.project.findFirst({ where: { title: 'Pilot Reporting Project' } });
  if (!project) {
    project = await prisma.project.create({
      data: {
        title: 'Pilot Reporting Project',
        startDate: new Date('2026-01-05'),
        endDate: new Date('2026-06-30'),
        budget: 50000,
        ngoId: ngo.id,
        objectives: 'Pilot the reporting workflows and donor exports'
      }
    });
  }

  console.log({ admin: admin.email, ngo: ngo.name, project: project.title });

  // Optional demo data: create many users and projects when env vars are set
  const numUsers = parseInt(process.env.DEMO_USERS || '0', 10) || 0;
  const numProjects = parseInt(process.env.DEMO_PROJECTS || '0', 10) || 0;

  if (numUsers > 0) {
    console.log(`Creating ${numUsers} demo users...`);
    for (let i = 1; i <= numUsers; i++) {
      const email = `user${i}@vision.org`;
      await prisma.user.upsert({
        where: { email },
        update: {},
        create: { email, name: `User ${i}`, password: passwordHash, role: 'user' }
      });
    }
  }

  if (numProjects > 0) {
    console.log(`Creating ${numProjects} demo projects...`);
    for (let i = 1; i <= numProjects; i++) {
      const title = `Demo Project ${i}`;
      await prisma.project.upsert({
        where: { title },
        update: {},
        create: {
          title,
          startDate: new Date(),
          endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
          budget: Math.floor(Math.random() * 100000),
          ngoId: ngo.id,
          objectives: 'Demo objectives for seeding'
        }
      });
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
