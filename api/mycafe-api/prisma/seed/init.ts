import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seed başlıyor...');

  // Test kullanıcısı oluştur
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password_hash: hashedPassword,
      role: 'ADMIN',
      cafe_id: 1,
    },
  });

  const garsonUser = await prisma.user.upsert({
    where: { username: 'garson' },
    update: {},
    create: {
      username: 'garson',
      password_hash: await bcrypt.hash('garson123', 10),
      role: 'GARSON',
      cafe_id: 1,
    },
  });

  const kasaUser = await prisma.user.upsert({
    where: { username: 'kasa' },
    update: {},
    create: {
      username: 'kasa',
      password_hash: await bcrypt.hash('kasa123', 10),
      role: 'KASA',
      cafe_id: 1,
    },
  });

  console.log('✅ Seed tamamlandı:');
  console.log('- Admin:', adminUser.username);
  console.log('- Garson:', garsonUser.username);
  console.log('- Kasa:', kasaUser.username);
}

main()
  .catch((e) => {
    console.error('❌ Seed hatası:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
