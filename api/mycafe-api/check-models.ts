import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Prisma Client'ın property isimlerini yansıtalım
console.log('🔧 Prisma Client properties:');
const keys = Object.keys(prisma).filter(key => !key.startsWith('$') && !key.startsWith('_'));
keys.forEach(key => {
  console.log(`  - ${key}`);
});

// Özellikle users/user kontrolü
console.log('\n🔍 users/user kontrolü:');
if ('users' in prisma) {
  console.log('  ✅ prisma.users mevcut');
} else if ('user' in prisma) {
  console.log('  ✅ prisma.user mevcut (model: users)');
} else {
  console.log('  ❌ Hiçbiri mevcut değil');
}
