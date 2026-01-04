import React, { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Carousel,
  Modal,
  Space,
  Typography,
  message,
  Form,
  Input,
  Row,
  Col,
  Checkbox,
  Tag,
  Radio,
  Spin
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, BellOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useApi } from '../../hooks/useApi.js';
import { useAuth } from '../../state/auth.js';

const { Title, Text } = Typography;
const { TextArea } = Input;

import lunbo1 from '../../assets/lunbo1.jpg';
import lunbo2 from '../../assets/lunbo2.jpg';
import lunbo3 from '../../assets/lunbo3.jpg';
import lunbo4 from '../../assets/lunbo4.jpg';

const CAROUSEL_ITEMS = [
  {
    title: '垃圾分类新规',
    desc: '2025年最新垃圾分类政策解读',
    img: lunbo1,
    color: '#1890ff',
    type: 'policy'
  },
  {
    title: '积分奖励活动',
    desc: '参与垃圾分类赢取丰厚奖励',
    img: lunbo2,
    color: '#52c41a',
    type: 'activity'
  },
  {
    title: '环保知识科普',
    desc: '学习环保知识，共建绿色家园',
    img: lunbo3,
    color: '#faad14',
    type: 'knowledge'
  },
  {
    title: '社区活动通知',
    desc: '最新社区环保活动信息',
    img: lunbo4,
    color: '#722ed1',
    type: 'community'
  }
];

const NOTICE_TYPES = {
  policy: { color: '#1890ff', icon: '📋', label: '政策通知' },
  activity: { color: '#52c41a', icon: '🎁', label: '活动公告' },
  knowledge: { color: '#faad14', icon: '📚', label: '知识科普' },
  community: { color: '#722ed1', icon: '🏘️', label: '社区动态' },
  urgent: { color: '#ff4d4f', icon: '⚠️', label: '紧急通知' }
};

export default function NoticesPage() {
  const api = useApi();
  const { user } = useAuth();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const isAdmin = user?.role === 'admin';

  const loadNotices = async () => {
    setLoading(true);
    try {
      const resp = await api.get('/api/notices');
      const noticeList = Array.isArray(resp.data.list) ? resp.data.list : [];
      const processedNotices = noticeList.map(notice => ({
        ...notice,
        type: notice.type || 'policy',
        isUrgent: notice.isUrgent !== undefined ? notice.isUrgent : false
      }));
      setNotices(processedNotices);
    } catch (e) {
      message.warning('加载公告失败，显示示例数据');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotices();
  }, []);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editing) {
        await api.put(`/api/notices/${editing.id}`, values);
        message.success('公告更新成功');
      } else {
        await api.post('/api/notices', values);
        message.success('公告发布成功');
      }
      setOpen(false);
      form.resetFields();
      setEditing(null);
      await loadNotices();
    } catch (err) {
      message.error(err?.response?.data?.message || '保存失败');
    }
  };

  const handleDelete = async (id) => {
    Modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: '确定要删除这条公告吗？此操作不可撤销。',
      okText: '确定',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          await api.delete(`/api/notices/${id}`);
          message.success('公告已删除');
          await loadNotices();
        } catch (err) {
          message.error('删除失败');
        }
      }
    });
  };

  const renderNoticeCard = (notice) => {
    const noticeType = NOTICE_TYPES[notice.type] || NOTICE_TYPES.policy;

    return (
      <Card
        key={notice.id}
        style={{
          marginBottom: '16px',
          borderRadius: '12px',
          borderLeft: `4px solid ${noticeType.color}`,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}
        actions={isAdmin ? [
          <EditOutlined
            key="edit"
            onClick={() => {
              setEditing(notice);
              form.setFieldsValue({
                title: notice.title,
                content: notice.content,
                type: notice.type,
                isUrgent: notice.isUrgent
              });
              setOpen(true);
            }}
          />,
          <DeleteOutlined
            key="delete"
            onClick={() => handleDelete(notice.id)}
            style={{ color: '#ff4d4f' }}
          />
        ] : []}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px', gap: '8px' }}>
            <Tag color={noticeType.color} style={{ margin: 0 }}>
              {noticeType.icon} {noticeType.label}
            </Tag>
            {notice.isUrgent && (
              <Tag color="red" icon={<ExclamationCircleOutlined />}>
                紧急
              </Tag>
            )}
            <Title level={5} style={{ margin: 0, flex: 1 }}>
              {notice.title}
            </Title>
          </div>

          <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '12px' }}>
            <BellOutlined style={{ marginRight: '4px' }} />
            发布人：{notice.createdBy} · {dayjs(notice.createdAt).format('YYYY-MM-DD HH:mm')}
          </Text>

          <div style={{
            lineHeight: 1.6,
            color: '#333',
            whiteSpace: 'pre-line',
            padding: '12px',
            background: '#f8f9fa',
            borderRadius: '6px'
          }}>
            {notice.content}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div style={{ padding: '0px', maxWidth: '1200px', margin: '0 auto' }}>
      <Card style={{ marginBottom: '24px', borderRadius: '12px', overflow: 'hidden', border: 'none' }}>
        <Carousel autoplay dots={{ className: 'custom-dots' }} effect="fade">
          {CAROUSEL_ITEMS.map((item, index) => (
            <div key={index} style={{ position: 'relative' }}>
              <img
                src={item.img}
                alt={item.title}
                style={{
                  width: '100%',
                  height: '400px',
                  objectFit: 'cover',
                  display: 'block'
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                  color: 'white',
                  padding: '20px'
                }}
              >
                <Title level={3} style={{ margin: 0, color: 'white' }}>{item.title}</Title>
                <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: '16px' }}>{item.desc}</Text>
              </div>
            </div>
          ))}
        </Carousel>
      </Card>

      <Card
        style={{
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
        }}
        bodyStyle={{ padding: '24px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <Title level={3} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <BellOutlined style={{ color: '#1890ff' }} />
              平台公告
            </Title>
            <Text type="secondary">
              共 {notices.length} 条公告
              {isAdmin && `（当前用户：${user.username} - 管理员）`}
            </Text>
          </div>
          {isAdmin && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="large"
              onClick={() => {
                setEditing(null);
                form.resetFields();
                setOpen(true);
              }}
              style={{ borderRadius: '8px' }}
            >
              发布新公告
            </Button>
          )}
        </div>

        <Spin spinning={loading}>
          {notices.length === 0 ? (
            <Card style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
              <Text type="secondary" style={{ fontSize: '16px' }}>
                {isAdmin ? '暂无公告，点击上方按钮发布第一条公告' : '暂无公告'}
              </Text>
            </Card>
          ) : (
            <div>
              {notices.map(renderNoticeCard)}
            </div>
          )}
        </Spin>
      </Card>

      {isAdmin && (
        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BellOutlined />
              {editing ? '编辑公告' : '发布新公告'}
            </div>
          }
          open={open}
          onCancel={() => {
            setOpen(false);
            setEditing(null);
            form.resetFields();
          }}
          onOk={handleSave}
          width={640}
          okText="保存"
          cancelText="取消"
          maskClosable={false}
        >
          <Form form={form} layout="vertical">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="title"
                  label="公告标题"
                  rules={[{ required: true, message: '请输入公告标题' }]}
                >
                  <Input placeholder="请输入公告标题" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="type"
                  label="公告类型"
                  initialValue="policy"
                  rules={[{ required: true, message: '请选择公告类型' }]}
                >
                  <Radio.Group>
                    <Space direction="vertical">
                      <Radio value="policy">📋 政策通知</Radio>
                      <Radio value="activity">🎁 活动公告</Radio>
                      <Radio value="knowledge">📚 知识科普</Radio>
                      <Radio value="community">🏘️ 社区动态</Radio>
                      <Radio value="urgent">⚠️ 紧急通知</Radio>
                    </Space>
                  </Radio.Group>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="content"
              label="公告内容"
              rules={[{ required: true, message: '请输入公告内容' }]}
            >
              <TextArea
                rows={6}
                placeholder="请输入公告详细内容..."
                showCount
                maxLength={1000}
              />
            </Form.Item>

            <Form.Item
              name="isUrgent"
              label="紧急程度"
              valuePropName="checked"
            >
              <Checkbox>标记为紧急公告</Checkbox>
            </Form.Item>
          </Form>
        </Modal>
      )}
    </div>
  );
}
