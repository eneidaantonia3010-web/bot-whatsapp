const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany();
    console.log("Current users in DB:", users);

    if (users.length === 0) {
        console.log("Creating a default admin user...");
        const hashedPassword = await bcrypt.hash('admin123', 10);
        const newUser = await prisma.user.create({
            data: {
                email: 'admin@glowstudio.com',
                name: 'Sofía (Administradora)',
                password: hashedPassword,
                role: 'ADMIN',
            },
        });
        console.log("Created user:", newUser);
    } else {
        console.log("Users already exist. If you need a known password, we might need to reset one.");
        // We can force update the first user's password to admin123
        const firstUser = users[0];
        console.log("Force resetting password for", firstUser.email, "to 'admin123'...");
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await prisma.user.update({
            where: { id: firstUser.id },
            data: { password: hashedPassword, role: 'ADMIN' }
        });
        console.log("Password reset successful.");
    }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
