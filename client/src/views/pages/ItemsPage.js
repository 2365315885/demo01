import React, { useEffect, useRef } from 'react';
import { Card, Col, Row, Table, Tag, Typography } from 'antd';

const echarts = window.echarts;

const stationData = [
  { name: '红旗区', stations: 12, normal: 10, overflow: 2 },
  { name: '卫滨区', stations: 8, normal: 7, overflow: 1 },
  { name: '凤泉区', stations: 6, normal: 5, overflow: 1 },
  { name: '牧野区', stations: 10, normal: 9, overflow: 1 },
  { name: '新乡县', stations: 15, normal: 12, overflow: 3 },
  { name: '获嘉县', stations: 9, normal: 8, overflow: 1 },
  { name: '原阳县', stations: 11, normal: 9, overflow: 2 },
  { name: '延津县', stations: 8, normal: 7, overflow: 1 },
  { name: '封丘县', stations: 10, normal: 8, overflow: 2 },
  { name: '卫辉市', stations: 14, normal: 12, overflow: 2 },
  { name: '辉县市', stations: 16, normal: 14, overflow: 2 },
  { name: '长垣市', stations: 13, normal: 11, overflow: 2 }
];

export default function ItemsPage() {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);

  useEffect(() => {
    if (!chartRef.current) return;
    if (!echarts) {
      console.error('ECharts 未加载');
      return;
    }

    const initChart = async () => {
      try {
        const response = await fetch('/xinxiang.json');
        const geoJson = await response.json();

        echarts.registerMap('xinxiang', geoJson);

        if (!chartInstanceRef.current) {
          chartInstanceRef.current = echarts.init(chartRef.current);
        }

        const mapData = stationData.map((item) => ({
          name: item.name,
          value: item.overflow,
          stations: item.stations,
          normal: item.normal,
          overflow: item.overflow
        }));

        const option = {
          title: {
            text: '新乡市垃圾投放站点分布',
            left: 'center',
            textStyle: { fontSize: 18, fontWeight: 'bold' }
          },
          tooltip: {
            trigger: 'item',
            formatter: (params) => {
              const data = params.data || {};
              return `<strong>${params.name}</strong><br/>
                投放站点：${data.stations || 0} 个<br/>
                <span style="color:#52c41a">正常：${data.normal || 0} 个</span><br/>
                <span style="color:#f5222d">满溢：${data.overflow || 0} 个</span>`;
            }
          },
          visualMap: {
            min: 0,
            max: 5,
            left: 'left',
            top: 'bottom',
            text: ['满溢多', '满溢少'],
            inRange: {
              color: ['#e6f7ff', '#bae7ff', '#91d5ff', '#69c0ff', '#40a9ff', '#1890ff']
            },
            calculable: true
          },
          series: [
            {
              name: '新乡市',
              type: 'map',
              map: 'xinxiang',
              roam: true,
              label: {
                show: true,
                fontSize: 10,
                color: '#333'
              },
              itemStyle: {
                areaColor: '#e6f7ff',
                borderColor: '#1890ff',
                borderWidth: 1
              },
              emphasis: {
                itemStyle: {
                  areaColor: '#bae7ff'
                },
                label: {
                  show: true,
                  fontWeight: 'bold'
                }
              },
              data: mapData
            }
          ]
        };

        chartInstanceRef.current.setOption(option);
        chartInstanceRef.current.resize();

        const handleResize = () => chartInstanceRef.current?.resize();
        window.addEventListener('resize', handleResize);

        return () => {
          window.removeEventListener('resize', handleResize);
        };
      } catch (error) {
        console.error('加载地图数据失败:', error);
      }
    };

    initChart();

    return () => {
      chartInstanceRef.current?.dispose();
      chartInstanceRef.current = null;
    };
  }, []);

  const columns = [
    { title: '区县', dataIndex: 'name', width: 100 },
    { title: '站点数', dataIndex: 'stations', width: 80, align: 'center' },
    {
      title: '正常',
      dataIndex: 'normal',
      width: 80,
      align: 'center',
      render: (v) => <Tag color="success">{v}</Tag>
    },
    {
      title: '满溢',
      dataIndex: 'overflow',
      width: 80,
      align: 'center',
      render: (v) => <Tag color={v > 0 ? 'error' : 'default'}>{v}</Tag>
    }
  ];

  const totalStations = stationData.reduce((sum, item) => sum + item.stations, 0);
  const totalNormal = stationData.reduce((sum, item) => sum + item.normal, 0);
  const totalOverflow = stationData.reduce((sum, item) => sum + item.overflow, 0);

  return (
    <div>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        投放站点管理
      </Typography.Title>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card size="small">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 'bold', color: '#1890ff' }}>{totalStations}</div>
              <div style={{ color: '#666' }}>总站点数</div>
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 'bold', color: '#52c41a' }}>{totalNormal}</div>
              <div style={{ color: '#666' }}>正常运行</div>
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 'bold', color: '#f5222d' }}>{totalOverflow}</div>
              <div style={{ color: '#666' }}>满溢预警</div>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} lg={16}>
          <Card title="新乡市投放站点地图">
            <div ref={chartRef} style={{ height: 500, width: '100%' }} />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="各区县站点状态">
            <Table
              rowKey="name"
              columns={columns}
              dataSource={stationData}
              pagination={false}
              size="small"
              scroll={{ y: 440 }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
