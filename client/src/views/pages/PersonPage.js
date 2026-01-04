import React, { useState } from 'react';
import { 
  Button, Card, Form, Input, Modal, Space, Typography, message, 
  Avatar, Row, Col, Statistic, Tag, Divider, Alert
} from 'antd';
import { 
  UserOutlined, LockOutlined, EditOutlined, SafetyCertificateOutlined, 
  CalendarOutlined, TeamOutlined, CrownOutlined, CheckCircleOutlined 
} from '@ant-design/icons';
import dayjs from 'dayjs';

import { useApi } from '../../hooks/useApi.js';
import { useAuth } from '../../state/auth.js';

export default function PersonPage() {
  const api = useApi();
  const { user, setSession } = useAuth();

  const [loading, setLoading] = useState(false);
  const [openUsername, setOpenUsername] = useState(false);
  const [openPassword, setOpenPassword] = useState(false);
  const [usernameForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  const onUpdateUsername = async () => {
    const values = await usernameForm.validateFields();
    if (values.newUsername === user?.username) {
      message.info('新用户名与当前用户名相同');
      return;
    }

    setLoading(true);
    try {
      await api.put(`/api/users/${user?.id}/username`, { username: values.newUsername });
      message.success('用户名修改成功');
      
      const updatedUser = { ...user, username: values.newUsername };
      setSession(localStorage.getItem('token'), updatedUser);
      
      setOpenUsername(false);
      usernameForm.resetFields();
    } catch (e) {
      message.error(e?.response?.data?.message || '用户名修改失败');
    } finally {
      setLoading(false);
    }
  };

  const onUpdatePassword = async () => {
    const values = await passwordForm.validateFields();
    setLoading(true);
    try {
      await api.put(`/api/users/${user?.id}/password-self`, { 
        newPassword: values.newPassword,
        oldPassword: values.oldPassword 
      });
      message.success('密码修改成功');
      setOpenPassword(false);
      passwordForm.resetFields();
    } catch (e) {
      message.error(e?.response?.data?.message || '密码修改失败');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Typography.Title level={3}>用户信息加载中...</Typography.Title>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh' }}>
      <Row gutter={[24, 24]}>
        <Col xs={24} md={8}>
          <Card 
            style={{ 
              borderRadius: '12px', 
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              border: 'none',
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(10px)',
              textAlign: 'center'
            }}
          >
            <Avatar 
              size={80} 
              style={{ 
                backgroundColor: user.role === 'admin' ? '#ff4d4f' : '#1890ff',
                marginBottom: '16px'
              }}
              icon={user.role === 'admin' ? <CrownOutlined /> : <UserOutlined />}
            />
            
            <Typography.Title level={3} style={{ margin: '8px 0' }}>
              {user.username}
            </Typography.Title>
            
            <Tag 
              color={user.role === 'admin' ? 'red' : 'blue'} 
              icon={user.role === 'admin' ? <CrownOutlined /> : <UserOutlined />}
              style={{ marginBottom: '16px' }}
            >
              {user.role === 'admin' ? '管理员' : '普通用户'}
            </Tag>
            
            <Divider />
            
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <Typography.Text type="secondary">
                <CalendarOutlined style={{ marginRight: '8px' }} />
                注册时间：{dayjs(user.createdAt).format('YYYY年MM月DD日')}
              </Typography.Text>
              
              <Typography.Text type="secondary">
                <TeamOutlined style={{ marginRight: '8px' }} />
                用户ID：{user.id}
              </Typography.Text>
            </Space>
          </Card>

          <Card 
            title="账户状态" 
            size="small" 
            style={{ marginTop: '16px', borderRadius: '8px' }}
          >
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic
                  title="账户状态"
                  value="正常"
                  prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                  valueStyle={{ color: '#52c41a', fontSize: '14px' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="角色权限"
                  value={user.role === 'admin' ? '管理员' : '用户'}
                  prefix={<SafetyCertificateOutlined style={{ color: '#1890ff' }} />}
                  valueStyle={{ color: '#1890ff', fontSize: '14px' }}
                />
              </Col>
            </Row>
          </Card>
        </Col>

        <Col xs={24} md={16}>
          <Card 
            title={
              <Space>
                <UserOutlined />
                <span>个人信息管理</span>
              </Space>
            }
            style={{ 
              borderRadius: '12px', 
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              border: 'none',
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(10px)'
            }}
          >
            <Alert
              message="个人信息安全提示"
              description="请妥善保管您的账户信息，定期修改密码以确保账户安全。"
              type="info"
              showIcon
              style={{ marginBottom: '24px' }}
            />

            <Card 
              type="inner" 
              title="修改用户名" 
              style={{ marginBottom: '16px' }}
              extra={
                <Button 
                  type="primary" 
                  icon={<EditOutlined />}
                  onClick={() => {
                    setOpenUsername(true);
                    usernameForm.setFieldsValue({ newUsername: user.username });
                  }}
                >
                  修改用户名
                </Button>
              }
            >
              <Typography.Paragraph>
                当前用户名：<strong>{user.username}</strong>
              </Typography.Paragraph>
              <Typography.Text type="secondary">
                用户名用于登录系统，修改后需要重新登录。
              </Typography.Text>
            </Card>

            <Card 
              type="inner" 
              title="修改密码"
              extra={
                <Button 
                  type="primary" 
                  icon={<LockOutlined />}
                  onClick={() => setOpenPassword(true)}
                >
                  修改密码
                </Button>
              }
            >
              <Typography.Paragraph>
                密码安全等级：<Tag color="green">良好</Tag>
              </Typography.Paragraph>
              <Typography.Text type="secondary">
                建议定期修改密码，使用包含字母、数字和特殊字符的组合。
              </Typography.Text>
            </Card>
          </Card>
        </Col>
      </Row>

      <Modal
        title={
          <Space>
            <EditOutlined style={{ color: '#1890ff' }} />
            <span>修改用户名</span>
          </Space>
        }
        open={openUsername}
        onCancel={() => setOpenUsername(false)}
        onOk={onUpdateUsername}
        okText="确认修改"
        cancelText="取消"
        confirmLoading={loading}
        width={400}
      >
        <Form layout="vertical" form={usernameForm}>
          <Form.Item 
            name="newUsername" 
            label="新用户名" 
            rules={[
              { required: true, message: '请输入新用户名' },
              { min: 3, message: '用户名长度不能少于3位' },
              { max: 20, message: '用户名长度不能超过20位' }
            ]}
          >
            <Input placeholder="请输入新的用户名" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          <Space>
            <LockOutlined style={{ color: '#1890ff' }} />
            <span>修改密码</span>
          </Space>
        }
        open={openPassword}
        onCancel={() => setOpenPassword(false)}
        onOk={onUpdatePassword}
        okText="确认修改"
        cancelText="取消"
        confirmLoading={loading}
        width={400}
      >
        <Form layout="vertical" form={passwordForm}>
          <Form.Item 
            name="oldPassword" 
            label="当前密码" 
            rules={[{ required: true, message: '请输入当前密码' }]}
          >
            <Input.Password placeholder="请输入当前密码" />
          </Form.Item>
          <Form.Item 
            name="newPassword" 
            label="新密码" 
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码长度不能少于6位' }
            ]}
          >
            <Input.Password placeholder="请输入至少6位的新密码" />
          </Form.Item>
          <Form.Item 
            name="confirmPassword" 
            label="确认新密码" 
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请确认新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="请再次输入新密码" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
