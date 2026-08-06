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

const observationFramesByRegion = {
  G01: {
    image: "../assets/aerial/real-scenes/g01-power-corridor.jpg",
    sourceName: "Valokas · Wikimedia Commons · CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Aerial_view_of_Porvoo_Ilola_electricity_pylons.jpg",
    targetClass: "power_pylon",
    targetName: "输电杆塔",
    boxes: [{ x: 21, y: 41, width: 10, height: 36, label: "杆塔" }],
  },
  G02: {
    image: "../assets/aerial/real-scenes/g02-mountain-landslide.jpg",
    sourceName: "James St. John · Wikimedia Commons · Public domain",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Mud_Creek_Landslide_(southeast_of_Gorda,_California,_USA).jpg",
    targetClass: "landslide",
    targetName: "滑坡区域",
    boxes: [{ x: 27, y: 5, width: 51, height: 80, label: "滑坡" }],
  },
  G03: {
    image: "../assets/aerial/real-scenes/g03-river-bridge.jpg",
    sourceName: "Bob Tan · Wikimedia Commons · CC BY 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Aerial_perspective_of_the_bridge_across_Dongshan_river.jpg",
    targetClass: "bridge",
    targetName: "跨河桥梁",
    boxes: [{ x: 19, y: 33, width: 63, height: 20, label: "桥梁" }],
  },
  G04: {
    image: "../assets/aerial/visdrone-road-observation.jpg",
    sourceName: "VisDrone公开数据集样例",
    sourceUrl: "https://github.com/VisDrone/VisDrone-Dataset",
    targetClass: "vehicle",
    targetName: "周界车辆",
    boxes: [
      { x: 31, y: 36, width: 11, height: 23, label: "车辆" },
      { x: 44, y: 51, width: 8, height: 13, label: "车辆" },
    ],
  },
  G05: {
    image: "../assets/aerial/real-scenes/g05-solar-farm.jpg",
    sourceName: "Saiphani02 · Wikimedia Commons · CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Solar_farm_at_Krishnapuram_Tatipudi_Water_Works_aerial_view_01.jpg",
    targetClass: "solar_panel",
    targetName: "光伏面板阵列",
    boxes: [{ x: 6, y: 43, width: 84, height: 49, label: "面板阵列" }],
  },
  G06: {
    image: "../assets/aerial/real-scenes/g06-communication-tower.jpg",
    sourceName: "Forest & Kim Starr · Wikimedia Commons · CC BY 3.0 US",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Starr-180305-2355-Acacia_mearnsii-aerial_view_communication_towers-Ulupalakua-Maui_(40524562164).jpg",
    targetClass: "communication_tower",
    targetName: "通信塔",
    boxes: [{ x: 42, y: 35, width: 12, height: 27, label: "通信塔" }],
  },
  G07: {
    image: "../assets/aerial/real-scenes/g07-construction-zone.jpg",
    sourceName: "日本国土交通省 · Wikimedia Commons · Attribution",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Aerial_photo_of_construction_site_of_Akabanedai_tunnel.jpg",
    targetClass: "construction_site",
    targetName: "施工扰动区域",
    boxes: [{ x: 21, y: 30, width: 58, height: 38, label: "施工区" }],
  },
  G08: {
    image: "../assets/aerial/real-scenes/g08-farmland.jpg",
    sourceName: "BahabarAdenArchives · Wikimedia Commons · CC BY 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Aerial_view_of_the_river_and_farmland_in_Agabar,_Somaliland_20_April_2024.jpg",
    targetClass: "farmland",
    targetName: "农田与河道",
    boxes: [{ x: 1, y: 17, width: 54, height: 67, label: "农田" }],
  },
};

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
      const observation = observationFramesByRegion[region?.id] ?? observationFramesByRegion.G04;
      points.push({
        id: `P${String(index + 1).padStart(2, "0")}`,
        x,
        y,
        trueRegionId: region?.id ?? "OUT",
        label: observation.targetName,
        targetClass: observation.targetClass,
        observation,
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
  const observation = observationFramesByRegion[lastRegion?.id] ?? observationFramesByRegion.G04;
  points.push({
    id: `P${String(index + 1).padStart(2, "0")}`,
    x: lastX,
    y: lastY,
    trueRegionId: lastRegion?.id ?? "OUT",
    label: observation.targetName,
    targetClass: observation.targetClass,
    observation,
    newClass: false,
    confidence: lastRegion?.currentAccuracy ?? 0.7,
    observedAt: new Date(start + index * 145000).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
    noiseX: Math.sin(index * 2.17 + 0.4),
    noiseY: Math.cos(index * 1.73 + 0.9),
  });
  return points;
}
