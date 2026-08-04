export const scenarioMeta = {
  name: "株洲北斗低空巡检仿真走廊",
  date: "2026-08-03",
  coordinateSystem: "WGS84（仿真坐标）",
  mapWidthMeters: 1200,
  mapHeightMeters: 800,
  baseLatitude: 27.8274,
  baseLongitude: 113.1332,
  disclaimer: "竞赛功能原型：坐标、目标和指标均为仿真数据，不代表真实部署效果。",
};

export const regions = [
  {
    id: "G01",
    name: "输电走廊",
    scene: "高压线路",
    bounds: [0, 0, 25, 50],
    consequence: 0.96,
    previousAccuracy: 0.91,
    currentAccuracy: 0.81,
    uncertainty: 0.31,
    sampleCount: 46,
    coordinateQuality: 0.91,
    assets: 18,
    classes: ["杆塔", "绝缘子", "异物悬挂"],
    lastInspection: "08:16",
  },
  {
    id: "G02",
    name: "山区边坡",
    scene: "地质隐患",
    bounds: [25, 0, 50, 50],
    consequence: 0.93,
    previousAccuracy: 0.88,
    currentAccuracy: 0.69,
    uncertainty: 0.52,
    sampleCount: 21,
    coordinateQuality: 0.72,
    assets: 11,
    classes: ["滑坡", "裂隙", "落石"],
    lastInspection: "08:31",
  },
  {
    id: "G03",
    name: "河谷跨越",
    scene: "桥梁水域",
    bounds: [50, 0, 75, 50],
    consequence: 0.86,
    previousAccuracy: 0.89,
    currentAccuracy: 0.78,
    uncertainty: 0.38,
    sampleCount: 34,
    coordinateQuality: 0.81,
    assets: 14,
    classes: ["桥墩", "漂浮物", "护栏"],
    lastInspection: "08:47",
  },
  {
    id: "G04",
    name: "城郊围栏",
    scene: "周界安防",
    bounds: [75, 0, 100, 50],
    consequence: 0.71,
    previousAccuracy: 0.93,
    currentAccuracy: 0.87,
    uncertainty: 0.24,
    sampleCount: 58,
    coordinateQuality: 0.94,
    assets: 26,
    classes: ["围栏", "车辆", "人员"],
    lastInspection: "09:04",
  },
  {
    id: "G05",
    name: "光伏场站",
    scene: "新能源设施",
    bounds: [0, 50, 25, 100],
    consequence: 0.82,
    previousAccuracy: 0.92,
    currentAccuracy: 0.84,
    uncertainty: 0.29,
    sampleCount: 63,
    coordinateQuality: 0.89,
    assets: 42,
    classes: ["面板", "热斑", "遮挡"],
    lastInspection: "09:21",
  },
  {
    id: "G06",
    name: "通信塔区",
    scene: "通信设施",
    bounds: [25, 50, 50, 100],
    consequence: 0.9,
    previousAccuracy: 0.9,
    currentAccuracy: 0.76,
    uncertainty: 0.43,
    sampleCount: 29,
    coordinateQuality: 0.79,
    assets: 9,
    classes: ["通信塔", "天线", "线缆"],
    lastInspection: "09:38",
  },
  {
    id: "G07",
    name: "施工扰动区",
    scene: "动态作业面",
    bounds: [50, 50, 75, 100],
    consequence: 0.88,
    previousAccuracy: 0.87,
    currentAccuracy: 0.64,
    uncertainty: 0.58,
    sampleCount: 17,
    coordinateQuality: 0.68,
    assets: 13,
    classes: ["工程车", "临建", "违建"],
    lastInspection: "09:55",
  },
  {
    id: "G08",
    name: "农田缓冲区",
    scene: "低风险过渡区",
    bounds: [75, 50, 100, 100],
    consequence: 0.42,
    previousAccuracy: 0.91,
    currentAccuracy: 0.88,
    uncertainty: 0.2,
    sampleCount: 71,
    coordinateQuality: 0.95,
    assets: 31,
    classes: ["农机", "道路", "植被"],
    lastInspection: "10:12",
  },
];

const routeAnchors = [
  [4, 18], [18, 30], [31, 17], [45, 34], [58, 19], [71, 38],
  [86, 20], [96, 36], [90, 60], [76, 77], [64, 61], [52, 83],
  [39, 65], [26, 84], [14, 67], [5, 88],
];

const labels = [
  "杆塔", "绝缘子", "裂隙", "落石", "桥墩", "护栏", "车辆", "围栏",
  "面板", "热斑", "通信塔", "线缆", "工程车", "违建", "农机", "道路",
];

export function regionAt(x, y) {
  return regions.find((region) => {
    const [x1, y1, x2, y2] = region.bounds;
    const inX = x >= x1 && (x < x2 || x2 === 100);
    const inY = y >= y1 && (y < y2 || y2 === 100);
    return inX && inY;
  });
}

export function buildRoutePoints() {
  const points = [];
  let index = 0;
  const start = Date.parse("2026-08-03T08:00:00+08:00");

  for (let segment = 0; segment < routeAnchors.length - 1; segment += 1) {
    const [x1, y1] = routeAnchors[segment];
    const [x2, y2] = routeAnchors[segment + 1];
    const steps = segment === routeAnchors.length - 2 ? 4 : 3;
    for (let step = 0; step < steps; step += 1) {
      const ratio = step / steps;
      const x = x1 + (x2 - x1) * ratio;
      const y = y1 + (y2 - y1) * ratio;
      const region = regionAt(x, y);
      const observedAt = new Date(start + index * 145000);
      points.push({
        id: `P${String(index + 1).padStart(2, "0")}`,
        x,
        y,
        trueRegionId: region?.id ?? "OUT",
        label: labels[index % labels.length],
        newClass: index === 10 || index === 37,
        confidence: Math.max(0.48, (region?.currentAccuracy ?? 0.7) - 0.07 + ((index * 17) % 14) / 100),
        observedAt: observedAt.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
        noiseX: Math.sin(index * 2.17 + 0.4),
        noiseY: Math.cos(index * 1.73 + 0.9),
      });
      index += 1;
    }
  }
  const [lastX, lastY] = routeAnchors.at(-1);
  const lastRegion = regionAt(lastX, lastY);
  points.push({
    id: `P${String(index + 1).padStart(2, "0")}`,
    x: lastX,
    y: lastY,
    trueRegionId: lastRegion?.id ?? "OUT",
    label: labels[index % labels.length],
    newClass: false,
    confidence: lastRegion?.currentAccuracy ?? 0.7,
    observedAt: new Date(start + index * 145000).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
    noiseX: Math.sin(index * 2.17 + 0.4),
    noiseY: Math.cos(index * 1.73 + 0.9),
  });
  return points;
}

