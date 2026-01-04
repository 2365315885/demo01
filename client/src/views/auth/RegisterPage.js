import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Alert, Button, Card, Form, Input, Typography } from 'antd';

import { createHttpClient } from '../../lib/http.js';
import { useAuth } from '../../state/auth.js';
import './LoginPage.css';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onFinish = async (values) => {
    setError('');
    setLoading(true);
    try {
      const http = createHttpClient(() => '', () => {});
      const resp = await http.post('/api/auth/register', {
        username: values.username,
        email: values.email,
        phone: values.phone,
        password: values.password
      });
      setSession(resp.data.token, resp.data.user);
      navigate('/app/dashboard', { replace: true });
    } catch (e) {
      setError(e?.response?.data?.message || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="login-shape shape-1"></div>
        <div className="login-shape shape-2"></div>
        <div className="login-shape shape-3"></div>
      </div>
      <Card className="login-card" bodyStyle={{ padding: '32px' }}>
        <div className="login-header">
          <div className="login-logo">
            <div className="logo-icon"></div>
          </div>
          <Typography.Title className="login-title" level={3}>
            垃圾分类管理平台
          </Typography.Title>
          <span className="login-subtitle">创建您的账号，开始使用平台</span>
        </div>
        {error ? <Alert className="login-error" type="error" showIcon message={error} /> : null}
        <Form className="login-form" layout="vertical" onFinish={onFinish}>
          <Form.Item
            className="login-form-item"
            name="username"
            label={
              <span>
                <span className="input-icon user-icon"></span>
                用户名
              </span>
            }
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, message: '用户名至少需要3个字符' }
            ]}
          >
            <Input
              autoFocus
              placeholder="请输入至少3位用户名"
              size="large"
            />
          </Form.Item>
          <Form.Item
            className="login-form-item"
            name="email"
            label={
              <span>
                <span className="input-icon email-icon"></span>
                邮箱
              </span>
            }
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' }
            ]}
          >
            <Input
              placeholder="请输入邮箱地址"
              size="large"
            />
          </Form.Item>
          <Form.Item
            className="login-form-item"
            name="phone"
            label={
              <span>
                <span className="input-icon phone-icon"></span>
                手机号
              </span>
            }
            rules={[
              { required: true, message: '请输入手机号' },
              { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号码' }
            ]}
          >
            <Input
              placeholder="请输入手机号码"
              size="large"
            />
          </Form.Item>
          <Form.Item
            className="login-form-item"
            name="password"
            label={
              <span>
                <span className="input-icon password-icon"></span>
                密码
              </span>
            }
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少需要6个字符' }
            ]}
          >
            <Input.Password
              placeholder="请输入至少6位密码"
              size="large"
            />
          </Form.Item>
          <Form.Item
            className="login-form-item"
            name="password2"
            label={
              <span>
                <span className="input-icon password-icon"></span>
                确认密码
              </span>
            }
            dependencies={['password']}
            rules={[
              { required: true, message: '请确认密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) return Promise.resolve();
                  return Promise.reject(new Error('两次输入的密码不一致'));
                }
              })
            ]}
          >
            <Input.Password
              placeholder="请再次输入密码"
              size="large"
            />
          </Form.Item>
          <Button
            className="login-button"
            type="primary"
            htmlType="submit"
            loading={loading}
            block
            size="large"
          >
            注册并登录
          </Button>
        </Form>
        <div className="login-footer">
          已有账号？<Link to="/login" className="register-link">去登录</Link>
        </div>
      </Card>
    </div>
  );
}
