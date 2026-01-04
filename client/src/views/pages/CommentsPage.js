import React, { useEffect, useState } from 'react';
import {
    Button,
    Card,
    Form,
    Input,
    Modal,
    Space,
    Typography,
    message,
    Avatar,
    List,
    Tooltip,
    Popconfirm,
    FloatButton,
    Row,
    Col,
    Divider,
    Pagination
} from 'antd';
import {
    LikeOutlined,
    LikeFilled,
    MessageOutlined,
    DeleteOutlined,
    EditOutlined,
    UserOutlined,
    PlusOutlined,
    DownOutlined,
    UpOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

import { useApi } from '../../hooks/useApi.js';
import { useAuth } from '../../state/auth.js';

const { TextArea } = Input;

const getRelativeTime = (dateString) => {
    const date = dayjs(dateString);
    const now = dayjs();
    const diffInSeconds = now.diff(date, 'second');
    const diffInMinutes = now.diff(date, 'minute');
    const diffInHours = now.diff(date, 'hour');
    const diffInDays = now.diff(date, 'day');

    if (diffInSeconds < 60) {
        return '刚刚';
    } else if (diffInMinutes < 60) {
        return `${diffInMinutes}分钟前`;
    } else if (diffInHours < 24) {
        return `${diffInHours}小时前`;
    } else if (diffInDays < 7) {
        return `${diffInDays}天前`;
    } else {
        return date.format('YYYY-MM-DD');
    }
};

const fetchUserLikeStatus = async (api, commentId) => {
    try {
        const response = await api.get(`/api/comments/${commentId}/like/status`);
        return response.data.liked || false;
    } catch (error) {
        return false;
    }
};

const buildNestedCommentsWithLikes = async (api, flatComments) => {
    const commentMap = new Map();
    const rootComments = [];

    const activeComments = flatComments.filter(comment => comment.status === 'active');

    for (const comment of activeComments) {
        try {
            const liked = await fetchUserLikeStatus(api, comment.id);
            commentMap.set(comment.id, {
                ...comment,
                liked,
                likeCount: comment.likesCount || 0,
                replies: []
            });
        } catch (error) {
            commentMap.set(comment.id, {
                ...comment,
                liked: false,
                likeCount: comment.likesCount || 0,
                replies: []
            });
        }
    }

    for (const comment of activeComments) {
        const commentObj = commentMap.get(comment.id);
        if (comment.parentId) {
            const parent = commentMap.get(comment.parentId);
            if (parent) {
                if (!parent.replies.some(reply => reply.id === commentObj.id)) {
                    parent.replies.push(commentObj);
                }
            } else {
                if (!rootComments.some(c => c.id === commentObj.id)) {
                    rootComments.push(commentObj);
                }
            }
        } else {
            if (!rootComments.some(c => c.id === commentObj.id)) {
                rootComments.push(commentObj);
            }
        }
    }

    rootComments.forEach(comment => {
        if (comment.replies && comment.replies.length > 0) {
            comment.replies.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        }
    });

    rootComments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return rootComments;
};

export default function CommentsPage() {
    const api = useApi();
    const { user } = useAuth();
    const [comments, setComments] = useState([]);
    const [allComments, setAllComments] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(10);
    const [loading, setLoading] = useState(false);
    const [commentModalVisible, setCommentModalVisible] = useState(false);
    const [replyModalVisible, setReplyModalVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [currentComment, setCurrentComment] = useState(null);
    const [commentForm] = Form.useForm();
    const [replyForm] = Form.useForm();
    const [editForm] = Form.useForm();
    const [expandedReplies, setExpandedReplies] = useState(new Set());

    const toggleReplies = (commentId) => {
        setExpandedReplies(prev => {
            const newSet = new Set(prev);
            if (newSet.has(commentId)) {
                newSet.delete(commentId);
            } else {
                newSet.add(commentId);
            }
            return newSet;
        });
    };

    const loadComments = async () => {
        setLoading(true);
        try {
            let allCommentsData = [];

            try {
                const resp = await api.get('/api/comments?includeAll=true');
                allCommentsData = resp.data.list || [];
            } catch (e) {
                console.warn('获取评论失败:', e);
            }

            const nestedComments = await buildNestedCommentsWithLikes(api, allCommentsData);
            setAllComments(nestedComments);
            setComments(nestedComments.slice(0, pageSize));

            const commentsWithReplies = nestedComments.filter(comment => comment.replies && comment.replies.length > 0);
            const expandedIds = new Set(commentsWithReplies.map(comment => comment.id));
            setExpandedReplies(expandedIds);
        } catch (e) {
            message.warning(e?.response?.data?.message || '加载评论失败');
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (page) => {
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedComments = allComments.slice(startIndex, endIndex);
        setComments(paginatedComments);
        setCurrentPage(page);
    };

    useEffect(() => {
        loadComments();
    }, []);

    const handleSubmitComment = async (values) => {
        try {
            const commentData = {
                content: values.content,
                postType: 'discussion',
                postId: 'garbage_classification'
            };

            if (currentComment) {
                commentData.parentId = currentComment.id;
            }

            await api.post('/api/comments', commentData);
            message.success(currentComment ? '回复成功' : '评论发布成功');

            await loadComments();

            setCommentModalVisible(false);
            setReplyModalVisible(false);
            setEditModalVisible(false);
            setCurrentComment(null);
            commentForm.resetFields();
            replyForm.resetFields();
            editForm.resetFields();
        } catch (e) {
            message.error(e?.response?.data?.message || '发布失败');
        }
    };

    const handleEditComment = async (values) => {
        try {
            await api.put(`/api/comments/${currentComment.id}`, {
                content: values.content
            });
            message.success('评论更新成功');

            await loadComments();

            setEditModalVisible(false);
            setCurrentComment(null);
            editForm.resetFields();
        } catch (e) {
            message.error(e?.response?.data?.message || '更新失败');
        }
    };

    const handleDeleteComment = async (commentId) => {
        try {
            await api.delete(`/api/comments/${commentId}`);
            message.success('评论删除成功');

            await loadComments();
        } catch (e) {
            message.error(e?.response?.data?.message || '删除失败');
        }
    };

    const handleLikeComment = async (commentId, isLiked) => {
        try {
            if (isLiked) {
                await api.delete(`/api/comments/${commentId}/like`);
                message.success('取消点赞');
            } else {
                await api.post(`/api/comments/${commentId}/like`);
                message.success('点赞成功');
            }

            updateCommentLikeStatus(commentId, !isLiked);
        } catch (e) {
            message.error(e?.response?.data?.message || '操作失败');
        }
    };

    const updateCommentLikeStatus = (commentId, liked) => {
        const updateCommentInTree = (comments) => {
            return comments.map(comment => {
                if (comment.id === commentId) {
                    return {
                        ...comment,
                        liked,
                        likeCount: liked ? comment.likeCount + 1 : Math.max(comment.likeCount - 1, 0)
                    };
                }

                if (comment.replies && comment.replies.length > 0) {
                    return {
                        ...comment,
                        replies: updateCommentInTree(comment.replies)
                    };
                }

                return comment;
            });
        };

        setComments(prevComments => updateCommentInTree(prevComments));
        setAllComments(prevAllComments => updateCommentInTree(prevAllComments));
    };

    const renderCommentItem = (comment) => {
        if (comment.status === 'deleted') {
            return (
                <List.Item
                    key={comment.id}
                    style={{
                        borderBottom: '1px solid #f0f0f0',
                        padding: '16px 0',
                        marginLeft: comment.parentId ? '40px' : '0',
                        background: comment.parentId ? '#fafafa' : 'transparent',
                        color: '#999',
                        fontStyle: 'italic'
                    }}
                >
                    <div style={{ display: 'flex', width: '100%' }}>
                        <Avatar icon={<UserOutlined />} style={{ marginRight: 12 }} />
                        <div style={{ flex: 1 }}>
                            <div style={{ margin: '8px 0', lineHeight: 1.6 }}>
                                该评论已被删除
                            </div>
                        </div>
                    </div>
                </List.Item>
            );
        }

        return (
            <List.Item
                key={comment.id}
                style={{
                    borderBottom: '1px solid #f0f0f0',
                    padding: '16px 0',
                    marginLeft: comment.parentId ? '40px' : '0',
                    background: comment.parentId ? '#fafafa' : 'transparent'
                }}
            >
                <div style={{ display: 'flex', width: '100%' }}>
                    <Avatar icon={<UserOutlined />} style={{ marginRight: 12 }} />
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <span style={{ fontWeight: 600, marginRight: 8 }}>
                                    {comment.userName || comment.userId || '匿名用户'}
                                </span>
                                <Tooltip title={dayjs(comment.createdAt).format('YYYY-MM-DD HH:mm:ss')}>
                                    <span style={{ color: '#999', fontSize: '12px' }}>
                                        {getRelativeTime(comment.createdAt)}
                                    </span>
                                </Tooltip>
                            </div>
                        </div>

                        <div style={{ margin: '8px 0', lineHeight: 1.6 }}>
                            {comment.content}
                        </div>

                        <div style={{ display: 'flex', gap: '16px', fontSize: '14px' }}>
                            <span
                                style={{ cursor: 'pointer', color: comment.liked ? '#1890ff' : '#666' }}
                                onClick={() => handleLikeComment(comment.id, comment.liked)}
                            >
                                {comment.liked ? <LikeFilled /> : <LikeOutlined />}
                                <span style={{ marginLeft: 4 }}>{comment.likeCount}</span>
                            </span>

                            <span
                                style={{ cursor: 'pointer', color: '#666' }}
                                onClick={() => {
                                    setCurrentComment(comment);
                                    setReplyModalVisible(true);
                                }}
                            >
                                <MessageOutlined />
                                <span style={{ marginLeft: 4 }}>回复</span>
                            </span>

                            {comment.replies && comment.replies.length > 0 && (
                                <span
                                    style={{ cursor: 'pointer', color: '#666' }}
                                    onClick={() => toggleReplies(comment.id)}
                                >
                                    {expandedReplies.has(comment.id) ? (
                                        <>
                                            <UpOutlined />
                                            <span style={{ marginLeft: 4 }}>收起回复({comment.replies.length})</span>
                                        </>
                                    ) : (
                                        <>
                                            <DownOutlined />
                                            <span style={{ marginLeft: 4 }}>展开回复({comment.replies.length})</span>
                                        </>
                                    )}
                                </span>
                            )}

                            {(user?.id === comment.userId || user?.role === 'admin') && (
                                <>
                                    <span
                                        style={{ cursor: 'pointer', color: '#666' }}
                                        onClick={() => {
                                            setCurrentComment(comment);
                                            editForm.setFieldsValue({ content: comment.content });
                                            setEditModalVisible(true);
                                        }}
                                    >
                                        <EditOutlined />
                                        <span style={{ marginLeft: 4 }}>编辑</span>
                                    </span>

                                    <Popconfirm
                                        title="确定删除这条评论吗？"
                                        onConfirm={() => handleDeleteComment(comment.id)}
                                        okText="确定"
                                        cancelText="取消"
                                    >
                                        <span style={{ cursor: 'pointer', color: '#ff4d4f' }}>
                                            <DeleteOutlined />
                                            <span style={{ marginLeft: 4 }}>删除</span>
                                        </span>
                                    </Popconfirm>
                                </>
                            )}
                        </div>

                        {comment.replies && comment.replies.length > 0 && expandedReplies.has(comment.id) && (
                            <div style={{ marginTop: '16px', borderLeft: '2px solid #e8e8e8', paddingLeft: '16px' }}>
                                <List
                                    dataSource={comment.replies}
                                    renderItem={renderCommentItem}
                                    size="small"
                                    locale={{ emptyText: '' }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </List.Item>
        );
    };

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
            <Card
                style={{
                    marginBottom: 24,
                    background: 'linear-gradient(45deg, #4CAF50, #8BC34A)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 12
                }}
            >
                <Row gutter={[24, 24]} align="middle">
                    <Col xs={24} md={12}>
                        <Typography.Title level={2} style={{ color: 'white', margin: 0 }}>
                            垃圾分类，绿色生活
                        </Typography.Title>
                        <Typography.Paragraph style={{ color: 'white', fontSize: '16px', marginTop: 16 }}>
                            保护环境，从垃圾分类开始。让我们共同努力，为地球减负，为未来添彩！
                        </Typography.Paragraph>
                        <div style={{ marginTop: 24 }}>
                            <Space size="large">
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '24px', fontWeight: 'bold' }}>可回收物</div>
                                    <div style={{ fontSize: '14px' }}>纸张、塑料、金属等</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '24px', fontWeight: 'bold' }}>厨余垃圾</div>
                                    <div style={{ fontSize: '14px' }}>剩饭剩菜、果皮等</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '24px', fontWeight: 'bold' }}>有害垃圾</div>
                                    <div style={{ fontSize: '14px' }}>电池、灯管、药品等</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '24px', fontWeight: 'bold' }}>其他垃圾</div>
                                    <div style={{ fontSize: '14px' }}>难以归类的生活垃圾</div>
                                </div>
                            </Space>
                        </div>
                    </Col>
                    <Col xs={24} md={12}>
                        <div style={{
                            background: 'rgba(255,255,255,0.2)',
                            borderRadius: 8,
                            padding: 20,
                            textAlign: 'center'
                        }}>
                            <Typography.Title level={3} style={{ color: 'white' }}>
                                🌱 环保小贴士
                            </Typography.Title>
                            <Typography.Paragraph style={{ color: 'white', fontSize: '14px' }}>
                                1. 垃圾分类可以减少环境污染<br />
                                2. 可回收物可以循环利用<br />
                                3. 厨余垃圾可以制作有机肥料<br />
                                4. 有害垃圾需要特殊处理
                            </Typography.Paragraph>
                        </div>
                    </Col>
                </Row>
            </Card>

            <Divider>社区讨论</Divider>

            <Card
                title={`社区讨论 (${allComments.length})`}
                loading={loading}
                style={{ borderRadius: 12 }}
            >
                <List
                    dataSource={comments}
                    renderItem={renderCommentItem}
                    locale={{ emptyText: '暂无评论，快来发表你的看法吧！' }}
                />

                {allComments.length > pageSize && (
                    <div style={{ textAlign: 'center', marginTop: 20 }}>
                        <Pagination
                            current={currentPage}
                            pageSize={pageSize}
                            total={allComments.length}
                            onChange={handlePageChange}
                            showSizeChanger={false}
                            showQuickJumper
                        />
                    </div>
                )}
            </Card>

            <Modal
                title="发表评论"
                open={commentModalVisible}
                onCancel={() => {
                    setCommentModalVisible(false);
                    commentForm.resetFields();
                }}
                onOk={() => commentForm.submit()}
                okText="发布"
                cancelText="取消"
                width={600}
            >
                <Form form={commentForm} onFinish={handleSubmitComment}>
                    <Form.Item
                        name="content"
                        rules={[{ required: true, message: '请输入评论内容' }]}
                    >
                        <TextArea
                            rows={6}
                            placeholder="分享你对垃圾分类的看法和建议..."
                            maxLength={1000}
                            showCount
                        />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title={`回复 ${currentComment?.userName || currentComment?.userId || '用户'}`}
                open={replyModalVisible}
                onCancel={() => {
                    setReplyModalVisible(false);
                    setCurrentComment(null);
                    replyForm.resetFields();
                }}
                onOk={() => replyForm.submit()}
                okText="回复"
                cancelText="取消"
                width={600}
            >
                <Form form={replyForm} onFinish={handleSubmitComment}>
                    <Form.Item
                        name="content"
                        rules={[{ required: true, message: '请输入回复内容' }]}
                    >
                        <TextArea
                            rows={4}
                            placeholder="请输入回复内容..."
                            maxLength={500}
                            showCount
                        />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title="编辑评论"
                open={editModalVisible}
                onCancel={() => {
                    setEditModalVisible(false);
                    setCurrentComment(null);
                    editForm.resetFields();
                }}
                onOk={() => editForm.submit()}
                okText="保存"
                cancelText="取消"
                width={600}
            >
                <Form form={editForm} onFinish={handleEditComment}>
                    <Form.Item
                        name="content"
                        rules={[{ required: true, message: '请输入评论内容' }]}
                    >
                        <TextArea
                            rows={6}
                            placeholder="请输入评论内容..."
                            maxLength={1000}
                            showCount
                        />
                    </Form.Item>
                </Form>
            </Modal>

            <FloatButton
                icon={<PlusOutlined />}
                type="primary"
                style={{ right: 24 }}
                onClick={() => setCommentModalVisible(true)}
                tooltip="发表评论"
            />
        </div>
    );
}
