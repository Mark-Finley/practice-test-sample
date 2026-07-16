import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL environment variable is not defined!');
    process.exit(1);
  }

  console.log('Initializing database connection pool for seeding...');
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log('Clearing existing user and auth configurations...');
    await prisma.user.deleteMany({});
    await prisma.rolePermission.deleteMany({});
    await prisma.permission.deleteMany({});
    await prisma.role.deleteMany({});

    console.log('Creating system roles...');
    const systemAdminRole = await prisma.role.create({
      data: {
        name: 'SYSTEM_ADMIN',
        description: 'System administrator with full system controls.',
      },
    });

    const orgAdminRole = await prisma.role.create({
      data: {
        name: 'ORG_ADMIN',
        description: 'Organization administrator managing candidates and reviews.',
      },
    });

    const candidateRole = await prisma.role.create({
      data: {
        name: 'CANDIDATE',
        description: 'Candidate taking certification practice tests.',
      },
    });

    console.log('Creating granular access permissions...');
    const permissionsData = [
      { action: 'create', subject: 'questions' },
      { action: 'read', subject: 'questions' },
      { action: 'update', subject: 'questions' },
      { action: 'delete', subject: 'questions' },
      { action: 'manage', subject: 'users' },
      { action: 'manage', subject: 'organizations' },
      { action: 'take', subject: 'exams' },
      { action: 'view', subject: 'reports' },
    ];

    const permissions: Record<string, any> = {};
    for (const p of permissionsData) {
      const permission = await prisma.permission.create({
        data: p,
      });
      permissions[`${p.action}:${p.subject}`] = permission;
    }

    console.log('Mapping permissions to roles...');
    
    // SYSTEM_ADMIN permissions (All)
    for (const key in permissions) {
      await prisma.rolePermission.create({
        data: {
          roleId: systemAdminRole.id,
          permissionId: permissions[key].id,
        },
      });
    }

    // ORG_ADMIN permissions
    const orgAdminPerms = ['manage:users', 'read:questions', 'view:reports'];
    for (const key of orgAdminPerms) {
      await prisma.rolePermission.create({
        data: {
          roleId: orgAdminRole.id,
          permissionId: permissions[key].id,
        },
      });
    }

    // CANDIDATE permissions
    const candidatePerms = ['take:exams'];
    for (const key of candidatePerms) {
      await prisma.rolePermission.create({
        data: {
          roleId: candidateRole.id,
          permissionId: permissions[key].id,
        },
      });
    }

    console.log('Creating default system admin account...');
    const passwordHash = await bcrypt.hash('adminpassword123', 10);
    await prisma.user.create({
      data: {
        email: 'admin@platform.com',
        passwordHash,
        firstName: 'System',
        lastName: 'Admin',
        roleId: systemAdminRole.id,
        isActive: true,
      },
    });

    console.log('Database seeding successfully finished!');
  } catch (error) {
    console.error('Seeding database failed:');
    console.error(error);
    process.exit(1);
  } finally {
    console.log('Disconnecting database connections...');
    await prisma.$disconnect();
    await pool.end();
    console.log('Database pool connection ended.');
  }
}

main();
