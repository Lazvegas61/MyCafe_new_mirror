import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 MyCafe Database Seed başlıyor...');

  try {
    // NOT: Schema'da model "users" ama Prisma Client'da "user" olarak erişiliyor
    // 1. Admin kullanıcı - UPSERT (varsa update, yoksa create)
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
      where: { username: 'admin' },
      update: {
        password_hash: adminPassword,
        role: 'ADMIN',
        is_active: true,
      },
      create: {
        username: 'admin',
        password_hash: adminPassword,
        role: 'ADMIN',
        cafe_id: 1,
      },
    });

    // 2. Garson kullanıcı
    const garsonPassword = await bcrypt.hash('garson123', 10);
    const garson = await prisma.user.upsert({
      where: { username: 'garson' },
      update: {
        password_hash: garsonPassword,
        role: 'GARSON',
        is_active: true,
      },
      create: {
        username: 'garson',
        password_hash: garsonPassword,
        role: 'GARSON',
        cafe_id: 1,
      },
    });

    // 3. Kasa kullanıcı
    const kasaPassword = await bcrypt.hash('kasa123', 10);
    const kasa = await prisma.user.upsert({
      where: { username: 'kasa' },
      update: {
        password_hash: kasaPassword,
        role: 'KASA',
        is_active: true,
      },
      create: {
        username: 'kasa',
        password_hash: kasaPassword,
        role: 'KASA',
        cafe_id: 1,
      },
    });

    console.log('✅ Seed tamamlandı:');
    console.log(`   👑 Admin: ${admin.username} (ID: ${admin.id}) - Şifre: admin123`);
    console.log(`   🍽️  Garson: ${garson.username} (ID: ${garson.id}) - Şifre: garson123`);
    console.log(`   💰 Kasa: ${kasa.username} (ID: ${kasa.id}) - Şifre: kasa123`);
    
    // Mevcut kullanıcı sayısı
    const userCount = await prisma.user.count();
    console.log(`   📊 Toplam kullanıcı: ${userCount}`);
    
  } catch (error) {
    console.error('❌ Seed hatası:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed çalıştırma hatası:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
