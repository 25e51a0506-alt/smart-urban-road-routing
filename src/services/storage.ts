import { Coordinates, IncidentReport, UserProfile } from '../types';

const REPORTS_KEY = 'smart_safety_reports_v2';
const USER_KEY = 'smart_safety_user_v2';
const ACTIVE_PRESET_KEY = 'smart_safety_active_preset';

export interface DemoPreset {
  id: string;
  name: string;
  city: string;
  center: Coordinates;
  zoom: number;
  description: string;
  defaultOrigin: { label: string; coords: Coordinates };
  defaultDestination: { label: string; coords: Coordinates };
}

export const DEMO_PRESETS: DemoPreset[] = [
  {
    id: 'hitam_campus',
    name: 'HITAM Hyderabad Campus Zone',
    city: 'Hyderabad',
    center: [17.5700, 78.4600],
    zoom: 13,
    description: 'HITAM Campus corridor to Kompally Cineplanet Hub (Multiple arterial routes)',
    defaultOrigin: {
      label: 'HITAM Main Academic Gate',
      coords: [17.5956, 78.4358],
    },
    defaultDestination: {
      label: 'Kompally Cineplanet Outer Hub',
      coords: [17.5447, 78.4875],
    },
  },
  {
    id: 'bengaluru_tech',
    name: 'Bengaluru Central & Tech Corridors',
    city: 'Bengaluru',
    center: [12.9750, 77.6600],
    zoom: 12,
    description: 'Majestic Station to Whitefield Corridor (Multiple distinct thoroughfares)',
    defaultOrigin: {
      label: 'Majestic Railway Terminal',
      coords: [12.9779, 77.5724],
    },
    defaultDestination: {
      label: 'Whitefield Tech Corridor',
      coords: [12.9698, 77.7499],
    },
  },
  {
    id: 'nyc_manhattan',
    name: 'New York City / Manhattan Corridors',
    city: 'New York',
    center: [40.7300, -74.0000],
    zoom: 13,
    description: 'Midtown to Lower Manhattan (West Side vs Broadway avenues)',
    defaultOrigin: {
      label: 'Times Square Broadway',
      coords: [40.7580, -73.9855],
    },
    defaultDestination: {
      label: 'Battery Park South',
      coords: [40.7033, -74.0170],
    },
  },
];

// Realistic starter community reports
export const INITIAL_REPORTS: IncidentReport[] = [
  // HITAM / Hyderabad campus region reports
  {
    id: 'rep-hitam-1',
    category: 'poor_lighting',
    title: 'Extensive blackout on Medchal Link Road',
    description: 'Five consecutive solar streetlights have been damaged for 2 weeks. Deep shadow after 7:30 PM with zero visibility.',
    coordinates: [17.6042, 78.4485],
    address: 'Near Medchal Outer Link Road',
    severity: 'high',
    lightingCondition: 'pitch_black',
    reportedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    reportedBy: 'Rahul K. (Student Safety Council)',
    userRole: 'student',
    verified: true,
    confirmations: 12,
  },
  {
    id: 'rep-hitam-2',
    category: 'harassment',
    title: 'Harassment & catcalling near bus shelter',
    description: 'Repeated incidents reported by evening shift scholars near the deserted shelter. Security patrol requested.',
    coordinates: [17.6120, 78.4550],
    address: 'Bypass Road Junction Bus Stop',
    severity: 'high',
    lightingCondition: 'poor',
    reportedAt: new Date(Date.now() - 3600000 * 22).toISOString(),
    reportedBy: 'Pooja V.',
    userRole: 'commuter',
    verified: true,
    confirmations: 19,
  },
  {
    id: 'rep-hitam-3',
    category: 'road_hazard',
    title: 'Unbarricaded open trench & loose gravel',
    description: 'Road widening trench left open without reflective warning cones or barricade tapes. Severe hazard for cyclists.',
    coordinates: [17.5980, 78.4410],
    address: 'Campus West Road',
    severity: 'medium',
    lightingCondition: 'moderate',
    reportedAt: new Date(Date.now() - 3600000 * 36).toISOString(),
    reportedBy: 'Kiran N.',
    userRole: 'student',
    verified: false,
    confirmations: 7,
  },
  {
    id: 'rep-hitam-4',
    category: 'isolated_area',
    title: 'Deserted unmonitored pedestrian shortcut',
    description: 'Dense overgrowth and no emergency SOS call-box. Advised to stay on main lit road after sunset.',
    coordinates: [17.6015, 78.4320],
    address: 'North Woods Perimeter Footpath',
    severity: 'medium',
    lightingCondition: 'poor',
    reportedAt: new Date(Date.now() - 3600000 * 50).toISOString(),
    reportedBy: 'HITAM Campus Security',
    userRole: 'campus_ambassador',
    verified: true,
    confirmations: 34,
  },

  // Bengaluru hub reports
  {
    id: 'rep-blr-1',
    category: 'poor_lighting',
    title: 'Broken overhead fixtures on 4th Cross',
    description: 'All 3 lamp posts are dead over a 250m stretch. Footpath blocked by tree branches.',
    coordinates: [12.9735, 77.5980],
    address: '4th Cross Road, Ashok Nagar',
    severity: 'medium',
    lightingCondition: 'pitch_black',
    reportedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    reportedBy: 'Ananya S.',
    userRole: 'commuter',
    verified: true,
    confirmations: 14,
  },
  {
    id: 'rep-blr-2',
    category: 'harassment',
    title: 'Suspicious loitering near subway underpass',
    description: 'Group blocking passage stairs after 9 PM. Solo walkers should prefer the street-level crossing.',
    coordinates: [12.9755, 77.6050],
    address: 'Brigade Rd Underpass',
    severity: 'high',
    lightingCondition: 'poor',
    reportedAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    reportedBy: 'Vikas T.',
    userRole: 'student',
    verified: true,
    confirmations: 28,
  },
  {
    id: 'rep-blr-3',
    category: 'road_hazard',
    title: 'Deep storm drain cave-in',
    description: 'Pedestrian pavement slab collapsed into drain. Hazard concealed in water during rain.',
    coordinates: [12.9710, 77.6110],
    address: 'Residency Road Footpath',
    severity: 'high',
    lightingCondition: 'moderate',
    reportedAt: new Date(Date.now() - 3600000 * 72).toISOString(),
    reportedBy: 'Deepak M.',
    userRole: 'commuter',
    verified: false,
    confirmations: 8,
  },

  // NYC reports
  {
    id: 'rep-nyc-1',
    category: 'poor_lighting',
    title: 'Flickering streetlamps near alleyway',
    description: 'Dark pocket between buildings with irregular light fixtures.',
    coordinates: [40.7320, -73.9930],
    address: 'East 8th St & University Pl',
    severity: 'medium',
    lightingCondition: 'poor',
    reportedAt: new Date(Date.now() - 3600000 * 14).toISOString(),
    reportedBy: 'Sarah W.',
    userRole: 'student',
    verified: true,
    confirmations: 16,
  },
  {
    id: 'rep-nyc-2',
    category: 'suspicious_activity',
    title: 'Aggressive solicitation and following',
    description: 'Multiple reports of individual following students along Mercer St toward park.',
    coordinates: [40.7285, -73.9960],
    address: 'Mercer Street corridor',
    severity: 'high',
    lightingCondition: 'moderate',
    reportedAt: new Date(Date.now() - 3600000 * 28).toISOString(),
    reportedBy: 'NYU Safety Peer Watch',
    userRole: 'campus_ambassador',
    verified: true,
    confirmations: 42,
  },
];

export function getSavedReports(): IncidentReport[] {
  try {
    const raw = localStorage.getItem(REPORTS_KEY);
    if (!raw) {
      localStorage.setItem(REPORTS_KEY, JSON.stringify(INITIAL_REPORTS));
      return INITIAL_REPORTS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(REPORTS_KEY, JSON.stringify(INITIAL_REPORTS));
      return INITIAL_REPORTS;
    }
    return parsed;
  } catch (e) {
    return INITIAL_REPORTS;
  }
}

export function saveReport(report: IncidentReport): void {
  const current = getSavedReports();
  // Prepend to top
  const updated = [report, ...current.filter((r) => r.id !== report.id)];
  localStorage.setItem(REPORTS_KEY, JSON.stringify(updated));
}

export function deleteReport(reportId: string): void {
  const current = getSavedReports();
  const updated = current.filter((r) => r.id !== reportId);
  localStorage.setItem(REPORTS_KEY, JSON.stringify(updated));
}

export function upvoteReport(reportId: string): number {
  const current = getSavedReports();
  let newCount = 0;
  const updated = current.map((r) => {
    if (r.id === reportId) {
      newCount = (r.confirmations || 0) + 1;
      return { ...r, confirmations: newCount };
    }
    return r;
  });
  localStorage.setItem(REPORTS_KEY, JSON.stringify(updated));
  return newCount;
}

export function resetReportsToDefaults(): IncidentReport[] {
  localStorage.setItem(REPORTS_KEY, JSON.stringify(INITIAL_REPORTS));
  return INITIAL_REPORTS;
}

export function getStoredUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: UserProfile | null): void {
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
  }
}

export function getActivePresetId(): string {
  return localStorage.getItem(ACTIVE_PRESET_KEY) || 'hitam_campus';
}

export function setActivePresetId(id: string): void {
  localStorage.setItem(ACTIVE_PRESET_KEY, id);
}
