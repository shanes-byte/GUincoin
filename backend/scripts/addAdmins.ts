import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addAdmins() {
  const adminEmails = [
    { email: 'shanes@guinco.com', name: 'Shane S' },
    { email: 'landonm@guinco.com', name: 'Landon M' },
  ];

  for (const admin of adminEmails) {
    const employee = await prisma.employee.upsert({
      where: { email: admin.email.toLowerCase() },
      update: { isAdmin: true, isManager: true },
      create: {
        email: admin.email.toLowerCase(),
        name: admin.name,
        isAdmin: true,
        isManager: true,
      },
    });

    // Ensure account exists
    await prisma.account.upsert({
      where: { employeeId: employee.id },
      update: {},
      create: { employeeId: employee.id },
    });

    console.log(`✓ ${admin.email} is now an admin`);
  }

  console.log('\nDone! Both users are now admins.');
}

addAdmins()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
