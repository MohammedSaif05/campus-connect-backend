/**
 * Prisma Seed Script
 *
 * Creates the initial SUPER_ADMIN user for the platform.
 * Run with: npx prisma db seed
 */
import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as bcrypt from 'bcrypt';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  // Check if a SUPER_ADMIN already exists
  const existingAdmin = await prisma.user.findFirst({
    where: { role: Role.SUPER_ADMIN },
  });

  if (existingAdmin) {
    console.log('✅ SUPER_ADMIN already exists. Skipping seed.');
    return;
  }

  // Create the initial SUPER_ADMIN (no college association)
  const hashedPassword = await bcrypt.hash('Admin@123', 10);

  const admin = await prisma.user.create({
    data: {
      name: 'Platform Admin',
      email: 'admin@campusconnect.com',
      password: hashedPassword,
      role: Role.SUPER_ADMIN,
      collegeId: null,
      departmentId: null,
      mustChangePassword: true,
    },
  });

  console.log('✅ SUPER_ADMIN created:');
  console.log(`   Email: admin@campusconnect.com`);
  console.log(`   Password: Admin@123`);
  console.log(`   ID: ${admin.id}`);
  console.log('');
  console.log('⚠️  Change this password immediately after first login!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
