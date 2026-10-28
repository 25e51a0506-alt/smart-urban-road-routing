export type Coordinates = [number, number]; // [lat, lng]

export type IncidentCategory = 
  | 'poor_lighting'
  | 'harassment'
  | 'accident'
  | 'suspicious_activity'
  | 'isolated_area'
  | 'road_hazard';

export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

export type LightingCondition = 'well_lit' | 'moderate' | 'poor' | 'pitch_black' | 'unknown';

export interface IncidentReport {
  id: string;
  category: IncidentCategory;
  title: string;
  description: string;
  coordinates: Coordinates;
  address?: string;
  severity: SeverityLevel;
  lightingCondition: LightingCondition;
  reportedAt: string;
  reportedBy: string;
  userRole?: string;
  photoUrl?: string;
  verified: boolean;
  confirmations: number;
}

export interface RouteStep {
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
  streetName: string;
}

export interface SafetyFactor {
  type: 'danger' | 'warning' | 'info' | 'positive';
  message: string;
  penaltyOrBonus: number;
}

export interface RouteSafetyAnalysis {
  score: number; // 0 - 100
  hazardsEncountered: number;
  lightingAssessment: string;
  identifiedRisks: string[];
  safetyFactors: SafetyFactor[];
  unreportedRatio: number; // 0 - 1 percentage of route without incident data
}

export interface RouteOption {
  id: string;
  name: string;
  distanceKm: number;
  durationMin: number;
  geometry: Coordinates[];
  steps?: RouteStep[];
  safetyAnalysis: RouteSafetyAnalysis;
  color?: string;
  isShortest?: boolean;
  isRecommended?: boolean;
  isFastest?: boolean;
  isSafest?: boolean;
  provider?: 'graphhopper' | 'osrm';
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'commuter' | 'campus_ambassador' | 'moderator';
  collegeOrAffiliation?: string;
  createdAt: string;
}
