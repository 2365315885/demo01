import { Router } from 'express';
import { nanoid } from 'nanoid';
import { query, queryOne } from '../store/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/', async (req, res) => {
  const { postType, postId, parentId, includeAll } = req.query;

  const where = [];
  const params = {};

  if (postType) {
    where.push('post_type = :postType');
    params.postType = String(postType);
  }

  if (postId) {
    where.push('post_id = :postId');
    params.postId = String(postId);
  }

  if (includeAll === 'true') {
    // 获取所有评论
  } else if (parentId) {
    where.push('parent_id = :parentId');
    params.parentId = String(parentId);
  } else {
    where.push('parent_id IS NULL');
  }

  where.push('status = :status');
  params.status = 'active';

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : 'WHERE status = :status';
  const list = await query(
    `SELECT 
      c.id, 
      c.user_id AS userId, 
      c.content, 
      c.parent_id AS parentId, 
      c.post_type AS postType, 
      c.post_id AS postId, 
      c.likes_count AS likesCount, 
      c.created_at AS createdAt, 
      c.updated_at AS updatedAt,
      c.status,
      u.username AS userName
     FROM comments c
     LEFT JOIN users u ON c.user_id = u.id
     ${whereSql}
     ORDER BY c.created_at DESC`,
    params
  );

  res.json({ list });
});

router.post('/', authMiddleware, async (req, res) => {
  const { content, parentId, postType, postId } = req.body || {};

  if (!content || !postType || !postId) {
    return res.status(400).json({ message: '内容、帖子类型和帖子ID为必填项' });
  }

  if (content.length > 1000) {
    return res.status(400).json({ message: '评论内容不能超过1000个字符' });
  }

  if (parentId) {
    const parentComment = await queryOne(
      'SELECT id FROM comments WHERE id = :parentId AND status = :status LIMIT 1',
      { parentId, status: 'active' }
    );
    if (!parentComment) {
      return res.status(400).json({ message: '父评论不存在或已被删除' });
    }
  }

  const comment = {
    id: nanoid(),
    userId: req.user.id,
    content: content.trim(),
    parentId: parentId || null,
    postType,
    postId,
    likesCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'active'
  };

  await query(
    'INSERT INTO comments (id, user_id, content, parent_id, post_type, post_id, likes_count, created_at, updated_at, status) VALUES (:id, :user_id, :content, :parent_id, :post_type, :post_id, :likes_count, :created_at, :updated_at, :status)',
    {
      id: comment.id,
      user_id: comment.userId,
      content: comment.content,
      parent_id: comment.parentId,
      post_type: comment.postType,
      post_id: comment.postId,
      likes_count: comment.likesCount,
      created_at: comment.createdAt,
      updated_at: comment.updatedAt,
      status: comment.status
    }
  );

  res.json({ comment });
});

router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { content } = req.body || {};

  if (!content) {
    return res.status(400).json({ message: '内容为必填项' });
  }

  if (content.length > 1000) {
    return res.status(400).json({ message: '评论内容不能超过1000个字符' });
  }

  const comment = await queryOne(
    'SELECT id, user_id AS userId, status FROM comments WHERE id = :id LIMIT 1',
    { id }
  );

  if (!comment) {
    return res.status(404).json({ message: '评论不存在' });
  }

  if (comment.status !== 'active') {
    return res.status(400).json({ message: '评论已被删除，无法编辑' });
  }

  const canEdit = req.user.role === 'admin' || comment.userId === req.user.id;
  if (!canEdit) {
    return res.status(403).json({ message: '无权限编辑此评论' });
  }

  await query(
    'UPDATE comments SET content = :content, updated_at = :updatedAt WHERE id = :id',
    {
      content: content.trim(),
      updatedAt: new Date(),
      id
    }
  );

  const updatedComment = await queryOne(
    `SELECT 
      c.id, 
      c.user_id AS userId, 
      c.content, 
      c.parent_id AS parentId, 
      c.post_type AS postType, 
      c.post_id AS postId, 
      c.likes_count AS likesCount, 
      c.created_at AS createdAt, 
      c.updated_at AS updatedAt,
      c.status,
      u.username AS userName
     FROM comments c
     LEFT JOIN users u ON c.user_id = u.id
     WHERE c.id = :id LIMIT 1`,
    { id }
  );

  res.json({ comment: updatedComment });
});

router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;

  const comment = await queryOne(
    'SELECT id, user_id AS userId, status FROM comments WHERE id = :id LIMIT 1',
    { id }
  );

  if (!comment) {
    return res.status(404).json({ message: '评论不存在' });
  }

  const canDelete = req.user.role === 'admin' || comment.userId === req.user.id;
  if (!canDelete) {
    return res.status(403).json({ message: '无权限删除此评论' });
  }

  await deleteCommentAndChildren(id);

  res.json({ ok: true });
});

async function deleteCommentAndChildren(commentId) {
  const children = await query(
    'SELECT id FROM comments WHERE parent_id = :commentId',
    { commentId }
  );

  for (const child of children) {
    await deleteCommentAndChildren(child.id);
  }

  await query('DELETE FROM comment_likes WHERE comment_id = :commentId', { commentId });
  await query('DELETE FROM comments WHERE id = :commentId', { commentId });
}

router.post('/:id/like', authMiddleware, async (req, res) => {
  const { id: commentId } = req.params;

  const comment = await queryOne(
    'SELECT id, status FROM comments WHERE id = :commentId LIMIT 1',
    { commentId }
  );

  if (!comment || comment.status !== 'active') {
    return res.status(404).json({ message: '评论不存在或已被删除' });
  }

  const existingLike = await queryOne(
    'SELECT id FROM comment_likes WHERE comment_id = :commentId AND user_id = :userId LIMIT 1',
    {
      commentId,
      userId: req.user.id
    }
  );

  if (existingLike) {
    return res.status(400).json({ message: '已经点赞过此评论' });
  }

  await query(
    'INSERT INTO comment_likes (id, comment_id, user_id, created_at) VALUES (:id, :comment_id, :user_id, :created_at)',
    {
      id: nanoid(),
      comment_id: commentId,
      user_id: req.user.id,
      created_at: new Date()
    }
  );

  await query(
    'UPDATE comments SET likes_count = likes_count + 1, updated_at = :updatedAt WHERE id = :commentId',
    {
      updatedAt: new Date(),
      commentId
    }
  );

  res.json({ ok: true });
});

router.delete('/:id/like', authMiddleware, async (req, res) => {
  const { id: commentId } = req.params;

  const comment = await queryOne(
    'SELECT id, status FROM comments WHERE id = :commentId LIMIT 1',
    { commentId }
  );

  if (!comment || comment.status !== 'active') {
    return res.status(404).json({ message: '评论不存在或已被删除' });
  }

  const existingLike = await queryOne(
    'SELECT id FROM comment_likes WHERE comment_id = :commentId AND user_id = :userId LIMIT 1',
    {
      commentId,
      userId: req.user.id
    }
  );

  if (!existingLike) {
    return res.status(400).json({ message: '尚未点赞过此评论' });
  }

  await query(
    'DELETE FROM comment_likes WHERE comment_id = :commentId AND user_id = :userId',
    {
      commentId,
      userId: req.user.id
    }
  );

  await query(
    'UPDATE comments SET likes_count = GREATEST(likes_count - 1, 0), updated_at = :updatedAt WHERE id = :commentId',
    {
      updatedAt: new Date(),
      commentId
    }
  );

  res.json({ ok: true });
});

router.get('/:id/like/status', authMiddleware, async (req, res) => {
  const { id: commentId } = req.params;

  const existingLike = await queryOne(
    'SELECT id FROM comment_likes WHERE comment_id = :commentId AND user_id = :userId LIMIT 1',
    {
      commentId,
      userId: req.user.id
    }
  );

  res.json({ liked: !!existingLike });
});

export default router;
