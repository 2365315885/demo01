import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { ensureInitialized } from './store/db.js';
import { authMiddleware } from './middleware/auth.js';

import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import categoriesRouter from './routes/categories.js';
import itemsRouter from './routes/items.js';
import recordsRouter from './routes/records.js';
import noticesRouter from './routes/notices.js';
import usersRouter from './routes/users.js';
import statsRouter from './routes/stats.js';
import commentsRouter from './routes/comments.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

await ensureInitialized();

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);

app.use('/api/categories', authMiddleware, categoriesRouter);
app.use('/api/items', authMiddleware, itemsRouter);
app.use('/api/records', authMiddleware, recordsRouter);
app.use('/api/notices', authMiddleware, noticesRouter);
app.use('/api/users', authMiddleware, usersRouter);
app.use('/api/stats', authMiddleware, statsRouter);
app.use('/api/comments', commentsRouter);

app.use((err, req, res, next) => {
  const status = err?.status || 500;
  res.status(status).json({ message: err?.message || 'Server error' });
});

const port = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
