import React, { useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Button, Dropdown, Layout, Menu, Typography } from 'antd';
import {
  DashboardOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  TagsOutlined,
  TeamOutlined,
  UnorderedListOutlined,
  LogoutOutlined,
  CommentOutlined,
  UserOutlined,
  SettingOutlined
} from '@ant-design/icons';

import { useAuth } from '../../state/auth.js';

const { Header, Sider, Content } = Layout;

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, clearSession } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const selectedKey = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith('/app/dashboard')) return 'dashboard';
    if (path.startsWith('/app/categories')) return 'categories';
    if (path.startsWith('/app/items')) return 'items';
    if (path.startsWith('/app/records')) return 'records';
    if (path.startsWith('/app/notices')) return 'notices';
    if (path.startsWith('/app/users')) return 'users';
    if (path.startsWith('/app/comments')) return 'comments';
    if (path.startsWith('/app/person')) return 'person';
    return 'dashboard';
  }, [location.pathname]);

  const items = useMemo(() => {
    const base = [
      { key: 'dashboard', icon: <DashboardOutlined />, label: '看板统计' },
      { key: 'categories', icon: <TagsOutlined />, label: '分类管理' },
      { key: 'items', icon: <EnvironmentOutlined />, label: '投放站点管理' },
      { key: 'records', icon: <UnorderedListOutlined />, label: '投放记录' },
      { key: 'notices', icon: <FileTextOutlined />, label: '公告管理' },
      { key: 'comments', icon: <CommentOutlined />, label: '评论管理' },
      { key: 'person', icon: <UserOutlined />, label: '我的' }
    ];

    if (user?.role === 'admin') {
      base.splice(6, 0, { key: 'users', icon: <TeamOutlined />, label: '用户管理' });
    }

    return base;
  }, [user?.role]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
        <div style={{ height: 48, display: 'flex', alignItems: 'center', paddingLeft: 16 }}>
          <Typography.Text style={{ color: '#fff', fontWeight: 600 }}>
            {collapsed ? 'GC' : '垃圾分类平台'}
          </Typography.Text>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={items}
          onClick={({ key }) => navigate(`/app/${key}`)}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px'
          }}
        >
          <Typography.Text>欢迎，{user?.username || '用户'}</Typography.Text>
          <Dropdown
            menu={{
              items: [
                {
                  key: 'logout',
                  icon: <LogoutOutlined />,
                  label: '退出登录',
                  onClick: () => {
                    clearSession();
                    navigate('/login');
                  }
                }
              ]
            }}
          >
            <Button icon={<SettingOutlined />}>账户</Button>
          </Dropdown>
        </Header>
        <Content style={{ padding: 16 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
