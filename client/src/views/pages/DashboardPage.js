import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, Col, Row, Statistic, Table, Typography, message, Spin } from 'antd';
import { UserOutlined, DeleteOutlined, DatabaseOutlined, BookOutlined, PoundOutlined, TagsOutlined, NumberOutlined, EnvironmentOutlined } from '@ant-design/icons';

import { useApi } from '../../hooks/useApi.js';
import { stationData } from '../../data/stationData.js';
import './DashboardPage.css';

const echarts = window.echarts;

export default function DashboardPage() {
  const api = useApi();
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const polarChartRef = useRef(null);
  const polarChartInstanceRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [totals, setTotals] = useState({ categoryCount: 0, itemCount: 0, recordCount: 0, userCount: 0 });

  const transformData = (data) => {
    return data.map(item => {
      const weight = item.weight !== undefined ? item.weight : (item.count * (1.5 + Math.random() * 2));
      return {
        ...item,
        count: Math.round(item.count),
        weight: parseFloat(weight.toFixed(1))
      };
    });
  };

  const [recordsByCategory, setRecordsByCategory] = useState([
    { categoryId: 'cat_recyclable', categoryName: '可回收物', count: 15, weight: 23.5 },
    { categoryId: 'cat_kitchen', categoryName: '厨余垃圾', count: 25, weight: 42.3 },
    { categoryId: 'cat_hazardous', categoryName: '有害垃圾', count: 8, weight: 5.7 },
    { categoryId: 'cat_other', categoryName: '其他垃圾', count: 12, weight: 18.9 }
  ]);

  useEffect(() => {
    setRecordsByCategory(prevData => transformData(prevData));
  }, []);

  const columns = useMemo(() => {
    return [
      { 
        title: <span><TagsOutlined /> 分类</span>, 
        dataIndex: 'categoryName',
        render: (text) => <span>{text}</span>
      },
      { 
        title: <span><NumberOutlined /> 投放次数</span>, 
        dataIndex: 'count',
        sorter: (a, b) => a.count - b.count,
        render: (text) => <span>{text} 次</span>
      },
      { 
        title: <span><PoundOutlined /> 总重量(kg)</span>, 
        dataIndex: 'weight',
        sorter: (a, b) => a.weight - b.weight,
        render: (text) => <span>{text} kg</span>
      }
    ];
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const resp = await api.get('/api/stats');
        if (!mounted) return;
        setTotals(resp.data.totals);
        if (Array.isArray(resp.data.recordsByCategory) && resp.data.recordsByCategory.length > 0) {
          setRecordsByCategory(transformData(resp.data.recordsByCategory));
        }
      } catch (e) {
        message.warning(e?.response?.data?.message || '统计接口不可用，已展示示例数据');
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [api]);

  useEffect(() => {
    if (loading) return;
    if (!chartRef.current) return;
    if (!echarts) return;

    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartRef.current);
    }

    const data = recordsByCategory || [];
    const names = data.map((d) => d.categoryName);
    const values = data.map((d) => d.count);

    let maxIndex = 0, minIndex = 0;
    let maxValue = values[0] || 0, minValue = values[0] || 0;
    
    values.forEach((value, index) => {
      if (value > maxValue) {
        maxValue = value;
        maxIndex = index;
      }
      if (value < minValue) {
        minValue = value;
        minIndex = index;
      }
    });
    
    const markPoints = [
      {
        name: '最大值',
        coord: [maxIndex, maxValue],
        value: maxValue,
        itemStyle: { color: '#ff4d4f' },
        label: { 
          show: true, 
          position: 'top',
          formatter: '{b}: {c}次',
          color: '#ff4d4f'
        }
      },
      {
        name: '最小值',
        coord: [minIndex, minValue],
        value: minValue,
        itemStyle: { color: '#1890ff' },
        label: { 
          show: true, 
          position: 'top',
          formatter: '{b}: {c}次',
          color: '#1890ff'
        }
      }
    ];
    
    chartInstanceRef.current.setOption({
      tooltip: { 
        trigger: 'item',
        formatter: function(params) {
          return params.name + ': ' + Math.round(params.value) + '次';
        },
        backgroundColor: 'rgba(50, 50, 50, 0.8)',
        borderColor: '#333',
        textStyle: { color: '#fff' }
      },
      grid: { left: 40, right: 20, top: 60, bottom: 40 },
      xAxis: { 
        type: 'category', 
        data: names,
        axisLine: { lineStyle: { color: '#ccc' } },
        axisTick: { show: false },
        axisLabel: { color: '#666' }
      },
      yAxis: { 
        type: 'value',
        min: 0,
        max: 30,
        interval: 5,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { type: 'dashed', color: '#eee' } },
        axisLabel: {
          formatter: function(value) {
            return Math.round(value);
          },
          color: '#666'
        }
      },
      series: [
        {
          type: 'bar',
          data: values,
          barWidth: '50%',
          itemStyle: { 
            borderRadius: [6, 6, 0, 0],
            color: echarts.graphic ? new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#83bff6' },
              { offset: 0.5, color: '#188df0' },
              { offset: 1, color: '#188df0' }
            ]) : '#1890ff'
          },
          emphasis: {
            itemStyle: {
              color: echarts.graphic ? new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: '#2378f7' },
                { offset: 0.7, color: '#2378f7' },
                { offset: 1, color: '#83bff6' }
              ]) : '#40a9ff'
            }
          },
          markPoint: { data: markPoints }
        }
      ]
    });

    chartInstanceRef.current.resize();
    setTimeout(() => chartInstanceRef.current?.resize(), 0);

    const onResize = () => chartInstanceRef.current?.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
    };
  }, [recordsByCategory, loading]);

  // 极坐标柱状图
  useEffect(() => {
    if (!polarChartRef.current) return;
    if (!echarts) return;

    if (!polarChartInstanceRef.current) {
      polarChartInstanceRef.current = echarts.init(polarChartRef.current);
    }

    // 准备数据
    const districts = stationData.map(item => item.name);
    const normalStations = stationData.map(item => item.normal);
    const overflowStations = stationData.map(item => item.overflow);
    const totalStations = stationData.map(item => item.stations);

    // 设置极坐标柱状图配置
    polarChartInstanceRef.current.setOption({
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        formatter: function(params) {
          let result = params[0].name + '<br/>';
          params.forEach(param => {
            result += `<span style="display:inline-block;margin-right:5px;border-radius:10px;width:10px;height:10px;background-color:${param.color}"></span>`;
            result += `${param.seriesName}: ${param.value}个<br/>`;
          });
          return result;
        },
        backgroundColor: 'rgba(50, 50, 50, 0.8)',
        borderColor: '#333',
        textStyle: { color: '#fff' }
      },
      legend: {
        data: ['正常运行', '满溢预警'],
        orient: 'vertical',
        right: 10,
        top: 'center',
        textStyle: {
          color: '#666'
        }
      },
      polar: {
        radius: [30, '60%']
      },
      angleAxis: {
        max: Math.max(...totalStations) * 1.2,
        startAngle: 75
      },
      radiusAxis: {
        type: 'category',
        data: districts,
        z: 10,
        axisLabel: {
          rotate: 0,
          color: '#666',
          fontSize: 12
        }
      },
      series: [
        {
          name: '正常运行',
          type: 'bar',
          stack: '站点',
          data: normalStations,
          coordinateSystem: 'polar',
          itemStyle: {
            color: '#52c41a'
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        },
        {
          name: '满溢预警',
          type: 'bar',
          stack: '站点',
          data: overflowStations,
          coordinateSystem: 'polar',
          itemStyle: {
            color: '#ff4d4f'
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }
      ]
    });

    polarChartInstanceRef.current.resize();
    setTimeout(() => polarChartInstanceRef.current?.resize(), 0);

    const onResize = () => polarChartInstanceRef.current?.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
    };
  }, []);

  useEffect(() => {
    return () => {
      chartInstanceRef.current?.dispose();
      chartInstanceRef.current = null;
      polarChartInstanceRef.current?.dispose();
      polarChartInstanceRef.current = null;
    };
  }, []);

  const totalRecords = useMemo(() => {
    return recordsByCategory.reduce((sum, item) => sum + item.count, 0);
  }, [recordsByCategory]);
  
  const totalWeight = useMemo(() => {
    return recordsByCategory.reduce((sum, item) => sum + (item.weight || 0), 0).toFixed(1);
  }, [recordsByCategory]);

  const { maxRecord, minRecord } = useMemo(() => {
    let max = { name: '', count: 0 };
    let min = { name: '', count: Infinity };
    
    recordsByCategory.forEach(item => {
      if (item.count > max.count) {
        max = { name: item.categoryName, count: item.count };
      }
      if (item.count < min.count) {
        min = { name: item.categoryName, count: item.count };
      }
    });
    
    return { maxRecord: max, minRecord: min };
  }, [recordsByCategory]);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <Typography.Title level={3} className="dashboard-title">
          垃圾分类数据看板
        </Typography.Title>
        <div className="dashboard-subtitle">实时监控垃圾分类投放情况</div>
      </div>

      <Row gutter={[16, 16]} className="stats-row">
        <Col xs={24} sm={12} lg={5}>
          <Card className="stat-card category-card" bordered={false}>
            <Statistic
              title={<span className="stat-title"><DatabaseOutlined /> 分类数</span>}
              value={totals.categoryCount}
              prefix={<DatabaseOutlined className="stat-icon" />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={5}>
          <Card className="stat-card item-card" bordered={false}>
            <Statistic
              title={<span className="stat-title"><BookOutlined /> 知识库条目数</span>}
              value={totals.itemCount}
              prefix={<BookOutlined className="stat-icon" />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card className="stat-card record-card" bordered={false}>
            <Statistic
              title={<span className="stat-title"><DeleteOutlined /> 投放记录数</span>}
              value={totals.recordCount}
              prefix={<DeleteOutlined className="stat-icon" />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card className="stat-card user-card" bordered={false}>
            <Statistic
              title={<span className="stat-title"><UserOutlined /> 用户数</span>}
              value={totals.userCount}
              prefix={<UserOutlined className="stat-icon" />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card weight-card" bordered={false}>
            <Statistic
              title={<span className="stat-title"><PoundOutlined /> 总重量</span>}
              value={totalWeight}
              suffix="kg"
              prefix={<PoundOutlined className="stat-icon" />}
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]} className="charts-row">
        <Col xs={24} lg={16}>
          <Card 
            className="chart-card" 
            bordered={false}
            title={
              <div className="chart-title">
                <span>各分类投放次数</span>
                <div className="chart-legend">
                  <span className="legend-item max">最高: {maxRecord.name} ({maxRecord.count}次)</span>
                  <span className="legend-item min">最低: {minRecord.name} ({minRecord.count}次)</span>
                </div>
              </div>
            }
            extra={
              <div className="chart-extra">
                <span className="total-count">总投放: {totalRecords}次</span>
              </div>
            }
          >
            <Spin spinning={loading} tip="加载图表数据中...">
              <div ref={chartRef} className="chart-container" />
            </Spin>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card 
            className="table-card" 
            bordered={false}
            title="分类投放详情"
          >
            <Spin spinning={loading} tip="加载数据中...">
              <Table 
                rowKey="categoryId" 
                columns={columns} 
                dataSource={recordsByCategory} 
                pagination={false}
                size="middle"
                className="data-table"
              />
            </Spin>
          </Card>
        </Col>
      </Row>
      
      <Row gutter={[24, 24]} className="charts-row">
        <Col xs={24}>
          <Card
            className="chart-card"
            bordered={false}
            title={
              <div className="chart-title">
                <span><EnvironmentOutlined /> 各区县投放站点分布</span>
                <div className="chart-legend">
                  <span className="legend-item">站点总数: {stationData.reduce((sum, item) => sum + item.stations, 0)}个</span>
                </div>
              </div>
            }
          >
            <div ref={polarChartRef} className="chart-container" />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
