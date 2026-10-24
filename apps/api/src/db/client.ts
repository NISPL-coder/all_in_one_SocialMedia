import fs from 'fs';
import path from 'path';
import { MongoClient, Db } from 'mongodb';
import { ENV } from '../config/env';
import { hashPassword, encryptToken } from '../utils/crypto';

// Local persistent database store
export interface DatabaseSchema {
  users: any[];
  connected_accounts: any[];
  social_posts: any[];
  media_assets: any[];
  post_media: any[];
  post_targets: any[];
  publishing_jobs: any[];
  publishing_attempts: any[];
  whatsapp_recipients: any[];
  consent_records: any[];
  webhook_events: any[];
  application_settings: any[];
  audit_logs: any[];
}

const DB_DIR = path.resolve(__dirname, '../../data');
const DB_FILE = path.join(DB_DIR, 'socialhub-storage.json');

class FallbackDatabase {
  private data: DatabaseSchema = {
    users: [],
    connected_accounts: [],
    social_posts: [],
    media_assets: [],
    post_media: [],
    post_targets: [],
    publishing_jobs: [],
    publishing_attempts: [],
    whatsapp_recipients: [],
    consent_records: [],
    webhook_events: [],
    application_settings: [],
    audit_logs: [],
  };

  constructor() {
    this.load();
    this.initDefaults();
  }

  private load() {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
      } else {
        this.save();
      }
    } catch (e) {
      console.warn('Could not read persistent DB file, using memory store:', e);
    }
  }

  public save() {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to persist DB to file:', e);
    }
  }

  private async initDefaults() {
    if (this.data.users.length === 0) {
      const passwordHash = await hashPassword(ENV.INITIAL_ADMIN_PASSWORD);
      this.data.users.push({
        id: 'admin-user-001',
        email: ENV.INITIAL_ADMIN_EMAIL,
        passwordHash,
        name: ENV.INITIAL_ADMIN_NAME,
        role: 'ADMIN',
        avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80',
        timezone: 'UTC',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const now = new Date().toISOString();
      this.data.connected_accounts.push(
        {
          id: 'acc-li-01',
          platform: 'LINKEDIN',
          accountName: 'TechVision Global Company',
          accountType: 'COMPANY_PAGE',
          avatarUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80',
          externalId: 'urn:li:organization:8849201',
          accessTokenEncrypted: encryptToken('mock_linkedin_token_live'),
          refreshTokenEncrypted: encryptToken('mock_linkedin_refresh'),
          tokenExpiresAt: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString(),
          scopes: ['w_organization_social', 'r_organization_social', 'w_member_social'],
          metadata: { vanityName: 'techvision-global', followersCount: 14200 },
          status: 'CONNECTED',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'acc-fb-01',
          platform: 'FACEBOOK',
          accountName: 'TechVision Official Page',
          accountType: 'PAGE',
          avatarUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=100&auto=format&fit=crop&q=80',
          externalId: '109283746192837',
          accessTokenEncrypted: encryptToken('mock_meta_page_token_live'),
          refreshTokenEncrypted: null,
          tokenExpiresAt: null,
          scopes: ['pages_manage_posts', 'pages_read_engagement', 'publish_video'],
          metadata: { category: 'Technology & Software', likesCount: 28400 },
          status: 'CONNECTED',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'acc-ig-01',
          platform: 'INSTAGRAM',
          accountName: '@techvision.io',
          accountType: 'IG_BUSINESS',
          avatarUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80',
          externalId: '17841405392817264',
          accessTokenEncrypted: encryptToken('mock_instagram_graph_token'),
          refreshTokenEncrypted: null,
          tokenExpiresAt: new Date(Date.now() + 50 * 24 * 3600 * 1000).toISOString(),
          scopes: ['instagram_basic', 'instagram_content_publish'],
          metadata: { username: 'techvision.io', mediaCount: 184 },
          status: 'CONNECTED',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'acc-wa-01',
          platform: 'WHATSAPP',
          accountName: '+1 (555) 234-5678 (Corporate Desk)',
          accountType: 'WABA_NUMBER',
          avatarUrl: 'https://images.unsplash.com/photo-1614680376593-902f749f7ffc?w=100&auto=format&fit=crop&q=80',
          externalId: 'phone_num_id_1029384756',
          accessTokenEncrypted: encryptToken('mock_whatsapp_system_user_token'),
          refreshTokenEncrypted: null,
          tokenExpiresAt: null,
          scopes: ['whatsapp_business_messaging', 'whatsapp_business_management'],
          metadata: { displayPhoneNumber: '+1 555-234-5678', qualityRating: 'GREEN', verifiedName: 'TechVision' },
          status: 'CONNECTED',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'acc-gbp-01',
          platform: 'GOOGLE_BUSINESS',
          accountName: 'TechVision HQ - San Francisco',
          accountType: 'GBP_LOCATION',
          avatarUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=100&auto=format&fit=crop&q=80',
          externalId: 'locations/10928374619283746192',
          accessTokenEncrypted: encryptToken('mock_google_oauth_token'),
          refreshTokenEncrypted: encryptToken('mock_google_refresh_token'),
          tokenExpiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
          scopes: ['https://www.googleapis.com/auth/business.manage'],
          metadata: { address: '500 Howard St, San Francisco, CA', locationState: 'VERIFIED' },
          status: 'CONNECTED',
          createdAt: now,
          updatedAt: now,
        }
      );

      this.data.whatsapp_recipients.push({
        id: 'rec-01',
        phone: '+15552345678',
        name: 'VIP Client Broadcast Group',
        optInStatus: true,
        optInDate: now,
        notes: 'Opted in via client agreement',
        createdAt: now,
        updatedAt: now,
      });

      this.data.media_assets.push({
        id: 'media-demo-01',
        fileName: 'techvision-product-launch.jpg',
        fileSize: 348200,
        mimeType: 'image/jpeg',
        mediaType: 'IMAGE',
        url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&auto=format&fit=crop&q=80',
        storageKey: 'uploads/demo-product.jpg',
        thumbnailUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&auto=format&fit=crop&q=80',
        width: 1200,
        height: 800,
        createdAt: now,
        updatedAt: now,
      });

      this.save();
    }
  }

  public get users() { return this.data.users; }
  public get accounts() { return this.data.connected_accounts; }
  public get posts() { return this.data.social_posts; }
  public get media() { return this.data.media_assets; }
  public get postMedia() { return this.data.post_media; }
  public get targets() { return this.data.post_targets; }
  public get jobs() { return this.data.publishing_jobs; }
  public get attempts() { return this.data.publishing_attempts; }
  public get whatsappRecipients() { return this.data.whatsapp_recipients; }
  public get consents() { return this.data.consent_records; }
  public get webhooks() { return this.data.webhook_events; }
  public get settings() { return this.data.application_settings; }
  public get auditLogs() { return this.data.audit_logs; }
}

export const dbStore = new FallbackDatabase();

// MongoDB Client
let mongoClient: MongoClient | null = null;
let mongoDb: Db | null = null;
let isMongoConnected = false;

export async function initMongo(): Promise<boolean> {
  const url = ENV.DATABASE_URL;
  if (!url || (!url.startsWith('mongodb://') && !url.startsWith('mongodb+srv://'))) {
    return false;
  }

  try {
    mongoClient = new MongoClient(url, {
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000,
    });
    await mongoClient.connect();
    mongoDb = mongoClient.db();
    isMongoConnected = true;
    console.log(`🍃 Connected to MongoDB: ${mongoDb.databaseName}`);

    // Seed defaults into MongoDB if empty
    const usersCount = await mongoDb.collection('users').countDocuments();
    if (usersCount === 0) {
      console.log('🌱 Seeding initial admin and accounts to MongoDB...');
      for (const u of dbStore.users) {
        await mongoDb.collection('users').insertOne({ ...u });
      }
      for (const a of dbStore.accounts) {
        await mongoDb.collection('connected_accounts').insertOne({ ...a });
      }
      for (const m of dbStore.media) {
        await mongoDb.collection('media_assets').insertOne({ ...m });
      }
      for (const r of dbStore.whatsappRecipients) {
        await mongoDb.collection('whatsapp_recipients').insertOne({ ...r });
      }
      console.log('✅ MongoDB initialized with default admin and demo channels');
    }
    return true;
  } catch (err: any) {
    console.warn(`ℹ️ MongoDB connection not available (${err.message}). Using local persistent database store.`);
    isMongoConnected = false;
    return false;
  }
}

// Automatically initiate MongoDB connection if URI is configured
if (ENV.DATABASE_URL && (ENV.DATABASE_URL.startsWith('mongodb://') || ENV.DATABASE_URL.startsWith('mongodb+srv://'))) {
  initMongo();
}

// Helper to strip MongoDB _id or normalize it
function normalizeDoc(doc: any) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { id: doc.id || _id?.toString(), ...rest };
}

// Unified Database Interface supporting MongoDB and fallback
export const db = {
  user: {
    findUnique: async ({ where }: { where: { email?: string; id?: string } }) => {
      if (isMongoConnected && mongoDb) {
        const query: any = {};
        if (where.email) query.email = where.email;
        if (where.id) query.id = where.id;
        const doc = await mongoDb.collection('users').findOne(query);
        return normalizeDoc(doc);
      }
      return dbStore.users.find(u => (where.email && u.email === where.email) || (where.id && u.id === where.id)) || null;
    },
    findFirst: async () => {
      if (isMongoConnected && mongoDb) {
        const doc = await mongoDb.collection('users').findOne({});
        return normalizeDoc(doc);
      }
      return dbStore.users[0] || null;
    },
    update: async ({ where, data }: any) => {
      if (isMongoConnected && mongoDb) {
        const query: any = {};
        if (where.email) query.email = where.email;
        if (where.id) query.id = where.id;
        await mongoDb.collection('users').updateOne(query, { $set: { ...data, updatedAt: new Date().toISOString() } });
        const updated = await mongoDb.collection('users').findOne(query);
        return normalizeDoc(updated);
      }
      const idx = dbStore.users.findIndex(u => (where.email && u.email === where.email) || (where.id && u.id === where.id));
      if (idx === -1) throw new Error('User not found');
      dbStore.users[idx] = { ...dbStore.users[idx], ...data, updatedAt: new Date().toISOString() };
      dbStore.save();
      return dbStore.users[idx];
    },
  },

  connectedAccount: {
    findMany: async (args?: any) => {
      if (isMongoConnected && mongoDb) {
        const query: any = {};
        if (args?.where?.platform) query.platform = args.where.platform;
        const docs = await mongoDb.collection('connected_accounts').find(query).toArray();
        return docs.map(normalizeDoc);
      }
      let result = [...dbStore.accounts];
      if (args?.where?.platform) {
        result = result.filter(a => a.platform === args.where.platform);
      }
      return result;
    },
    findUnique: async ({ where }: { where: { id?: string } }) => {
      if (isMongoConnected && mongoDb) {
        const doc = await mongoDb.collection('connected_accounts').findOne({ id: where.id });
        return normalizeDoc(doc);
      }
      return dbStore.accounts.find(a => a.id === where.id) || null;
    },
    create: async ({ data }: any) => {
      const newAcc = {
        id: data.id || `acc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      if (isMongoConnected && mongoDb) {
        await mongoDb.collection('connected_accounts').insertOne({ ...newAcc });
        return newAcc;
      }
      dbStore.accounts.push(newAcc);
      dbStore.save();
      return newAcc;
    },
    update: async ({ where, data }: any) => {
      if (isMongoConnected && mongoDb) {
        await mongoDb.collection('connected_accounts').updateOne({ id: where.id }, { $set: { ...data, updatedAt: new Date().toISOString() } });
        const doc = await mongoDb.collection('connected_accounts').findOne({ id: where.id });
        return normalizeDoc(doc);
      }
      const idx = dbStore.accounts.findIndex(a => a.id === where.id);
      if (idx === -1) throw new Error('Account not found');
      dbStore.accounts[idx] = { ...dbStore.accounts[idx], ...data, updatedAt: new Date().toISOString() };
      dbStore.save();
      return dbStore.accounts[idx];
    },
    delete: async ({ where }: any) => {
      if (isMongoConnected && mongoDb) {
        const doc = await mongoDb.collection('connected_accounts').findOne({ id: where.id });
        await mongoDb.collection('connected_accounts').deleteOne({ id: where.id });
        return normalizeDoc(doc);
      }
      const idx = dbStore.accounts.findIndex(a => a.id === where.id);
      if (idx !== -1) {
        const removed = dbStore.accounts.splice(idx, 1)[0];
        dbStore.save();
        return removed;
      }
      return null;
    },
  },

  socialPost: {
    findMany: async (args?: any) => {
      if (isMongoConnected && mongoDb) {
        const query: any = {};
        if (args?.where?.status) query.status = args.where.status;
        const posts = await mongoDb.collection('social_posts').find(query).sort({ createdAt: -1 }).toArray();
        const hydrated = [];
        for (const p of posts) {
          hydrated.push(await hydratePostMongo(p, mongoDb));
        }
        return hydrated;
      }
      let posts = [...dbStore.posts];
      if (args?.where?.status) {
        posts = posts.filter(p => p.status === args.where.status);
      }
      posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return posts.map(p => hydratePostLocal(p));
    },
    findUnique: async ({ where }: any) => {
      if (isMongoConnected && mongoDb) {
        const p = await mongoDb.collection('social_posts').findOne({ id: where.id });
        if (!p) return null;
        return hydratePostMongo(p, mongoDb);
      }
      const p = dbStore.posts.find(post => post.id === where.id);
      if (!p) return null;
      return hydratePostLocal(p);
    },
    create: async ({ data }: any) => {
      const id = data.id || `post-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();
      const newPost = {
        id,
        mainCaption: data.mainCaption,
        status: data.status || 'DRAFT',
        scheduledTime: data.scheduledTime || null,
        publishedAt: data.publishedAt || null,
        tags: data.tags || [],
        createdAt: now,
        updatedAt: now,
      };

      if (isMongoConnected && mongoDb) {
        await mongoDb.collection('social_posts').insertOne({ ...newPost });
        if (data.media && Array.isArray(data.media)) {
          for (let i = 0; i < data.media.length; i++) {
            await mongoDb.collection('post_media').insertOne({
              id: `pm-${id}-${data.media[i]}`,
              postId: id,
              mediaId: data.media[i],
              order: i,
            });
          }
        }
        if (data.targets && Array.isArray(data.targets)) {
          for (const t of data.targets) {
            await mongoDb.collection('post_targets').insertOne({
              id: `target-${id}-${t.platform.toLowerCase()}`,
              postId: id,
              platform: t.platform,
              connectedAccountId: t.connectedAccountId || null,
              customCaption: t.customCaption || null,
              status: t.status || 'PENDING',
              scheduledTime: t.scheduledTime || data.scheduledTime || null,
              publishedAt: null,
              remotePostId: null,
              publishedUrl: null,
              lastErrorCode: null,
              lastErrorMessage: null,
              recipientPhone: t.recipientPhone || null,
              locationId: t.locationId || null,
              ctaType: t.ctaType || null,
              ctaUrl: t.ctaUrl || null,
              attemptsCount: 0,
              createdAt: now,
              updatedAt: now,
            });
          }
        }
        return hydratePostMongo(newPost, mongoDb);
      }

      dbStore.posts.push(newPost);
      if (data.media && Array.isArray(data.media)) {
        data.media.forEach((mId: string, idx: number) => {
          dbStore.postMedia.push({
            id: `pm-${id}-${mId}`,
            postId: id,
            mediaId: mId,
            order: idx,
          });
        });
      }
      if (data.targets && Array.isArray(data.targets)) {
        data.targets.forEach((t: any) => {
          dbStore.targets.push({
            id: `target-${id}-${t.platform.toLowerCase()}`,
            postId: id,
            platform: t.platform,
            connectedAccountId: t.connectedAccountId || null,
            customCaption: t.customCaption || null,
            status: t.status || 'PENDING',
            scheduledTime: t.scheduledTime || data.scheduledTime || null,
            publishedAt: null,
            remotePostId: null,
            publishedUrl: null,
            lastErrorCode: null,
            lastErrorMessage: null,
            recipientPhone: t.recipientPhone || null,
            locationId: t.locationId || null,
            ctaType: t.ctaType || null,
            ctaUrl: t.ctaUrl || null,
            attemptsCount: 0,
            createdAt: now,
            updatedAt: now,
          });
        });
      }
      dbStore.save();
      return hydratePostLocal(newPost);
    },
    update: async ({ where, data }: any) => {
      if (isMongoConnected && mongoDb) {
        await mongoDb.collection('social_posts').updateOne({ id: where.id }, { $set: { ...data, updatedAt: new Date().toISOString() } });
        const doc = await mongoDb.collection('social_posts').findOne({ id: where.id });
        return hydratePostMongo(doc, mongoDb);
      }
      const idx = dbStore.posts.findIndex(p => p.id === where.id);
      if (idx === -1) throw new Error('Post not found');
      dbStore.posts[idx] = { ...dbStore.posts[idx], ...data, updatedAt: new Date().toISOString() };
      dbStore.save();
      return hydratePostLocal(dbStore.posts[idx]);
    },
    delete: async ({ where }: any) => {
      if (isMongoConnected && mongoDb) {
        const doc = await mongoDb.collection('social_posts').findOne({ id: where.id });
        await mongoDb.collection('social_posts').deleteOne({ id: where.id });
        await mongoDb.collection('post_targets').deleteMany({ postId: where.id });
        await mongoDb.collection('post_media').deleteMany({ postId: where.id });
        return normalizeDoc(doc);
      }
      const idx = dbStore.posts.findIndex(p => p.id === where.id);
      if (idx !== -1) {
        const removed = dbStore.posts.splice(idx, 1)[0];
        const tIndices = dbStore.targets.map((t, i) => (t.postId === where.id ? i : -1)).filter(i => i !== -1);
        for (let i = tIndices.length - 1; i >= 0; i--) dbStore.targets.splice(tIndices[i], 1);
        dbStore.save();
        return removed;
      }
      return null;
    },
  },

  postTarget: {
    findMany: async (args?: any) => {
      if (isMongoConnected && mongoDb) {
        const query: any = {};
        if (args?.where?.postId) query.postId = args.where.postId;
        if (args?.where?.status) query.status = args.where.status;
        const docs = await mongoDb.collection('post_targets').find(query).toArray();
        return docs.map(normalizeDoc);
      }
      let targets = [...dbStore.targets];
      if (args?.where?.postId) targets = targets.filter(t => t.postId === args.where.postId);
      if (args?.where?.status) targets = targets.filter(t => t.status === args.where.status);
      return targets;
    },
    findUnique: async ({ where }: any) => {
      if (isMongoConnected && mongoDb) {
        const doc = await mongoDb.collection('post_targets').findOne({ id: where.id });
        return normalizeDoc(doc);
      }
      return dbStore.targets.find(t => t.id === where.id) || null;
    },
    update: async ({ where, data }: any) => {
      if (isMongoConnected && mongoDb) {
        await mongoDb.collection('post_targets').updateOne({ id: where.id }, { $set: { ...data, updatedAt: new Date().toISOString() } });
        const doc = await mongoDb.collection('post_targets').findOne({ id: where.id });
        return normalizeDoc(doc);
      }
      const idx = dbStore.targets.findIndex(t => t.id === where.id);
      if (idx === -1) throw new Error('Target not found');
      dbStore.targets[idx] = { ...dbStore.targets[idx], ...data, updatedAt: new Date().toISOString() };
      dbStore.save();
      return dbStore.targets[idx];
    },
  },

  mediaAsset: {
    findMany: async () => {
      if (isMongoConnected && mongoDb) {
        const docs = await mongoDb.collection('media_assets').find({}).sort({ createdAt: -1 }).toArray();
        return docs.map(normalizeDoc);
      }
      return [...dbStore.media].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },
    findUnique: async ({ where }: any) => {
      if (isMongoConnected && mongoDb) {
        const doc = await mongoDb.collection('media_assets').findOne({ id: where.id });
        return normalizeDoc(doc);
      }
      return dbStore.media.find(m => m.id === where.id) || null;
    },
    create: async ({ data }: any) => {
      const newMedia = {
        id: data.id || `media-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      if (isMongoConnected && mongoDb) {
        await mongoDb.collection('media_assets').insertOne({ ...newMedia });
        return newMedia;
      }
      dbStore.media.push(newMedia);
      dbStore.save();
      return newMedia;
    },
    delete: async ({ where }: any) => {
      if (isMongoConnected && mongoDb) {
        const doc = await mongoDb.collection('media_assets').findOne({ id: where.id });
        await mongoDb.collection('media_assets').deleteOne({ id: where.id });
        return normalizeDoc(doc);
      }
      const idx = dbStore.media.findIndex(m => m.id === where.id);
      if (idx !== -1) {
        const removed = dbStore.media.splice(idx, 1)[0];
        dbStore.save();
        return removed;
      }
      return null;
    },
  },

  publishingJob: {
    create: async ({ data }: any) => {
      const job = {
        id: data.id || `job-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      if (isMongoConnected && mongoDb) {
        await mongoDb.collection('publishing_jobs').insertOne({ ...job });
        return job;
      }
      dbStore.jobs.push(job);
      dbStore.save();
      return job;
    },
    findMany: async (args?: any) => {
      if (isMongoConnected && mongoDb) {
        const query: any = {};
        if (args?.where?.status) query.status = args.where.status;
        const docs = await mongoDb.collection('publishing_jobs').find(query).toArray();
        return docs.map(normalizeDoc);
      }
      let list = [...dbStore.jobs];
      if (args?.where?.status) list = list.filter(j => j.status === args.where.status);
      return list;
    },
    update: async ({ where, data }: any) => {
      if (isMongoConnected && mongoDb) {
        await mongoDb.collection('publishing_jobs').updateOne({ id: where.id }, { $set: { ...data, updatedAt: new Date().toISOString() } });
        const doc = await mongoDb.collection('publishing_jobs').findOne({ id: where.id });
        return normalizeDoc(doc);
      }
      const idx = dbStore.jobs.findIndex(j => j.id === where.id);
      if (idx !== -1) {
        dbStore.jobs[idx] = { ...dbStore.jobs[idx], ...data, updatedAt: new Date().toISOString() };
        dbStore.save();
        return dbStore.jobs[idx];
      }
      return null;
    },
  },

  publishingAttempt: {
    create: async ({ data }: any) => {
      const attempt = {
        id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        ...data,
        startedAt: new Date().toISOString(),
      };
      if (isMongoConnected && mongoDb) {
        await mongoDb.collection('publishing_attempts').insertOne({ ...attempt });
        return attempt;
      }
      dbStore.attempts.push(attempt);
      dbStore.save();
      return attempt;
    },
    findMany: async (args?: any) => {
      if (isMongoConnected && mongoDb) {
        const query: any = {};
        if (args?.where?.targetId) query.targetId = args.where.targetId;
        const docs = await mongoDb.collection('publishing_attempts').find(query).sort({ startedAt: -1 }).toArray();
        return docs.map(normalizeDoc);
      }
      let list = [...dbStore.attempts];
      if (args?.where?.targetId) list = list.filter(a => a.targetId === args.where.targetId);
      list.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
      return list;
    },
  },

  auditLog: {
    create: async ({ data }: any) => {
      const log = {
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        ...data,
        createdAt: new Date().toISOString(),
      };
      if (isMongoConnected && mongoDb) {
        await mongoDb.collection('audit_logs').insertOne({ ...log });
        return log;
      }
      dbStore.auditLogs.push(log);
      dbStore.save();
      return log;
    },
    findMany: async (args?: any) => {
      if (isMongoConnected && mongoDb) {
        const docs = await mongoDb.collection('audit_logs').find({}).sort({ createdAt: -1 }).limit(args?.take || 50).toArray();
        return docs.map(normalizeDoc);
      }
      return [...dbStore.auditLogs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, args?.take || 50);
    },
  },

  applicationSetting: {
    findUnique: async ({ where }: any) => {
      if (isMongoConnected && mongoDb) {
        const doc = await mongoDb.collection('application_settings').findOne({ key: where.key });
        return normalizeDoc(doc);
      }
      return dbStore.settings.find(s => s.key === where.key) || null;
    },
    upsert: async ({ where, update, create }: any) => {
      if (isMongoConnected && mongoDb) {
        await mongoDb.collection('application_settings').updateOne(
          { key: where.key },
          { $set: { ...update, updatedAt: new Date().toISOString() }, $setOnInsert: { id: `setting-${Date.now()}`, ...create } },
          { upsert: true }
        );
        const doc = await mongoDb.collection('application_settings').findOne({ key: where.key });
        return normalizeDoc(doc);
      }
      const idx = dbStore.settings.findIndex(s => s.key === where.key);
      if (idx !== -1) {
        dbStore.settings[idx] = { ...dbStore.settings[idx], ...update, updatedAt: new Date().toISOString() };
        dbStore.save();
        return dbStore.settings[idx];
      }
      const newItem = { id: `setting-${Date.now()}`, ...create, updatedAt: new Date().toISOString() };
      dbStore.settings.push(newItem);
      dbStore.save();
      return newItem;
    },
  },

  whatsappRecipient: {
    findMany: async () => {
      if (isMongoConnected && mongoDb) {
        const docs = await mongoDb.collection('whatsapp_recipients').find({}).toArray();
        return docs.map(normalizeDoc);
      }
      return [...dbStore.whatsappRecipients];
    },
  },
};

async function hydratePostMongo(p: any, dbInstance: Db) {
  const normPost = normalizeDoc(p);
  const postMediaItems = await dbInstance
    .collection('post_media')
    .find({ postId: normPost.id })
    .sort({ order: 1 })
    .toArray();

  const mediaIds = postMediaItems.map(pm => pm.mediaId);
  const mediaDocs = await dbInstance
    .collection('media_assets')
    .find({ id: { $in: mediaIds } })
    .toArray();
  const media = mediaDocs.map(normalizeDoc);

  const targetDocs = await dbInstance
    .collection('post_targets')
    .find({ postId: normPost.id })
    .toArray();

  const accounts = await dbInstance.collection('connected_accounts').find({}).toArray();

  const targets = targetDocs.map(t => {
    const normT = normalizeDoc(t);
    const connectedAccount = accounts.find(a => a.id === normT.connectedAccountId);
    return {
      ...normT,
      connectedAccount: connectedAccount
        ? {
            id: connectedAccount.id,
            platform: connectedAccount.platform,
            accountName: connectedAccount.accountName,
            accountType: connectedAccount.accountType,
            avatarUrl: connectedAccount.avatarUrl,
            externalId: connectedAccount.externalId,
            status: connectedAccount.status,
            scopes: connectedAccount.scopes,
          }
        : null,
    };
  });

  return {
    ...normPost,
    media,
    targets,
  };
}

function hydratePostLocal(p: any) {
  const postMediaItems = dbStore.postMedia.filter(pm => pm.postId === p.id).sort((a, b) => a.order - b.order);
  const media = postMediaItems
    .map(pm => dbStore.media.find(m => m.id === pm.mediaId))
    .filter(Boolean);

  const targets = dbStore.targets
    .filter(t => t.postId === p.id)
    .map(t => {
      const connectedAccount = dbStore.accounts.find(a => a.id === t.connectedAccountId);
      return {
        ...t,
        connectedAccount: connectedAccount
          ? {
              id: connectedAccount.id,
              platform: connectedAccount.platform,
              accountName: connectedAccount.accountName,
              accountType: connectedAccount.accountType,
              avatarUrl: connectedAccount.avatarUrl,
              externalId: connectedAccount.externalId,
              status: connectedAccount.status,
              scopes: connectedAccount.scopes,
            }
          : null,
      };
    });

  return {
    ...p,
    media,
    targets,
  };
}
