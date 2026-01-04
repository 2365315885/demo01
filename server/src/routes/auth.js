import { Router } from 'express';
import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';

import { query, queryOne, pickPublicUser } from '../store/db.js';
import { authMiddleware, signToken } from '../middleware/auth.js';

const router = Router();

// 存储验证码的内存存储（生产环境应使用Redis等持久化存储）
const captchaStore = new Map();

// 生成图形验证码
router.get('/captcha', (req, res) => {
  // 生成随机4位数字验证码
  const code = Math.floor(1000 + Math.random() * 9000).toString();
  
  // 创建简单的SVG验证码图片
  const width = 120;
  const height = 40;
  
  // 生成随机颜色
  const colors = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6'];
  const bgColor = '#f8f9fa';
  
  // 构建SVG
  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" style="background-color:${bgColor};">`;
  
  // 添加干扰线
  for (let i = 0; i < 3; i++) {
    const x1 = Math.random() * width;
    const y1 = Math.random() * height;
    const x2 = Math.random() * width;
    const y2 = Math.random() * height;
    const color = colors[Math.floor(Math.random() * colors.length)];
    svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="1" opacity="0.5" />`;
  }
  
  // 添加验证码文本
  const charWidth = width / (code.length + 1);
  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    const x = charWidth * (i + 1);
    const y = height / 2 + 5;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const rotation = Math.random() * 20 - 10; // -10到10度的随机旋转
    svg += `<text x="${x}" y="${y}" font-family="Arial" font-size="20" fill="${color}" text-anchor="middle" transform="rotate(${rotation} ${x} ${y})">${char}</text>`;
  }
  
  // 添加干扰点
  for (let i = 0; i < 20; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const color = colors[Math.floor(Math.random() * colors.length)];
    svg += `<circle cx="${x}" cy="${y}" r="1" fill="${color}" opacity="0.5" />`;
  }
  
  svg += `</svg>`;
  
  const captchaId = nanoid();
  // 存储验证码，5分钟后过期
  captchaStore.set(captchaId, {
    code: code.toLowerCase(),
    expiresAt: Date.now() + 5 * 60 * 1000
  });
  
  // 返回验证码图片和ID
  res.json({
    captchaImg: btoa(svg),
    captchaId
  });
});

router.post('/register', async (req, res) => {
  const { username, email, phone, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ message: '用户名和密码为必填项' });
  }

  // 检查用户名是否已存在
  const existsUsername = await queryOne(
    'SELECT id FROM users WHERE username = :username LIMIT 1',
    { username }
  );
  if (existsUsername) {
    return res.status(409).json({ message: '用户名已存在' });
  }

  // 检查邮箱是否已存在
  if (email) {
    const existsEmail = await queryOne(
      'SELECT id FROM users WHERE email = :email LIMIT 1',
      { email }
    );
    if (existsEmail) {
      return res.status(409).json({ message: '邮箱已被注册' });
    }
  }

  // 检查手机号是否已存在
  if (phone) {
    const existsPhone = await queryOne(
      'SELECT id FROM users WHERE phone = :phone LIMIT 1',
      { phone }
    );
    if (existsPhone) {
      return res.status(409).json({ message: '手机号已被注册' });
    }
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: nanoid(),
    username,
    email: email || null,
    phone: phone || null,
    password_hash: passwordHash,
    role: 'user',
    created_at: new Date()
  };

  await query(
    'INSERT INTO users (id, username, email, phone, password_hash, role, created_at) VALUES (:id, :username, :email, :phone, :password_hash, :role, :created_at)',
    user
  );

  const token = signToken({ sub: user.id, role: user.role });
  res.json({ token, user: pickPublicUser(user) });
});

router.post('/login', async (req, res) => {
  const { username, password, captcha, captchaId } = req.body || {};
  if (!username || !password || !captcha || !captchaId) {
    return res.status(400).json({ message: '请填写完整信息' });
  }
  
  // 验证图形验证码
  const storedCaptcha = captchaStore.get(captchaId);
  if (!storedCaptcha || storedCaptcha.expiresAt < Date.now()) {
    return res.status(400).json({ message: '验证码已过期' });
  }
  
  if (storedCaptcha.code !== captcha.toLowerCase()) {
    return res.status(400).json({ message: '验证码错误' });
  }
  
  // 删除已使用的验证码
  captchaStore.delete(captchaId);

  // 支持用户名、邮箱、手机号登录
  let user = null;
  
  // 判断输入类型并查询
  const isEmail = username.includes('@');
  const isPhone = /^1[3-9]\d{9}$/.test(username);
  
  if (isEmail) {
    user = await queryOne(
      'SELECT id, username, email, phone, password_hash, role, created_at FROM users WHERE email = :email LIMIT 1',
      { email: username }
    );
  } else if (isPhone) {
    user = await queryOne(
      'SELECT id, username, email, phone, password_hash, role, created_at FROM users WHERE phone = :phone LIMIT 1',
      { phone: username }
    );
  } else {
    user = await queryOne(
      'SELECT id, username, email, phone, password_hash, role, created_at FROM users WHERE username = :username LIMIT 1',
      { username }
    );
  }

  if (!user) {
    return res.status(401).json({ message: '账号或密码错误' });
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return res.status(401).json({ message: '账号或密码错误' });
  }

  const token = signToken({ sub: user.id, role: user.role });
  res.json({ token, user: pickPublicUser(user) });
});

router.get('/me', authMiddleware, async (req, res) => {
  const user = await queryOne(
    'SELECT id, username, email, phone, role, created_at FROM users WHERE id = :id LIMIT 1',
    { id: req.user.id }
  );
  if (!user) {
    return res.status(404).json({ message: 'user not found' });
  }
  res.json({ user: pickPublicUser(user) });
});

export default router;
