import React, { useEffect, useMemo, useState } from 'react';
import { Button, Card, Form, Input, Modal, Select, Space, Table, Typography, message } from 'antd';
import dayjs from 'dayjs';

import { useApi } from '../../hooks/useApi.js';

export default function RecordsPage() {
  const api = useApi();
  const [categories, setCategories] = useState([
    { id: 'cat_recyclable', name: '可回收物' },
    { id: 'cat_kitchen', name: '厨余垃圾' },
    { id: 'cat_hazardous', name: '有害垃圾' },
    { id: 'cat_other', name: '其他垃圾' }
  ]);
  const [list, setList] = useState([
    { id: 'rec_001', itemName: '塑料瓶', categoryId: 'cat_recyclable', weightKg: 0.5, location: '红旗区', createdAt: new Date().toISOString() },
    { id: 'rec_002', itemName: '废纸箱', categoryId: 'cat_recyclable', weightKg: 1.2, location: '卫滨区', createdAt: new Date().toISOString() }
  ]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const categoryMap = useMemo(() => {
    const m = new Map();
    categories.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [categories]);

  const columns = useMemo(() => {
    return [
      { title: '物品', dataIndex: 'itemName' },
      { title: '分类', dataIndex: 'categoryId', render: (v) => categoryMap.get(v) || v },
      { title: '重量(kg)', dataIndex: 'weightKg' },
      { title: '地点', dataIndex: 'location' },
      { title: '时间', dataIndex: 'createdAt', render: (v) => dayjs(v).format('YYYY-MM-DD HH:mm') },
      {
        title: '操作',
        render: (_, row) => (
          <Space>
            <Button
              size="small"
              danger
              onClick={async () => {
                try {
                  await api.delete(`/api/records/${row.id}`);
                  message.success('已删除');
                  await load();
                } catch (e) {
                  message.error(e?.response?.data?.message || '删除失败');
                }
              }}
            >
              删除
            </Button>
          </Space>
        )
      }
    ];
  }, [api, categoryMap]);

  const load = async () => {
    setLoading(true);
    try {
      const [cResp, rResp] = await Promise.all([api.get('/api/categories'), api.get('/api/records')]);
      if (Array.isArray(cResp.data.list)) setCategories(cResp.data.list);
      if (Array.isArray(rResp.data.list)) setList(rResp.data.list);
    } catch (e) {
      message.warning(e?.response?.data?.message || '接口不可用，已展示示例数据');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onOk = async () => {
    const values = await form.validateFields();
    try {
      await api.post('/api/records', {
        ...values,
        weightKg: values.weightKg ? Number(values.weightKg) : 0
      });
      message.success('已新增');
      setOpen(false);
      form.resetFields();
      await load();
    } catch (e) {
      message.error(e?.response?.data?.message || '提交失败');
    }
  };

  return (
    <div>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        投放记录
      </Typography.Title>

      <Card
        extra={
          <Button type="primary" onClick={() => setOpen(true)}>
            新增投放
          </Button>
        }
      >
        <Table rowKey="id" columns={columns} dataSource={list} loading={loading} />
      </Card>

      <Modal
        title="新增投放"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={onOk}
        okText="保存"
      >
        <Form layout="vertical" form={form}>
          <Form.Item name="itemName" label="物品名称" rules={[{ required: true }]}>
            <Input placeholder="如：塑料瓶" />
          </Form.Item>
          <Form.Item name="categoryId" label="分类" rules={[{ required: true }]}>
            <Select placeholder="选择分类" options={categories.map((c) => ({ value: c.id, label: c.name }))} />
          </Form.Item>
          <Form.Item name="weightKg" label="重量(kg)">
            <Input placeholder="如：0.3" />
          </Form.Item>
          <Form.Item name="location" label="地点">
            <Input placeholder="如：红旗区" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
