import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Alert, Button, Card, Form, Input, Radio, Typography, message } from 'antd';
import { EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';

import { createHttpClient } from '../../lib/http.js';
import { useAuth } from '../../state/auth.js';
import './LoginPage.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setSession } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginType, setLoginType] = useState('username');
  const [captchaCode, setCaptchaCode] = useState('');
  const [captchaImg, setCaptchaImg] = useState('');
  const [captchaLoading, setCaptchaLoading] = useState(false);

  const from = location.state?.from || '/app/dashboard';

  // 获取验证码
  const getCaptcha = async () => {
    setCaptchaLoading(true);
    try {
      const http = createHttpClient(() => '', () => {});
      const response = await http.get('/api/auth/captcha');
      setCaptchaImg(response.data.captchaImg);
      setCaptchaCode(response.data.captchaId);
    } catch (e) {
      message.error('获取验证码失败');
    } finally {
      setCaptchaLoading(false);
    }
  };

  // 发送验证码
  const sendVerificationCode = async () => {
    const account = document.getElementsByName('username')[0].value;
    if (!account) {
      message.error(`请先输入${loginFieldProps.label}`);
      return;
    }
    
    // 验证账号格式
    if (loginType === 'email' && !/^[\w-]+(\.[\w-]+)*@[\w-]+(\.[\w-]+)+$/.test(account)) {
      message.error('请输入有效的邮箱地址');
      return;
    }
    if (loginType === 'phone' && !/^1[3-9]\d{9}$/.test(account)) {
      message.error('请输入有效的手机号码');
      return;
    }

    try {
      const http = createHttpClient(() => '', () => {});
      await http.post('/api/auth/send-verification-code', {
        account,
        type: loginType,
        captchaId: captchaCode,
        captcha: document.getElementsByName('captcha')[0]?.value
      });
      message.success('验证码已发送，请查收');
      setCountdown(60);
    } catch (e) {
      message.error(e?.response?.data?.message || '发送验证码失败');
      // 刷新验证码
      getCaptcha();
    }
  };



  // 初始化获取验证码
  useEffect(() => {
    getCaptcha();
  }, []);

  const onFinish = async (values) => {
    setError('');
    setLoading(true);
    try {
      // 添加验证码ID到请求参数
      values.captchaId = captchaCode;
      const http = createHttpClient(() => '', () => {});
      const resp = await http.post('/api/auth/login', values);
      setSession(resp.data.token, resp.data.user);
      navigate(from, { replace: true });
    } catch (e) {
      setError(e?.response?.data?.message || '登录失败');
      // 登录失败时刷新验证码
      getCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const getLoginFieldProps = () => {
    switch (loginType) {
      case 'email':
        return {
          label: '邮箱',
          placeholder: '请输入邮箱地址',
          icon: 'email-icon',
          rules: [
            { required: true, message: '请输入邮箱' },
            { type: 'email', message: '请输入有效的邮箱地址' }
          ]
        };
      case 'phone':
        return {
          label: '手机号',
          placeholder: '请输入手机号码',
          icon: 'phone-icon',
          rules: [
            { required: true, message: '请输入手机号' },
            { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号码' }
          ]
        };
      default:
        return {
          label: '用户名',
          placeholder: '请输入用户名',
          icon: 'user-icon',
          rules: [{ required: true, message: '请输入用户名' }]
        };
    }
  };

  const loginFieldProps = getLoginFieldProps();

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
          <span className="login-subtitle">欢迎回来，请登录您的账号</span>
        </div>
        {error ? <Alert className="login-error" type="error" showIcon message={error} /> : null}
        <Form className="login-form" layout="vertical" onFinish={onFinish}>
          <div className="login-type-selector" style={{ marginBottom: 24 }}>
            <Radio.Group 
              value={loginType} 
              onChange={(e) => setLoginType(e.target.value)}
              buttonStyle="solid"
              style={{ width: '100%', display: 'flex' }}
            >
              <Radio.Button value="username" style={{ flex: 1, textAlign: 'center' }}>用户名登录</Radio.Button>
              <Radio.Button value="email" style={{ flex: 1, textAlign: 'center' }}>邮箱登录</Radio.Button>
              <Radio.Button value="phone" style={{ flex: 1, textAlign: 'center' }}>手机号登录</Radio.Button>
            </Radio.Group>
          </div>
          <Form.Item
            className="login-form-item"
            name="username"
            label={
              <span>
                <span className={`input-icon ${loginFieldProps.icon}`}></span>
                {loginFieldProps.label}
              </span>
            }
            rules={loginFieldProps.rules}
          >
            <Input
              autoFocus
              placeholder={loginFieldProps.placeholder}
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
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              placeholder="请输入密码"
              size="large"
              iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
            />
          </Form.Item>
          

          
          <Form.Item
            className="login-form-item"
            name="captcha"
            label={
              <span>
                <span className="input-icon captcha-icon"></span>
                验证码
              </span>
            }
            rules={[{ required: true, message: '请输入验证码' }]}
          >
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Input
                placeholder="请输入图形验证码"
                size="large"
                style={{ flex: 1 }}
              />
              <div
                style={{
                  width: 120,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #d9d9d9',
                  borderRadius: 6,
                  cursor: 'pointer',
                  background: '#f5f5f5',
                  overflow: 'hidden'
                }}
                onClick={getCaptcha}
                title="点击刷新验证码"
              >
                {captchaImg ? (
                  <img
                    src={`data:image/svg+xml;base64,${captchaImg}`}
                    alt="验证码"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span>获取验证码</span>
                )}
              </div>
            </div>
          </Form.Item>
          <Button
            className="login-button"
            type="primary"
            htmlType="submit"
            loading={loading}
            block
            size="large"
          >
            登录
          </Button>
        </Form>
        <div className="login-footer">
          没有账号？<Link to="/register" className="register-link">去注册</Link>
        </div>
      </Card>
    </div>
  );
}
