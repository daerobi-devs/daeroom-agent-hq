import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.POSTGRES_HOST || '192.168.1.8',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  user: process.env.POSTGRES_USER || 'aiadmin',
  password: process.env.POSTGRES_PASSWORD || 'AiAgent@2026!SecureDB',
  database: process.env.POSTGRES_DB || 'ai_agent',
  max: 10,
  idleTimeoutMillis: 30000,
});

export default pool;
