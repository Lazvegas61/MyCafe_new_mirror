import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';

/**
 * 📜 MYCAFE ANAYASA MADDE K05:
 * "Tüm iş kuralları SQL seviyesinde zorlanır"
 * 
 * Bu service direkt PostgreSQL'e bağlanır.
 * ORM KULLANILMAZ, RAW SQL KULLANILIR.
 */
@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: Pool;
  private client: PoolClient | null = null;

  constructor() {
    // Neon.tech connection string
    const connectionString = process.env.DATABASE_URL;
    
    this.pool = new Pool({
      connectionString,
      max: 20, // Connection pool size
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.logger.log('🔗 DatabaseService: PostgreSQL Pool oluşturuldu (Prisma YOK)');
    this.logger.log('📜 Anayasa K05: Tüm iş kuralları SQL seviyesinde zorlanacak');
  }

  async onModuleInit() {
    try {
      // Test connection
      this.client = await this.pool.connect();
      const result = await this.client.query('SELECT NOW() as time, version() as version');
      
      this.logger.log(`✅ Database bağlantısı kuruldu: ${result.rows[0].time}`);
      this.logger.log(`🗄️  PostgreSQL: ${result.rows[0].version.split(',')[0]}`);
      
      // MyCafe tablolarını kontrol et
      await this.checkMyCafeTables();
      
      this.client.release();
    } catch (error) {
      this.logger.error('❌ Database bağlantı hatası:', error.message);
      throw error;
    }
  }

  async onModuleDestroy() {
    this.logger.log('🔌 Database bağlantısı kapatılıyor...');
    await this.pool.end();
  }

  /**
   * 📜 ANAYASA KURALI: Tüm SQL query'leri bu methoddan geçmeli
   */
  async query<T = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }> {
    const start = Date.now();
    
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      // Log only if it takes more than 100ms
      if (duration > 100) {
        this.logger.debug(`📊 SQL Query: ${text.substring(0, 100)}... [${duration}ms]`);
      }
      
      return result;
    } catch (error) {
      this.logger.error(`❌ SQL Hatası: ${error.message}`);
      this.logger.error(`🔍 Query: ${text}`);
      this.logger.error(`📝 Params: ${JSON.stringify(params)}`);
      
      // 📜 ANAYASA K05: SQL constraint hatalarını özel olarak handle et
      if (error.code === '23505') { // unique violation
        throw new Error(`ANAYASA_K05_UNIQUE_VIOLATION: ${error.detail}`);
      }
      if (error.code === '23514') { // check violation
        throw new Error(`ANAYASA_K05_CHECK_VIOLATION: ${error.constraint} - ${error.detail}`);
      }
      if (error.code === '23503') { // foreign key violation
        throw new Error(`ANAYASA_K05_FK_VIOLATION: ${error.detail}`);
      }
      
      throw error;
    }
  }

  /**
   * 📜 ANAYASA K03, K08: Transaction yönetimi (Finans immutable)
   */
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      this.logger.debug('🔄 Transaction başlatıldı');
      
      const result = await callback(client);
      
      await client.query('COMMIT');
      this.logger.debug('✅ Transaction tamamlandı');
      
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('❌ Transaction rolled back:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * MyCafe tablolarını kontrol et
   */
  private async checkMyCafeTables(): Promise<void> {
    try {
      const tables = await this.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      
      this.logger.log(`📋 MyCafe tabloları (${tables.rowCount} adet):`);
      tables.rows.forEach((row, i) => {
        this.logger.log(`   ${i + 1}. ${row.table_name}`);
      });

      // 📜 ANAYASA K05: Constraint'leri kontrol et
      const constraints = await this.query(`
        SELECT conname, conrelid::regclass AS table, contype, consrc
        FROM pg_constraint 
        WHERE contype = 'c' -- check constraints
        ORDER BY conrelid, conname
      `);
      
      if (constraints.rowCount > 0) {
        this.logger.log(`🔒 ANAYASA K05 Constraint'ler (${constraints.rowCount} adet):`);
        constraints.rows.forEach(constraint => {
          this.logger.log(`   ✓ ${constraint.table}.${constraint.conname}`);
        });
      }
      
    } catch (error) {
      this.logger.warn('Tablo kontrolü hatası:', error.message);
    }
  }

  /**
   * Kullanıcı bulma (Auth için)
   */
  async findUserByUsername(username: string): Promise<any> {
    const result = await this.query(
      `SELECT * FROM users WHERE username = $1 AND is_active = true`,
      [username]
    );
    
    return result.rows[0];
  }

  /**
   * Session oluşturma (K18: Session DB'de saklanır)
   */
  async createUserSession(sessionData: {
    user_id: number;
    token_hash: string;
    expires_at: Date;
  }): Promise<any> {
    const result = await this.query(
      `INSERT INTO usersession (user_id, token_hash, expires_at, last_activity)
       VALUES ($1, $2, $3, NOW())
       RETURNING id, user_id, expires_at, created_at`,
      [sessionData.user_id, sessionData.token_hash, sessionData.expires_at]
    );
    
    return result.rows[0];
  }

  /**
   * Session kontrolü (K18)
   */
  async validateSession(tokenHash: string): Promise<any> {
    const result = await this.query(
      `SELECT us.*, u.username, u.role, u.cafe_id
       FROM usersession us
       JOIN users u ON us.user_id = u.id
       WHERE us.token_hash = $1 
         AND us.is_active = true 
         AND us.expires_at > NOW()
         AND u.is_active = true`,
      [tokenHash]
    );
    
    if (result.rows[0]) {
      // Last activity güncelle
      await this.query(
        `UPDATE usersession SET last_activity = NOW() WHERE id = $1`,
        [result.rows[0].id]
      );
    }
    
    return result.rows[0];
  }
}
