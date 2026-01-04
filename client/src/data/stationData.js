/**
 * 投放站点数据模块
 * 
 * 本文件包含新乡市各区县垃圾投放站点的统计数据
 * 可用于看板统计、数据分析等场景
 */

/**
 * 新乡市各区县投放站点数据
 * @type {Array<{name: string, stations: number, normal: number, overflow: number}>}
 * 
 * 数据字段说明:
 * - name: 区县名称（必须与地图 GeoJSON 中的名称一致）
 * - stations: 该区县的投放站点总数
 * - normal: 正常运行的站点数量
 * - overflow: 满溢预警的站点数量
 * 
 * 注意: stations = normal + overflow
 */
export const stationData = [
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

/**
 * 获取全市投放站点统计数据
 * @returns {{totalStations: number, totalNormal: number, totalOverflow: number, overflowRate: string}}
 * 
 * 返回值说明:
 * - totalStations: 全市总站点数
 * - totalNormal: 正常运行站点总数
 * - totalOverflow: 满溢预警站点总数
 * - overflowRate: 满溢率（百分比字符串，如 "15.0%"）
 */
export const getStationStats = () => {
  const totalStations = stationData.reduce((sum, item) => sum + item.stations, 0);
  const totalNormal = stationData.reduce((sum, item) => sum + item.normal, 0);
  const totalOverflow = stationData.reduce((sum, item) => sum + item.overflow, 0);
  
  return {
    totalStations,
    totalNormal,
    totalOverflow,
    overflowRate: ((totalOverflow / totalStations) * 100).toFixed(1) + '%'
  };
};

/**
 * 按站点数量排序区县（降序）
 * @returns {Array} 排序后的区县数据
 */
export const getDistrictsByStations = () => {
  return [...stationData].sort((a, b) => b.stations - a.stations);
};

/**
 * 按满溢数量排序区县（降序）
 * @returns {Array} 排序后的区县数据
 */
export const getDistrictsByOverflow = () => {
  return [...stationData].sort((a, b) => b.overflow - a.overflow);
};

/**
 * 按正常率排序区县（降序）
 * @returns {Array<{name: string, stations: number, normal: number, overflow: number, normalRate: number}>}
 */
export const getDistrictsByNormalRate = () => {
  return stationData
    .map(item => ({
      ...item,
      normalRate: (item.normal / item.stations * 100).toFixed(1)
    }))
    .sort((a, b) => b.normalRate - a.normalRate);
};

/**
 * 获取运行状态分组
 * @returns {{excellent: Array, good: Array, needAttention: Array}}
 * 
 * 分组标准:
 * - excellent: 正常率 ≥ 90%
 * - good: 80% ≤ 正常率 < 90%
 * - needAttention: 正常率 < 80%
 */
export const getDistrictsByStatus = () => {
  return {
    excellent: stationData.filter(d => d.normal / d.stations >= 0.9),
    good: stationData.filter(d => {
      const rate = d.normal / d.stations;
      return rate >= 0.8 && rate < 0.9;
    }),
    needAttention: stationData.filter(d => d.normal / d.stations < 0.8)
  };
};

/**
 * 获取用于 ECharts 饼图的数据格式
 * @returns {Array<{name: string, value: number}>}
 */
export const getPieChartData = () => {
  const stats = getStationStats();
  return [
    { name: '正常运行', value: stats.totalNormal },
    { name: '满溢预警', value: stats.totalOverflow }
  ];
};

/**
 * 获取用于 ECharts 柱状图的数据格式
 * @returns {{districts: Array<string>, stations: Array<number>, normal: Array<number>, overflow: Array<number>}}
 */
export const getBarChartData = () => {
  return {
    districts: stationData.map(item => item.name),
    stations: stationData.map(item => item.stations),
    normal: stationData.map(item => item.normal),
    overflow: stationData.map(item => item.overflow)
  };
};
