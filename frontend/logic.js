import { regionAt } from "./scenario.js";

export const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export function perturbRoutePoints(points, noiseMeters, mapWidthMeters = 1200, mapHeightMeters = 800) {
  const xScale = 100 / mapWidthMeters;
  const yScale = 100 / mapHeightMeters;
  return points.map((point) => {
    const observedX = clamp(point.x + point.noiseX * noiseMeters * xScale, 0, 100);
    const observedY = clamp(point.y + point.noiseY * noiseMeters * yScale, 0, 100);
    const assignedRegion = regionAt(observedX, observedY);
    return {
      ...point,
      observedX,
      observedY,
      assignedRegionId: assignedRegion?.id ?? "OUT",
      associationCorrect: assignedRegion?.id === point.trueRegionId,
    };
  });
}

export function computeDiagnostics(regions, positionedPoints) {
  return regions.map((region) => {
    const points = positionedPoints.filter((point) => point.trueRegionId === region.id);
    const mismatches = points.filter((point) => !point.associationCorrect).length;
    const mismatchRate = points.length ? mismatches / points.length : 0;
    const forgetting = Math.max(0, region.previousAccuracy - region.currentAccuracy);
    const normalizedForgetting = clamp(forgetting / 0.25);
    const positioningInstability = clamp(0.65 * mismatchRate + 0.35 * (1 - region.coordinateQuality));
    const instability = clamp(
      0.5 * normalizedForgetting + 0.3 * region.uncertainty + 0.2 * positioningInstability,
    );
    const risk = clamp(instability * region.consequence);
    let action = "常规巡检";
    let actionCode = "monitor";
    if (risk >= 0.55) {
      action = "立即复飞 + 人工复核";
      actionCode = "critical";
    } else if (risk >= 0.38) {
      action = "优先补采 + 增量更新";
      actionCode = "high";
    } else if (risk >= 0.22) {
      action = "进入重点观察清单";
      actionCode = "watch";
    }
    return {
      ...region,
      pointCount: points.length,
      mismatchCount: mismatches,
      mismatchRate,
      forgetting,
      positioningInstability,
      instability,
      risk,
      action,
      actionCode,
    };
  });
}

export function allocateRiskBudget(diagnostics, totalBudget) {
  if (!Number.isInteger(totalBudget) || totalBudget < diagnostics.length) {
    throw new Error("totalBudget must be an integer no smaller than the number of regions");
  }
  const baseWeight = 0.04;
  const weights = diagnostics.map((region) => baseWeight + region.risk ** 1.35);
  const sum = weights.reduce((value, weight) => value + weight, 0);
  const exact = weights.map((weight) => (weight / sum) * totalBudget);
  const allocation = exact.map((value) => Math.max(1, Math.floor(value)));
  let assigned = allocation.reduce((value, count) => value + count, 0);

  if (assigned < totalBudget) {
    const order = exact
      .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
      .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
    let cursor = 0;
    while (assigned < totalBudget) {
      allocation[order[cursor % order.length].index] += 1;
      assigned += 1;
      cursor += 1;
    }
  }

  while (assigned > totalBudget) {
    const index = allocation.reduce(
      (best, value, current) => (value > allocation[best] && value > 1 ? current : best),
      0,
    );
    allocation[index] -= 1;
    assigned -= 1;
  }

  const uniform = Math.floor(totalBudget / diagnostics.length);
  return diagnostics.map((region, index) => ({
    ...region,
    budget: allocation[index],
    uniformBudget: uniform + (index < totalBudget % diagnostics.length ? 1 : 0),
  }));
}

export function computeSummary(allocatedDiagnostics, positionedPoints, totalBudget) {
  const averageAccuracy = allocatedDiagnostics.reduce((sum, region) => sum + region.currentAccuracy, 0)
    / allocatedDiagnostics.length;
  const weightedForgetting = allocatedDiagnostics.reduce(
    (sum, region) => sum + region.forgetting * Math.max(1, region.sampleCount),
    0,
  ) / allocatedDiagnostics.reduce((sum, region) => sum + Math.max(1, region.sampleCount), 0);
  const correctAssociations = positionedPoints.filter((point) => point.associationCorrect).length;
  const highRisk = [...allocatedDiagnostics].sort((a, b) => b.risk - a.risk).slice(0, 3);
  const highRiskBudget = highRisk.reduce((sum, region) => sum + region.budget, 0);
  const criticalCount = allocatedDiagnostics.filter((region) => region.actionCode === "critical").length;
  return {
    averageAccuracy,
    weightedForgetting,
    associationAccuracy: positionedPoints.length ? correctAssociations / positionedPoints.length : 1,
    highRiskBudgetShare: highRiskBudget / totalBudget,
    criticalCount,
    topRiskRegion: highRisk[0],
  };
}

export function buildReport(meta, diagnostics, summary, settings) {
  return {
    generatedAt: new Date().toISOString(),
    prototypeStatus: settings.evidenceStatus ?? "simulation_only",
    disclaimer: meta.disclaimer,
    scenario: {
      name: meta.name,
      date: meta.date,
      coordinateSystem: meta.coordinateSystem,
    },
    settings,
    summary: {
      averageAccuracy: Number(summary.averageAccuracy.toFixed(4)),
      weightedForgetting: Number(summary.weightedForgetting.toFixed(4)),
      associationAccuracy: Number(summary.associationAccuracy.toFixed(4)),
      highRiskBudgetShare: Number(summary.highRiskBudgetShare.toFixed(4)),
      criticalCount: summary.criticalCount,
      topRiskRegion: summary.topRiskRegion.id,
    },
    regions: diagnostics.map((region) => ({
      id: region.id,
      name: region.name,
      risk: Number(region.risk.toFixed(4)),
      instability: Number(region.instability.toFixed(4)),
      consequence: region.consequence,
      accuracy: region.currentAccuracy,
      forgetting: Number(region.forgetting.toFixed(4)),
      positioningMismatchRate: Number(region.mismatchRate.toFixed(4)),
      replayBudget: region.budget,
      recommendedAction: region.action,
    })),
  };
}
