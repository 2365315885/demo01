import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';

const dbHost = process.env.DB_HOST || '127.0.0.1';
const dbPort = process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306;
const dbUser = process.env.DB_USER || 'root';
const dbPassword = process.env.DB_PASSWORD || 'root';
const dbName = process.env.DB_NAME || 'garbage_platform';

let pool = null;

export async function getPool() {
  if (pool) return pool;
  pool = mysql.createPool({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: dbName,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    namedPlaceholders: true
  });
  return pool;
}

export async function query(sql, params = {}) {
  const p = await getPool();
  const [rows] = await p.execute(sql, params);
  return rows;
}

export async function queryOne(sql, params = {}) {
  const rows = await query(sql, params);
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

async function ensureDatabaseExists() {
  const conn = await mysql.createConnection({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    multipleStatements: true
  });
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci`);
  await conn.end();
}

export async function ensureInitialized() {
  await ensureDatabaseExists();

  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(32) PRIMARY KEY,
      username VARCHAR(64) NOT NULL UNIQUE,
      email VARCHAR(128) DEFAULT NULL,
      phone VARCHAR(20) DEFAULT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(16) NOT NULL,
      created_at DATETIME NOT NULL,
      INDEX idx_email (email),
      INDEX idx_phone (phone)
    ) ENGINE=InnoDB;
  `);

  // 尝试添加 email 和 phone 列（如果表已存在但没有这些列）
  try {
    await query(`ALTER TABLE users ADD COLUMN email VARCHAR(128) DEFAULT NULL AFTER username`);
  } catch (e) { /* 列可能已存在 */ }
  try {
    await query(`ALTER TABLE users ADD COLUMN phone VARCHAR(20) DEFAULT NULL AFTER email`);
  } catch (e) { /* 列可能已存在 */ }

  await query(`
    CREATE TABLE IF NOT EXISTS categories (
      id VARCHAR(32) PRIMARY KEY,
      name VARCHAR(64) NOT NULL,
      description TEXT NOT NULL,
      created_at DATETIME NOT NULL
    ) ENGINE=InnoDB;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS items (
      id VARCHAR(32) PRIMARY KEY,
      name VARCHAR(128) NOT NULL,
      category_id VARCHAR(32) NOT NULL,
      keywords_json TEXT NOT NULL,
      created_at DATETIME NOT NULL,
      CONSTRAINT fk_items_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS records (
      id VARCHAR(32) PRIMARY KEY,
      user_id VARCHAR(32) NOT NULL,
      item_name VARCHAR(128) NOT NULL,
      category_id VARCHAR(32) NOT NULL,
      weight_kg DECIMAL(10, 3) NOT NULL,
      location VARCHAR(255) NOT NULL,
      created_at DATETIME NOT NULL,
      CONSTRAINT fk_records_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_records_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS notices (
      id VARCHAR(32) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      type VARCHAR(32) DEFAULT 'policy',
      is_urgent BOOLEAN DEFAULT FALSE,
      created_by VARCHAR(64) NOT NULL,
      created_at DATETIME NOT NULL
    ) ENGINE=InnoDB;
  `);

  // 尝试添加 notices 表的新字段
  try {
    await query(`ALTER TABLE notices ADD COLUMN type VARCHAR(32) DEFAULT 'policy' AFTER content`);
  } catch (e) { /* 列可能已存在 */ }
  try {
    await query(`ALTER TABLE notices ADD COLUMN is_urgent BOOLEAN DEFAULT FALSE AFTER type`);
  } catch (e) { /* 列可能已存在 */ }

  // 创建评论表
  await query(`
    CREATE TABLE IF NOT EXISTS comments (
      id VARCHAR(32) PRIMARY KEY,
      user_id VARCHAR(32) NOT NULL,
      content TEXT NOT NULL,
      parent_id VARCHAR(32) DEFAULT NULL,
      post_type VARCHAR(32) NOT NULL,
      post_id VARCHAR(64) NOT NULL,
      likes_count INT DEFAULT 0,
      status VARCHAR(16) DEFAULT 'active',
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      INDEX idx_post (post_type, post_id),
      INDEX idx_parent (parent_id),
      INDEX idx_user (user_id),
      CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `);

  // 创建评论点赞表
  await query(`
    CREATE TABLE IF NOT EXISTS comment_likes (
      id VARCHAR(32) PRIMARY KEY,
      comment_id VARCHAR(32) NOT NULL,
      user_id VARCHAR(32) NOT NULL,
      created_at DATETIME NOT NULL,
      UNIQUE KEY uk_comment_user (comment_id, user_id),
      CONSTRAINT fk_comment_likes_comment FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
      CONSTRAINT fk_comment_likes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `);

  const userCountRow = await queryOne('SELECT COUNT(1) AS cnt FROM users');
  const userCount = Number(userCountRow?.cnt || 0);
  if (userCount === 0) {
    const adminId = 'seed_admin';
    const demoId = 'seed_demo';
    const adminHash = await bcrypt.hash('admin123', 10);
    const demoHash = await bcrypt.hash('demo123', 10);
    const now = new Date();

    await query(
      'INSERT INTO users (id, username, password_hash, role, created_at) VALUES (:id, :username, :password_hash, :role, :created_at)',
      { id: adminId, username: 'admin', password_hash: adminHash, role: 'admin', created_at: now }
    );
    await query(
      'INSERT INTO users (id, username, password_hash, role, created_at) VALUES (:id, :username, :password_hash, :role, :created_at)',
      { id: demoId, username: 'demo', password_hash: demoHash, role: 'user', created_at: now }
    );
  }

  const catCountRow = await queryOne('SELECT COUNT(1) AS cnt FROM categories');
  const catCount = Number(catCountRow?.cnt || 0);
  if (catCount === 0) {
    const now = new Date();
    await query(
      'INSERT INTO categories (id, name, description, created_at) VALUES (:id, :name, :description, :created_at)',
      { id: 'cat_recyclable', name: '可回收物', description: '纸张、塑料、金属、玻璃等', created_at: now }
    );
    await query(
      'INSERT INTO categories (id, name, description, created_at) VALUES (:id, :name, :description, :created_at)',
      { id: 'cat_kitchen', name: '厨余垃圾', description: '剩饭剩菜、果皮、茶渣等', created_at: now }
    );
    await query(
      'INSERT INTO categories (id, name, description, created_at) VALUES (:id, :name, :description, :created_at)',
      { id: 'cat_hazardous', name: '有害垃圾', description: '电池、灯管、过期药品等', created_at: now }
    );
    await query(
      'INSERT INTO categories (id, name, description, created_at) VALUES (:id, :name, :description, :created_at)',
      { id: 'cat_other', name: '其他垃圾', description: '难以归类的生活垃圾', created_at: now }
    );
  }

  const itemCountRow = await queryOne('SELECT COUNT(1) AS cnt FROM items');
  const itemCount = Number(itemCountRow?.cnt || 0);
  if (itemCount === 0) {
    const now = new Date();
    await query(
      'INSERT INTO items (id, name, category_id, keywords_json, created_at) VALUES (:id, :name, :category_id, :keywords_json, :created_at)',
      {
        id: 'it_bottle',
        name: '塑料瓶',
        category_id: 'cat_recyclable',
        keywords_json: JSON.stringify(['瓶子', '矿泉水', '饮料瓶']),
        created_at: now
      }
    );
    await query(
      'INSERT INTO items (id, name, category_id, keywords_json, created_at) VALUES (:id, :name, :category_id, :keywords_json, :created_at)',
      {
        id: 'it_battery',
        name: '电池',
        category_id: 'cat_hazardous',
        keywords_json: JSON.stringify(['干电池', '充电电池']),
        created_at: now
      }
    );
  }

  const noticeCountRow = await queryOne('SELECT COUNT(1) AS cnt FROM notices');
  const noticeCount = Number(noticeCountRow?.cnt || 0);
  if (noticeCount === 0) {
    const now = new Date();
    await query(
      'INSERT INTO notices (id, title, content, created_by, created_at) VALUES (:id, :title, :content, :created_by, :created_at)',
      {
        id: 'notice_demo_1',
        title: '欢迎使用垃圾分类平台',
        content: '此为示例公告（来自 MySQL 种子数据）。',
        created_by: 'admin',
        created_at: now
      }
    );
  }

  const recordCountRow = await queryOne('SELECT COUNT(1) AS cnt FROM records');
  const recordCount = Number(recordCountRow?.cnt || 0);
  if (recordCount === 0) {
    const now = new Date();
    await query(
      'INSERT INTO records (id, user_id, item_name, category_id, weight_kg, location, created_at) VALUES (:id, :user_id, :item_name, :category_id, :weight_kg, :location, :created_at)',
      {
        id: nanoid(),
        user_id: 'seed_admin',
        item_name: '塑料瓶',
        category_id: 'cat_recyclable',
        weight_kg: 0.2,
        location: '示例投放点',
        created_at: now
      }
    );
  }
}

export function pickPublicUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email || null,
    phone: user.phone || null,
    role: user.role,
    createdAt: user.createdAt ?? user.created_at
  };
}
