import { Coordinates, IncidentReport, RouteOption, RouteStep } from '../types';
import { calculateRouteSafety } from './safetyScoring';

/**
 * OpenStreetMap Nominatim Geocoder
 * Free usage policy: 1 request/sec max, include User-Agent / Accept-Language
 */
export async function searchAddress(query: string): Promise<{ label: string; coords: Coordinates; addressType?: string }[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery || cleanQuery.length < 2) return [];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      cleanQuery
    )}&limit=6&addressdetails=1`;

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept-Language': 'en',
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Geocoding server responded with ${res.status}`);
    }

    const data = await res.json();
    return data.map((item: any) => ({
      label: item.display_name,
      coords: [parseFloat(item.lat), parseFloat(item.lon)] as Coordinates,
      addressType: item.type || item.class,
    }));
  } catch (err: any) {
    console.warn('Geocoding warning:', err.message);
    return [];
  }
}

/**
 * Reverse geocode a latitude and longitude to a human-readable location
 */
export async function reverseGeocode(coords: Coordinates): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords[0]}&lon=${coords[1]}`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept-Language': 'en' },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.display_name) {
        // Return a condensed label: e.g. first 3 parts
        const parts = data.display_name.split(',');
        return parts.slice(0, 3).join(',').trim();
      }
    }
  } catch {
    // ignore
  }
  return `${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}`;
}

const ROUTE_COLORS = ['#2563eb', '#8b5cf6', '#06b6d4', '#f59e0b'];

/**
 * Real Road Routing via OSRM (Open Source Routing Machine)
 * Supports 'driving' and 'walking' profiles with full alternatives support
 */
export async function fetchOSRMRoute(
  start: Coordinates,
  end: Coordinates,
  reports: IncidentReport[],
  mode: 'driving' | 'walking' = 'driving'
): Promise<RouteOption[]> {
  // Validate coordinates
  if (
    isNaN(start[0]) || isNaN(start[1]) ||
    isNaN(end[0]) || isNaN(end[1])
  ) {
    throw new Error('Invalid coordinate inputs.');
  }

  // Primary URL using alternatives=2 as specified
  const primaryUrl = `https://router.project-osrm.org/route/v1/${mode}/${start[1]},${start[0]};${end[1]},${end[0]}?alternatives=2&steps=true&geometries=geojson&overview=full`;
  console.log('[OSRM Routing] Querying primary URL:', primaryUrl);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 9000);

  let response: Response;
  try {
    response = await fetch(primaryUrl, { signal: controller.signal });
  } catch (netErr: any) {
    clearTimeout(timeoutId);
    throw new Error(
      'Network timeout reaching public routing engine. Please check your internet connection and try again.'
    );
  }
  clearTimeout(timeoutId);

  if (!response.ok) {
    console.error('[OSRM Routing] HTTP Error:', response.status);
    if (response.status === 429) {
      throw new Error('Routing service busy (rate limit). Please wait 5 seconds and retry.');
    }
    throw new Error(`Routing service returned status: ${response.status}`);
  }

  let data = await response.json();
  console.log('[OSRM Routing] Response code:', response.status, 'Routes returned:', data.routes ? data.routes.length : 0);

  // If the service returned only one route, attempt a retry with alternatives=true
  if (data.code === 'Ok' && data.routes && data.routes.length === 1) {
    const retryUrl = `https://router.project-osrm.org/route/v1/${mode}/${start[1]},${start[0]};${end[1]},${end[0]}?alternatives=true&steps=true&geometries=geojson&overview=full`;
    console.log('[OSRM Routing] Only 1 route returned. Retrying with alternatives=true:', retryUrl);
    try {
      const retryController = new AbortController();
      const retryTimeout = setTimeout(() => retryController.abort(), 6000);
      const retryRes = await fetch(retryUrl, { signal: retryController.signal });
      clearTimeout(retryTimeout);

      if (retryRes.ok) {
        const retryData = await retryRes.json();
        console.log('[OSRM Routing Retry] Response code:', retryRes.status, 'Routes returned:', retryData.routes ? retryData.routes.length : 0);
        if (retryData.code === 'Ok' && retryData.routes && retryData.routes.length > 1) {
          data = retryData;
        }
      }
    } catch (retryErr) {
      console.warn('[OSRM Routing Retry Error]:', retryErr);
    }
  }

  if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
    throw new Error(
      data.message || 'No direct road route could be found between these two locations.'
    );
  }

  // Parse all valid routes returned by the API
  const parsedRoutes: RouteOption[] = data.routes.map((route: any, index: number) => {
    const path: Coordinates[] = route.geometry.coordinates.map(
      (pt: [number, number]) => [pt[1], pt[0]] as Coordinates
    );

    const distanceKm = parseFloat((route.distance / 1000).toFixed(2));
    const durationMin = Math.max(1, Math.round(route.duration / 60));

    // Parse turn-by-turn steps if available
    const steps: RouteStep[] = [];
    if (route.legs && route.legs[0] && route.legs[0].steps) {
      route.legs[0].steps.forEach((st: any) => {
        if (st.maneuver && st.name) {
          const type = st.maneuver.type;
          const modifier = st.maneuver.modifier ? ` ${st.maneuver.modifier}` : '';
          const instruction = `${type}${modifier} onto ${st.name || 'unnamed road'}`;
          steps.push({
            instruction: instruction.charAt(0).toUpperCase() + instruction.slice(1),
            distanceMeters: Math.round(st.distance),
            durationSeconds: Math.round(st.duration),
            streetName: st.name || 'Local Street',
          });
        }
      });
    }

    const safetyAnalysis = calculateRouteSafety(path, reports);

    return {
      id: `route-${index}-${Date.now()}`,
      name: index === 0 ? 'Route 1 (Primary Highway)' : `Route ${index + 1} (Alternative Corridor)`,
      distanceKm,
      durationMin,
      geometry: path,
      steps: steps.slice(0, 10),
      safetyAnalysis,
      color: ROUTE_COLORS[index % ROUTE_COLORS.length],
    };
  });

  // Calculate which route is shortest and which route is recommended based on safety
  if (parsedRoutes.length > 0) {
    const minDistance = Math.min(...parsedRoutes.map((r) => r.distanceKm));
    const maxSafetyScore = Math.max(...parsedRoutes.map((r) => r.safetyAnalysis.score));

    // Mark shortest
    parsedRoutes.forEach((r) => {
      if (r.distanceKm === minDistance) {
        r.isShortest = true;
      }
    });

    // Mark recommended (highest safety score, breaking ties by shortest distance)
    const safestRoutes = parsedRoutes.filter((r) => r.safetyAnalysis.score === maxSafetyScore);
    const recommended = safestRoutes.reduce((prev, curr) => (curr.distanceKm < prev.distanceKm ? curr : prev));
    recommended.isRecommended = true;

    // Refine names based on analysis
    parsedRoutes.forEach((r, idx) => {
      const parts = [`Route ${idx + 1}`];
      if (r.isRecommended && r.isShortest) {
        parts.push('(Safest & Shortest)');
      } else if (r.isRecommended) {
        parts.push('(Safest Recommended)');
      } else if (r.isShortest) {
        parts.push('(Shortest Path)');
      } else {
        parts.push(`(Alternative ${idx})`);
      }
      r.name = parts.join(' ');
      r.provider = 'osrm';
    });
  }

  return parsedRoutes;
}

/**
 * Check backend routing status and GraphHopper configuration
 */
export async function checkGraphHopperStatus(): Promise<{ configured: boolean; provider: string }> {
  try {
    const res = await fetch('/api/status');
    if (res.ok) {
      const data = await res.json();
      return {
        configured: Boolean(data.graphhopperConfigured),
        provider: data.provider || 'unknown',
      };
    }
  } catch {
    // Backend may still be spinning up
  }
  return { configured: false, provider: 'unknown' };
}

/**
 * Official GraphHopper Directions Routing API integration via server-side proxy
 * Parameters configured per official GraphHopper routing documentation:
 * - algorithm=alternative_route
 * - alternative_route.max_paths=3
 * - alternative_route.max_weight_factor=1.4
 * - alternative_route.max_share_factor=0.6
 * - points_encoded=false (GeoJSON geometry)
 * - profile=car | foot
 * API key is securely accessed server-side from GRAPHHOPPER_API_KEY.
 */
export async function fetchGraphHopperRoute(
  start: Coordinates,
  end: Coordinates,
  reports: IncidentReport[],
  mode: 'driving' | 'walking' = 'driving'
): Promise<RouteOption[]> {
  if (
    isNaN(start[0]) || isNaN(start[1]) ||
    isNaN(end[0]) || isNaN(end[1])
  ) {
    throw new Error('Invalid coordinate inputs.');
  }

  console.log('[GraphHopper Routing] Querying server proxy /api/routes for:', { start, end, mode });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  let res: Response;
  try {
    res = await fetch('/api/routes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ start, end, mode }),
      signal: controller.signal,
    });
  } catch (netErr: any) {
    clearTimeout(timeoutId);
    throw new Error(
      'Network timeout communicating with GraphHopper routing proxy. Please check your connection.'
    );
  }
  clearTimeout(timeoutId);

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error('[GraphHopper Routing] Error:', res.status, data);
    if (data.error === 'MISSING_API_KEY') {
      throw new Error(
        'GraphHopper secret key (GRAPHHOPPER_API_KEY) is missing on the server. Please ensure the secret is added.'
      );
    }
    if (data.error === 'UNAUTHORIZED') {
      throw new Error(
        'GraphHopper API key is invalid or unauthorized. Please verify the GRAPHHOPPER_API_KEY secret.'
      );
    }
    if (data.error === 'USAGE_LIMIT') {
      throw new Error(
        'GraphHopper API credit limit or daily rate limit reached. Please check your GraphHopper plan or quota.'
      );
    }
    throw new Error(
      data.message || `GraphHopper routing service returned error status ${res.status}.`
    );
  }

  if (!data.paths || !Array.isArray(data.paths) || data.paths.length === 0) {
    throw new Error('No road route could be found between these coordinates.');
  }

  console.log('[GraphHopper Routing] Successfully retrieved distinct paths:', data.paths.length);

  // Parse every valid distinct path returned by the GraphHopper Directions API
  const parsedRoutes: RouteOption[] = data.paths.map((pathItem: any, index: number) => {
    // In GeoJSON format returned when points_encoded=false, coordinates are [longitude, latitude]
    const coordinates: [number, number][] = pathItem.points?.coordinates || [];
    const geometry: Coordinates[] = coordinates.map((pt) => [pt[1], pt[0]] as Coordinates);

    const distanceKm = parseFloat(((pathItem.distance || 0) / 1000).toFixed(2));
    const durationMin = Math.max(1, Math.round((pathItem.time || 0) / 60000));

    // Turn-by-turn maneuvers from GraphHopper instructions
    const steps: RouteStep[] = [];
    if (Array.isArray(pathItem.instructions)) {
      pathItem.instructions.forEach((inst: any) => {
        const text = inst.text || 'Continue';
        steps.push({
          instruction: text,
          distanceMeters: Math.round(inst.distance || 0),
          durationSeconds: Math.round((inst.time || 0) / 1000),
          streetName: inst.street_name || 'Road segment',
        });
      });
    }

    const safetyAnalysis = calculateRouteSafety(geometry, reports);

    return {
      id: `gh-route-${index}-${Date.now()}`,
      name: index === 0 ? 'Route 1 (GraphHopper Primary)' : `Route ${index + 1} (GraphHopper Alternative)`,
      distanceKm,
      durationMin,
      geometry,
      steps: steps.slice(0, 12),
      safetyAnalysis,
      color: ROUTE_COLORS[index % ROUTE_COLORS.length],
      provider: 'graphhopper' as const,
    };
  });

  // Calculate shortest, fastest, safest, and recommended route based on safety scoring
  if (parsedRoutes.length > 0) {
    const minDistance = Math.min(...parsedRoutes.map((r) => r.distanceKm));
    const minDuration = Math.min(...parsedRoutes.map((r) => r.durationMin));
    const maxSafetyScore = Math.max(...parsedRoutes.map((r) => r.safetyAnalysis.score));

    parsedRoutes.forEach((r) => {
      if (r.distanceKm === minDistance) {
        r.isShortest = true;
      }
      if (r.durationMin === minDuration) {
        r.isFastest = true;
      }
      if (r.safetyAnalysis.score === maxSafetyScore) {
        r.isSafest = true;
      }
    });

    const safestRoutes = parsedRoutes.filter((r) => r.safetyAnalysis.score === maxSafetyScore);
    const recommended = safestRoutes.reduce((prev, curr) => (curr.distanceKm < prev.distanceKm ? curr : prev));
    recommended.isRecommended = true;

    parsedRoutes.forEach((r, idx) => {
      const parts = [`Route ${idx + 1}`];
      if (r.isRecommended && r.isShortest) {
        parts.push('(Safest & Shortest)');
      } else if (r.isRecommended) {
        parts.push('(Safest Recommended)');
      } else if (r.isFastest) {
        parts.push('(Fastest Route)');
      } else if (r.isShortest) {
        parts.push('(Shortest Corridor)');
      } else {
        parts.push(`(Alternative ${idx})`);
      }
      r.name = parts.join(' ');
    });
  }

  return parsedRoutes;
}

/**
 * Fetch real-time AI Road Safety & Area Intelligence grounded with Google Search and Maps
 */
export async function fetchRoadSafetyIntel(
  origin: string,
  destination: string,
  city: string = 'Hyderabad'
): Promise<{ configured: boolean; intel: string; sources: string[] }> {
  try {
    const res = await fetch('/api/safety-intel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin, destination, city }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Safety intel fetch error:', err);
  }
  return {
    configured: false,
    intel: 'Road safety assessment based on municipal reports and street illumination data.',
    sources: [],
  };
}
