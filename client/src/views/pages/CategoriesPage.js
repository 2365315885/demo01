import React from 'react';
import { Card, Col, Row, Typography } from 'antd';

const categories = [
  {
    id: 'cat_recyclable',
    name: '可回收物',
    description: '纸张、塑料、金属、玻璃等可循环利用的废弃物',
    image: '/images/recyclable.jpg',
    color: '#1890ff'
  },
  {
    id: 'cat_hazardous',
    name: '有害垃圾',
    description: '电池、灯管、过期药品等对环境有害的废弃物',
    image: '/images/hazardous.jpg',
    color: '#f5222d'
  },
  {
    id: 'cat_kitchen',
    name: '厨余垃圾',
    description: '剩饭剩菜、果皮、茶渣等易腐烂的有机垃圾',
    image: '/images/kitchen.jpg',
    color: '#52c41a'
  },
  {
    id: 'cat_other',
    name: '其他垃圾',
    description: '砖瓦陶瓷、卫生间废纸等难以归类的生活垃圾',
    image: '/images/other.jpg',
    color: '#8c8c8c'
  }
];

export default function CategoriesPage() {
  return (
    <div style={{ padding: '0 16px' }}>
      <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: 32 }}>
        垃圾分类指南
      </Typography.Title>

      <Row gutter={[24, 24]} justify="center">
        {categories.map((cat) => (
          <Col key={cat.id} xs={24} sm={12} md={6}>
            <Card
              hoverable
              cover={
                <div
                  style={{
                    padding: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#fafafa'
                  }}
                >
                  <img
                    alt={cat.name}
                    src={cat.image}
                    style={{
                      width: '100%',
                      height: 'auto',
                      objectFit: 'contain'
                    }}
                  />
                </div>
              }
              styles={{
                body: { padding: 16 }
              }}
            >
              <div
                style={{
                  borderLeft: `4px solid ${cat.color}`,
                  paddingLeft: 12
                }}
              >
                <Typography.Title
                  level={5}
                  style={{ margin: 0, color: cat.color }}
                >
                  {cat.name}
                </Typography.Title>
                <Typography.Paragraph
                  style={{
                    marginTop: 8,
                    marginBottom: 0,
                    color: '#666',
                    fontSize: 13,
                    lineHeight: 1.6
                  }}
                >
                  {cat.description}
                </Typography.Paragraph>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <div
        style={{
          marginTop: 40,
          padding: 24,
          background: 'linear-gradient(135deg, #e6f7ff 0%, #f0f5ff 100%)',
          borderRadius: 8,
          textAlign: 'center'
        }}
      >
        <Typography.Title level={5} style={{ marginBottom: 8 }}>
          温馨提示
        </Typography.Title>
        <Typography.Text style={{ color: '#666' }}>
          正确分类垃圾，保护环境从我做起。如有疑问，请查阅知识库条目或联系管理员。
        </Typography.Text>
      </div>
    </div>
  );
}
