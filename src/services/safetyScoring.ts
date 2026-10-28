import { Coordinates, IncidentReport, RouteSafetyAnalysis, SafetyFactor } from '../types';

/**
 * Haversine formula to compute great-circle distance between two GPS coordinates in meters.
 */
export function haversineDistance(c1: Coordinates, c2: Coordinates): number {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(c2[0] - c1[0]);
  const dLon = toRad(c2[1] - c1[1]);
  const lat1 = toRad(c1[0]);
  const lat2 = toRad(c2[0]);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates a relative safety score (0 - 100) based on community reports
 * within a buffer radius along the path.
 *
 * NOTE: This is an illustrative college prototype advisory score derived
 * purely from crowdsourced user reports, not official government crime statistics.
 */
export function calculateRouteSafety(
  polyline: Coordinates[],
  reports: IncidentReport[],
  bufferDistanceMeters: number = 250
): RouteSafetyAnalysis {
  let score = 92; // Baseline starting score for paved public roadways (never 100 to avoid false absolute guarantee)
  let hazardsEncountered = 0;
  const identifiedRisks: string[] = [];
  const safetyFactors: SafetyFactor[] = [];
  let poorLightingCount = 0;
  let wellLitCount = 0;

  // If no polyline points, return baseline
  if (!polyline || polyline.length === 0) {
    return {
      score: 75,
      hazardsEncountered: 0,
      lightingAssessment: 'Lighting data unavailable',
      identifiedRisks: [],
      safetyFactors: [
        { type: 'info', message: 'No road geometry available to analyze', penaltyOrBonus: 0 }
      ],
      unreportedRatio: 1.0,
    };
  }

  // To keep performance high on complex paths, sample polyline every ~30m
  const sampledPoints: Coordinates[] = [];
  if (polyline.length <= 100) {
    sampledPoints.push(...polyline);
  } else {
    const step = Math.ceil(polyline.length / 100);
    for (let i = 0; i < polyline.length; i += step) {
      sampledPoints.push(polyline[i]);
    }
    // Always include end point
    sampledPoints.push(polyline[polyline.length - 1]);
  }

  // Evaluate each active community report
  reports.forEach((report) => {
    // Find min distance from report to route
    let minDistance = Infinity;
    for (const point of sampledPoints) {
      const dist = haversineDistance(point, report.coordinates);
      if (dist < minDistance) {
        minDistance = dist;
      }
      if (minDistance <= bufferDistanceMeters) {
        break; // within buffer
      }
    }

    if (minDistance <= bufferDistanceMeters) {
      hazardsEncountered++;
      let penalty = 0;

      switch (report.severity) {
        case 'critical':
          penalty = 25;
          safetyFactors.push({
            type: 'danger',
            message: `Critical report nearby: "${report.title}"`,
            penaltyOrBonus: -penalty,
          });
          break;
        case 'high':
          penalty = 18;
          safetyFactors.push({
            type: 'danger',
            message: `High risk report nearby: "${report.title}"`,
            penaltyOrBonus: -penalty,
          });
          break;
        case 'medium':
          penalty = 10;
          safetyFactors.push({
            type: 'warning',
            message: `Caution report nearby: "${report.title}"`,
            penaltyOrBonus: -penalty,
          });
          break;
        case 'low':
          penalty = 5;
          safetyFactors.push({
            type: 'warning',
            message: `Minor hazard nearby: "${report.title}"`,
            penaltyOrBonus: -penalty,
          });
          break;
      }

      // Lighting impact
      if (report.lightingCondition === 'pitch_black') {
        penalty += 8;
        poorLightingCount++;
        safetyFactors.push({
          type: 'danger',
          message: 'Segment reported as pitch black (no lighting)',
          penaltyOrBonus: -8,
        });
      } else if (report.lightingCondition === 'poor') {
        penalty += 4;
        poorLightingCount++;
        safetyFactors.push({
          type: 'warning',
          message: 'Segment reported with low/flickering streetlights',
          penaltyOrBonus: -4,
        });
      } else if (report.lightingCondition === 'well_lit') {
        wellLitCount++;
      }

      score -= penalty;
      identifiedRisks.push(`${report.title} (${report.category.replace('_', ' ')})`);
    }
  });

  // Well lit segment bonus if verified
  if (wellLitCount > 0 && hazardsEncountered === 0) {
    const bonus = Math.min(6, wellLitCount * 2);
    score += bonus;
    safetyFactors.push({
      type: 'positive',
      message: `Verified well-lit corridor (+${bonus} pts)`,
      penaltyOrBonus: bonus,
    });
  }

  // Bound score between 15 (severe hazards) and 96 (optimal known road)
  const finalScore = Math.max(15, Math.min(96, score));

  let lightingAssessment = 'Lighting data unavailable';
  if (poorLightingCount > 0) {
    lightingAssessment = `${poorLightingCount} report(s) of dark or unlit streets`;
  } else if (wellLitCount > 0) {
    lightingAssessment = 'Positive reports of active street lighting';
  } else {
    lightingAssessment = 'Lighting data unavailable';
  }

  // Calculate approximate coverage/unreported ratio
  const unreportedRatio = hazardsEncountered === 0 ? 0.85 : Math.max(0.2, 1 - (hazardsEncountered * 0.15));

  return {
    score: finalScore,
    hazardsEncountered,
    lightingAssessment,
    identifiedRisks: identifiedRisks.slice(0, 4),
    safetyFactors,
    unreportedRatio,
  };
}
