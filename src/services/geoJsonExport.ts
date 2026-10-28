import { RouteOption, Coordinates } from '../types';

export interface GeoJsonExportOptions {
  originLabel?: string;
  destLabel?: string;
  includeWaypoints?: boolean;
}

/**
 * Converts a RouteOption into a strictly RFC 7946 compliant GeoJSON FeatureCollection.
 * 
 * Note: Leaflet coordinates are [latitude, longitude].
 * GeoJSON coordinates MUST be [longitude, latitude] (WGS 84).
 */
export function buildRouteGeoJSON(route: RouteOption, options: GeoJsonExportOptions = {}) {
  if (!route || !route.geometry || route.geometry.length === 0) {
    throw new Error('Route has no geometry coordinates to export.');
  }

  // GeoJSON requires [longitude, latitude] order
  const lineCoordinates: [number, number][] = route.geometry.map(([lat, lng]) => [lng, lat]);

  const startCoord = route.geometry[0];
  const endCoord = route.geometry[route.geometry.length - 1];

  const features: any[] = [
    {
      type: 'Feature',
      id: route.id,
      geometry: {
        type: 'LineString',
        coordinates: lineCoordinates,
      },
      properties: {
        name: route.name,
        routeId: route.id,
        provider: route.provider || 'unknown',
        distanceKm: route.distanceKm,
        durationMinutes: route.durationMin,
        safetyScore: route.safetyAnalysis?.score ?? null,
        lightingAssessment: route.safetyAnalysis?.lightingAssessment ?? 'Unknown',
        hazardsEncountered: route.safetyAnalysis?.hazardsEncountered ?? 0,
        identifiedRisks: route.safetyAnalysis?.identifiedRisks ?? [],
        safetyFactors: route.safetyAnalysis?.safetyFactors ?? [],
        isRecommended: Boolean(route.isRecommended),
        isShortest: Boolean(route.isShortest),
        color: route.color,
        originName: options.originLabel || 'Starting Location',
        destinationName: options.destLabel || 'Destination',
        stepCount: route.steps?.length || 0,
        steps: route.steps?.map((step, idx) => ({
          stepNumber: idx + 1,
          instruction: step.instruction,
          distanceMeters: step.distanceMeters,
          durationSeconds: step.durationSeconds,
          streetName: step.streetName,
        })) || [],
        coordinateCount: lineCoordinates.length,
        exportedAt: new Date().toISOString(),
        system: 'Smart Urban Safety Navigation System',
        crs: 'urn:ogc:def:crs:OGC:1.3:CRS84',
      },
    },
  ];

  // Optionally include Origin and Destination points
  if (options.includeWaypoints !== false) {
    features.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [startCoord[1], startCoord[0]], // [lng, lat]
      },
      properties: {
        role: 'origin',
        title: options.originLabel || 'Origin Starting Point',
        latitude: startCoord[0],
        longitude: startCoord[1],
      },
    });

    features.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [endCoord[1], endCoord[0]], // [lng, lat]
      },
      properties: {
        role: 'destination',
        title: options.destLabel || 'Destination Endpoint',
        latitude: endCoord[0],
        longitude: endCoord[1],
      },
    });
  }

  const geoJsonData = {
    type: 'FeatureCollection',
    name: `SafetyRoute_${route.name.replace(/[^a-zA-Z0-9]/g, '_')}`,
    crs: {
      type: 'name',
      properties: {
        name: 'urn:ogc:def:crs:OGC:1.3:CRS84',
      },
    },
    features,
  };

  return geoJsonData;
}

/**
 * Triggers a client-side browser file download for the GeoJSON route data.
 * Adheres to iframe constraints (no window.open or alert).
 */
export function downloadRouteGeoJSON(route: RouteOption, options: GeoJsonExportOptions = {}): string {
  const geoJsonObject = buildRouteGeoJSON(route, options);
  const jsonString = JSON.stringify(geoJsonObject, null, 2);

  // Generate sanitized, descriptive filename
  const slug = route.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName = `safe-route-${slug || 'route'}-${timestamp}.geojson`;

  const blob = new Blob([jsonString], { type: 'application/geo+json;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();

  // Cleanup object URL and DOM node
  setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(objectUrl);
  }, 300);

  return fileName;
}
