import React, { useEffect, useMemo, useState } from 'react';
import { 
  Button, Card, Form, Input, Modal, Select, Space, Table, Typography, message, 
  Tag, Statistic, Row, Col, Avatar, Tooltip
} from 'antd';
import { 
  UserOutlined, LockOutlined, CrownOutlined, TeamOutlined, 
  EditOutlined, ReloadOutlined, SafetyCertificateOutlined 
} from '@ant-design/icons';
import dayjs from 'dayjs';

import { useApi } from '../../hooks/useApi.js';
import { useAuth } from '../../state/auth.js';

export default function UsersPage() {
  const api = useApi();
  const { user } = useAuth();

  const [list, setList] = useState([
    { id: 'seed_admin', username: 'admin', role: 'admin', createdAt: new Date().toISOString() },
    { id: 'seed_demo', username: 'demo', role: 'user', createdAt: new Date().toISOString() }
  ]);
  const [loading, setLoading] = useState(false);
  const [openPwd, setOpenPwd] = useState(false);
  const [pwdUser, setPwdUser] = useState(null);
  const [pwdForm] = Form.useForm();

  const stats = useMemo(() => {
    const adminCount = list.filter(u => u.role === 'admin').length;
    const userCount = list.filter(u => u.role === 'user').length;
    return { adminCount, userCount, total: list.length };
  }, [list]);

  const columns = useMemo(() => {
    return [
      { 
        title: '用户', 
        dataIndex: 'username',
        render: (username, record) => (
          <Space>
            <Avatar 
              size="small" 
              style={{ 
                backgroundColor: record.role === 'admin' ? '#ff4d4f' : '#1890ff',
                fontSize: '12px'
              }}
              icon={record.role === 'admin' ? <CrownOutlined /> : <UserOutlined />}
            />
            <span style={{ fontWeight: 500 }}>{username}</span>
            {record.id === user?.id && (
              <Tag color="blue" size="small">当前用户</Tag>
            )}
          </Space>
        )
      },
      { 
        title: '角色', 
        dataIndex: 'role',
        render: (role) => (
          <Tag 
            color={role === 'admin' ? 'red' : 'blue'} 
            icon={role === 'admin' ? <CrownOutlined /> : <UserOutlined />}
          >
            {role === 'admin' ? '管理员' : '普通用户'}
          </Tag>
        )
      },
      { 
        title: '创建时间', 
        dataIndex: 'createdAt', 
        render: (v) => (
          <span style={{ color: '#666', fontSize: '12px' }}>
            {dayjs(v).format('YYYY-MM-DD HH:mm')}
          </span>
        )
      },
      {
        title: '操作',
        width: 200,
        render: (_, row) => (
          <Space size="small">
            <Tooltip title="修改角色">
              <Select
                size="small"
                value={row.role}
                style={{ width: 120 }}
                suffixIcon={<EditOutlined />}
                options={[
                  { value: 'user', label: '普通用户' },
                  { value: 'admin', label: '管理员' }
                ]}
                onChange={async (role) => {
                  try {
                    await api.put(`/api/users/${row.id}/role`, { role });
                    message.success('角色已更新');
                    await load();
                  } catch (e) {
                    message.error(e?.response?.data?.message || '更新失败');
                  }
                }}
              />
            </Tooltip>
            <Tooltip title="重置密码">
              <Button
                size="small"
                type="primary"
                icon={<LockOutlined />}
                onClick={() => {
                  setPwdUser(row);
                  pwdForm.resetFields();
                  setOpenPwd(true);
                }}
              >
                重置
              </Button>
            </Tooltip>
          </Space>
        )
      }
    ];
  }, [api, pwdForm, user]);

  const load = async () => {
    setLoading(true);
    try {
      const resp = await api.get('/api/users');
      if (Array.isArray(resp.data.list)) setList(resp.data.list);
    } catch (e) {
      message.warning(e?.response?.data?.message || '需要管理员权限或接口不可用，已展示示例数据');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onResetPwd = async () => {
    const values = await pwdForm.validateFields();
    try {
      await api.put(`/api/users/${pwdUser.id}/password`, { password: values.password });
      message.success('密码已重置');
      setOpenPwd(false);
      setPwdUser(null);
    } catch (e) {
      message.error(e?.response?.data?.message || '重置失败');
    }
  };

  return (
    <div style={{ padding: '24px', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh' }}>
      <Card 
        style={{ 
          borderRadius: '12px', 
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          border: 'none',
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(10px)'
        }}
      >
        <div style={{ marginBottom: '24px' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography.Title level={3} style={{ margin: 0, color: '#1890ff' }}>
                <TeamOutlined style={{ marginRight: '8px' }} />
                用户管理系统
              </Typography.Title>
              <Button 
                type="primary" 
                icon={<ReloadOutlined />} 
                onClick={load}
                loading={loading}
              >
                刷新数据
              </Button>
            </div>
            
            <Typography.Paragraph style={{ margin: 0, color: '#666' }}>
              <SafetyCertificateOutlined style={{ marginRight: '4px' }} />
              当前登录：<strong>{user?.username}</strong>（{user?.role === 'admin' ? '管理员' : '普通用户'}）
            </Typography.Paragraph>
          </Space>
        </div>

        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col span={8}>
            <Card 
              size="small" 
              style={{ textAlign: 'center', background: 'linear-gradient(45deg, #1890ff, #36cfc9)' }}
              bodyStyle={{ padding: '16px' }}
            >
              <Statistic
                title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>总用户数</span>}
                value={stats.total}
                valueStyle={{ color: '#fff' }}
                prefix={<TeamOutlined />}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card 
              size="small" 
              style={{ textAlign: 'center', background: 'linear-gradient(45deg, #52c41a, #73d13d)' }}
              bodyStyle={{ padding: '16px' }}
            >
              <Statistic
                title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>普通用户</span>}
                value={stats.userCount}
                valueStyle={{ color: '#fff' }}
                prefix={<UserOutlined />}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card 
              size="small" 
              style={{ textAlign: 'center', background: 'linear-gradient(45deg, #ff4d4f, #ff7875)' }}
              bodyStyle={{ padding: '16px' }}
            >
              <Statistic
                title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>管理员</span>}
                value={stats.adminCount}
                valueStyle={{ color: '#fff' }}
                prefix={<CrownOutlined />}
              />
            </Card>
          </Col>
        </Row>

        <Table 
          rowKey="id" 
          columns={columns} 
          dataSource={list} 
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
          }}
          style={{
            borderRadius: '8px',
            overflow: 'hidden'
          }}
        />
      </Card>

      <Modal
        title={
          <Space>
            <LockOutlined style={{ color: '#1890ff' }} />
            <span>重置密码：{pwdUser?.username || ''}</span>
            {pwdUser && (
              <Tag color={pwdUser.role === 'admin' ? 'red' : 'blue'}>
                {pwdUser.role === 'admin' ? '管理员' : '普通用户'}
              </Tag>
            )}
          </Space>
        }
        open={openPwd}
        onCancel={() => setOpenPwd(false)}
        onOk={onResetPwd}
        okText="确认重置"
        cancelText="取消"
        width={400}
      >
        <Form layout="vertical" form={pwdForm}>
          <Form.Item 
            name="password" 
            label="新密码" 
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码长度不能少于6位' }
            ]}
          >
            <Input.Password placeholder="请输入至少6位的新密码" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
