import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Reliably discover and load .env regardless of whether process started from root or apps/api workspace
function loadEnv() {
  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'apps/api/.env'),
    path.resolve(__dirname, '../../.env'),
    path.resolve(__dirname, '../../../.env'),
    path.resolve(__dirname, '.env'),
    path.resolve(__dirname, '../.env'),
  ];

  for (const envPath of candidates) {
    if (fs.existsSync(envPath) && fs.statSync(envPath).isFile()) {
      dotenv.config({ path: envPath, override: true });
    }
  }
}

loadEnv();

export const ENV = {
  PORT: parseInt(process.env.PORT || '4000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:4000',
  DATABASE_URL: process.env.DATABASE_URL || '',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  SESSION_SECRET: process.env.SESSION_SECRET || 'dev_session_secret_change_in_production_123',
  ENCRYPTION_KEY: (process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef').slice(0, 64),
  JWT_SECRET: process.env.JWT_SECRET || 'dev_jwt_secret_change_in_production_456',

  INITIAL_ADMIN_EMAIL: process.env.INITIAL_ADMIN_EMAIL || 'admin@socialhub.local',
  INITIAL_ADMIN_PASSWORD: process.env.INITIAL_ADMIN_PASSWORD || 'AdminSecurePassword123!',
  INITIAL_ADMIN_NAME: process.env.INITIAL_ADMIN_NAME || 'SocialHub Administrator',

  UPLOAD_DIR: path.resolve(__dirname, '../../uploads'),
  STORAGE_PUBLIC_BASE_URL: process.env.STORAGE_PUBLIC_BASE_URL || 'http://localhost:4000/uploads',

  // Platform OAuth & APIs
  LINKEDIN_CLIENT_ID: process.env.LINKEDIN_CLIENT_ID || '',
  LINKEDIN_CLIENT_SECRET: process.env.LINKEDIN_CLIENT_SECRET || '',
  LINKEDIN_REDIRECT_URI: process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:4000/api/accounts/linkedin/callback',
  LINKEDIN_ACCESS_TOKEN: process.env.LINKEDIN_ACCESS_TOKEN || '',
  LINKEDIN_AUTHOR_URN: process.env.LINKEDIN_AUTHOR_URN || '',

  META_APP_ID: (process.env.META_APP_ID && process.env.META_APP_ID !== 'your_meta_app_id') ? process.env.META_APP_ID.trim() : '',
  META_APP_SECRET: (process.env.META_APP_SECRET && process.env.META_APP_SECRET !== 'your_meta_app_secret') ? process.env.META_APP_SECRET.trim() : '',
  META_REDIRECT_URI: process.env.META_REDIRECT_URI || 'http://localhost:4000/api/accounts/facebook/callback',
  META_INSTAGRAM_REDIRECT_URI: process.env.META_INSTAGRAM_REDIRECT_URI || 'http://localhost:4000/api/accounts/instagram/callback',

  WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  WHATSAPP_BUSINESS_ACCOUNT_ID: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
  WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN || '',
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'socialhub_verify_token',

  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/api/accounts/google_business/callback',

  AI_API_KEY: process.env.AI_API_KEY || '',
  AI_PROVIDER: process.env.AI_PROVIDER || 'gemini',
  AI_MODEL: process.env.AI_MODEL || 'gemini-2.5-flash',
};
