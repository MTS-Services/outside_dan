/* Seed database with admin user */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@restaurant.local' },
    update: {},
    create: {
      email: 'admin@restaurant.local',
      password: adminPassword,
      name: 'Restaurant Admin',
      role: 'ADMIN',
    },
  });

  console.log('Seed complete.');
  console.log('Admin login: admin@restaurant.local / admin123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
