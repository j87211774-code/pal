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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
