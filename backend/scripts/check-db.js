const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const userCount = await prisma.user.count();
        console.log('User count:', userCount);

        const users = await prisma.user.findMany();
        console.log('Users:', users);

        const docCount = await prisma.document.count();
        console.log('Document count:', docCount);

        const docs = await prisma.document.findMany();
        console.log('Documents:', docs.map(d => ({ id: d.id, name: d.name, contentSize: d.content ? d.content.length : 0 })));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
