import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConstitutionErrorFilter } from './core/exceptions/constitution-error.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.setGlobalPrefix('api');
  
  // GitHub Codespaces için
  app.enableCors({
    origin: '*',
    credentials: true,
  });
  
  app.useGlobalFilters(new ConstitutionErrorFilter());
  app.useGlobalPipes(new ValidationPipe());
  
  const port = process.env.PORT || 3000;
  const host = '0.0.0.0';  // ⭐️ BU ÖNEMLİ!
  
  await app.listen(port, host);
  
  console.log(`🚀 API çalışıyor:`);
  console.log(`   Local:  http://localhost:${port}`);
  console.log(`   Network: http://${host}:${port}`);
  console.log(`📜 MyCafe Anayasası v2 aktif`);
  
  // GitHub Codespaces URL
  if (process.env.CODESPACE_NAME) {
    console.log(`🌐 GitHub Codespaces: https://${process.env.CODESPACE_NAME}-${port}.app.github.dev`);
  }
}
bootstrap();
