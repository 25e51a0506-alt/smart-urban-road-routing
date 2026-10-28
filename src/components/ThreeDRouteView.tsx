import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RouteOption, IncidentReport, Coordinates } from '../types';
import { Play, Pause, RotateCcw, Eye, Shield, AlertTriangle, Layers, X, Sun, Moon } from 'lucide-react';

interface ThreeDRouteViewProps {
  route: RouteOption;
  reports: IncidentReport[];
  onClose: () => void;
}

/**
 * Converts GPS Coordinates [lat, lng] into local 3D meters relative to origin.
 * 1 degree latitude ~= 111,000 meters
 * 1 degree longitude ~= 111,000 * cos(lat) meters
 */
function coordsToLocalMeters(coord: Coordinates, origin: Coordinates): [number, number] {
  const latMid = (origin[0] * Math.PI) / 180;
  const metersPerLat = 111139;
  const metersPerLng = 111139 * Math.cos(latMid);

  const x = (coord[1] - origin[1]) * metersPerLng;
  const z = -(coord[0] - origin[0]) * metersPerLat; // Invert lat so North is -Z
  return [x, z];
}

export const ThreeDRouteView: React.FC<ThreeDRouteViewProps> = ({
  route,
  reports,
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speed, setSpeed] = useState<number>(1);
  const [cameraMode, setCameraMode] = useState<'follow' | 'orbit' | 'top'>('follow');
  const [progress, setProgress] = useState<number>(0);

  const isPlayingRef = useRef<boolean>(isPlaying);
  const speedRef = useRef<number>(speed);
  const cameraModeRef = useRef<'follow' | 'orbit' | 'top'>(cameraMode);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    cameraModeRef.current = cameraMode;
  }, [cameraMode]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !route.geometry || route.geometry.length < 2) return;

    // 1. Scene, Camera, Renderer Setup
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#060b18'); // Deep navy night sky
    scene.fog = new THREE.FogExp2('#060b18', 0.0035);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.5, 3000);
    camera.position.set(0, 35, 60);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // 2. Lighting Rig
    const ambientLight = new THREE.HemisphereLight('#38bdf8', '#0b132b', 0.8);
    scene.add(ambientLight);

    const moonLight = new THREE.DirectionalLight('#93c5fd', 1.8);
    moonLight.position.set(100, 180, 80);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.width = 1024;
    moonLight.shadow.mapSize.height = 1024;
    moonLight.shadow.camera.near = 10;
    moonLight.shadow.camera.far = 600;
    const d = 120;
    moonLight.shadow.camera.left = -d;
    moonLight.shadow.camera.right = d;
    moonLight.shadow.camera.top = d;
    moonLight.shadow.camera.bottom = -d;
    moonLight.shadow.bias = -0.0005;
    scene.add(moonLight);

    // 3. Ground Terrain Grid
    const groundGeo = new THREE.PlaneGeometry(3000, 3000, 32, 32);
    const groundMat = new THREE.MeshStandardMaterial({
      color: '#080e1e',
      roughness: 0.9,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    scene.add(ground);

    // Grid helper for urban depth perception
    const gridHelper = new THREE.GridHelper(2000, 100, '#1e293b', '#0f172a');
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // 4. Construct 3D Road Curve from GPS Geometry
    const originCoords = route.geometry[0];
    const curvePoints3D: THREE.Vector3[] = route.geometry.map((pt) => {
      const [x, z] = coordsToLocalMeters(pt, originCoords);
      return new THREE.Vector3(x, 0.1, z);
    });

    const roadCurve = new THREE.CatmullRomCurve3(curvePoints3D, false, 'catmullrom', 0.2);
    const roadLength = roadCurve.getLength();

    // Road Ribbon Mesh
    const roadSegments = Math.max(50, Math.min(600, Math.floor(roadLength / 5)));
    const roadWidth = 10;

    const roadGeo = new THREE.BufferGeometry();
    const positions: number[] = [];
    const uvs: number[] = [];

    const curvePoints = roadCurve.getPoints(roadSegments);
    for (let i = 0; i < curvePoints.length; i++) {
      const pt = curvePoints[i];
      const t = i / (curvePoints.length - 1);
      const tangent = roadCurve.getTangent(t).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      const left = pt.clone().add(normal.clone().multiplyScalar(-roadWidth / 2));
      const right = pt.clone().add(normal.clone().multiplyScalar(roadWidth / 2));

      positions.push(left.x, left.y, left.z);
      positions.push(right.x, right.y, right.z);

      uvs.push(0, t * 40);
      uvs.push(1, t * 40);
    }

    const indices: number[] = [];
    for (let i = 0; i < curvePoints.length - 1; i++) {
      const row1 = i * 2;
      const row2 = (i + 1) * 2;
      indices.push(row1, row1 + 1, row2);
      indices.push(row1 + 1, row2 + 1, row2);
    }

    roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    roadGeo.setIndex(indices);
    roadGeo.computeVertexNormals();

    const roadMat = new THREE.MeshStandardMaterial({
      color: '#1e293b',
      roughness: 0.7,
      metalness: 0.2,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.receiveShadow = true;
    scene.add(roadMesh);

    // Center Dashed Line Mesh
    const centerLineMat = new THREE.LineDashedMaterial({
      color: '#38bdf8',
      dashSize: 3,
      gapSize: 2.5,
      linewidth: 3,
    });
    const centerLineGeo = new THREE.BufferGeometry().setFromPoints(curvePoints.map((p) => p.clone().add(new THREE.Vector3(0, 0.08, 0))));
    const centerLine = new THREE.Line(centerLineGeo, centerLineMat);
    centerLine.computeLineDistances();
    scene.add(centerLine);

    // 5. Composite 5-Part Procedural Streetlights along Road
    const streetLightGroup = new THREE.Group();
    const lampSpacing = Math.max(30, Math.floor(roadLength / 18));
    const lampCount = Math.floor(roadLength / lampSpacing);

    const isWellLit = route.safetyAnalysis?.lightingAssessment?.toLowerCase().includes('well') ?? true;
    const bulbColor = isWellLit ? '#38bdf8' : '#fbbf24';

    const poleMat = new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.5, metalness: 0.8 });
    const armMat = new THREE.MeshStandardMaterial({ color: '#64748b', roughness: 0.5, metalness: 0.8 });
    const lampHeadMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.6, metalness: 0.7 });
    const bulbMat = new THREE.MeshStandardMaterial({
      color: bulbColor,
      emissive: bulbColor,
      emissiveIntensity: 3.5,
      roughness: 0.2,
    });

    for (let i = 1; i <= lampCount; i++) {
      const u = i / (lampCount + 1);
      const pos = roadCurve.getPointAt(u);
      const tangent = roadCurve.getTangentAt(u).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      // Alternate sides of the street
      const side = i % 2 === 0 ? 1 : -1;
      const lampPos = pos.clone().add(normal.clone().multiplyScalar(side * (roadWidth / 2 + 1.8)));

      const lamp = new THREE.Group();
      lamp.position.copy(lampPos);

      // Part 1: Base Plate
      const baseGeo = new THREE.CylinderGeometry(0.5, 0.7, 0.6, 8);
      const base = new THREE.Mesh(baseGeo, poleMat);
      base.position.y = 0.3;
      lamp.add(base);

      // Part 2: Vertical Pole
      const poleGeo = new THREE.CylinderGeometry(0.2, 0.3, 9, 8);
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.y = 4.8;
      pole.castShadow = true;
      lamp.add(pole);

      // Part 3: Overhanging Arm
      const armGeo = new THREE.CylinderGeometry(0.12, 0.15, 3.2, 8);
      const arm = new THREE.Mesh(armGeo, armMat);
      arm.position.set(-side * 1.2, 9.4, 0);
      arm.rotation.z = side * 0.7;
      lamp.add(arm);

      // Part 4: Lamp Fixture Head
      const fixtureGeo = new THREE.BoxGeometry(0.8, 0.3, 0.5);
      const fixture = new THREE.Mesh(fixtureGeo, lampHeadMat);
      fixture.position.set(-side * 2.2, 10.2, 0);
      lamp.add(fixture);

      // Part 5: Emissive LED Bulb + PointLight
      const bulbGeo = new THREE.BoxGeometry(0.6, 0.1, 0.35);
      const bulb = new THREE.Mesh(bulbGeo, bulbMat);
      bulb.position.set(-side * 2.2, 10.05, 0);
      lamp.add(bulb);

      // PointLight casting downward illumination onto road
      if (i % 3 === 0) {
        const light = new THREE.PointLight(bulbColor, 2.5, 30, 2);
        light.position.set(-side * 2.2, 9.8, 0);
        lamp.add(light);
      }

      streetLightGroup.add(lamp);
    }
    scene.add(streetLightGroup);

    // 6. Hazard Alert Beacons along Corridor
    const hazardGroup = new THREE.Group();
    reports.forEach((report) => {
      const [hx, hz] = coordsToLocalMeters(report.coordinates, originCoords);
      const hazardPos = new THREE.Vector3(hx, 0.2, hz);

      // Only display hazards within 300m corridor of the road
      let minDistanceToRoad = Infinity;
      for (const pt of curvePoints) {
        const d = hazardPos.distanceTo(pt);
        if (d < minDistanceToRoad) minDistanceToRoad = d;
      }

      if (minDistanceToRoad < 280) {
        const beacon = new THREE.Group();
        beacon.position.copy(hazardPos);

        const isUrgent = report.severity === 'critical' || report.severity === 'high';
        const beaconColor = isUrgent ? '#ef4444' : '#f59e0b';

        // Glowing Core
        const coreGeo = new THREE.SphereGeometry(1.2, 16, 16);
        const coreMat = new THREE.MeshStandardMaterial({
          color: beaconColor,
          emissive: beaconColor,
          emissiveIntensity: 4,
          roughness: 0.1,
        });
        const core = new THREE.Mesh(coreGeo, coreMat);
        core.position.y = 2.5;
        beacon.add(core);

        // Warning Light
        const pLight = new THREE.PointLight(beaconColor, 3, 40, 2);
        pLight.position.y = 3;
        beacon.add(pLight);

        // Pulsing Ring
        const ringGeo = new THREE.RingGeometry(2, 2.6, 24);
        const ringMat = new THREE.MeshBasicMaterial({
          color: beaconColor,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.7,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.3;
        beacon.add(ring);

        // Store reference for animation
        (beacon as any).pulseRing = ring;
        hazardGroup.add(beacon);
      }
    });
    scene.add(hazardGroup);

    // 7. Composite 8-Part Safety Vehicle (Hero Subject)
    const vehicle = new THREE.Group();

    // Part 1: Main Chassis Lower Body
    const chassisGeo = new THREE.BoxGeometry(3.6, 0.9, 1.9);
    const chassisMat = new THREE.MeshStandardMaterial({
      color: '#1d4ed8',
      metalness: 0.85,
      roughness: 0.25,
    });
    const chassis = new THREE.Mesh(chassisGeo, chassisMat);
    chassis.position.y = 0.8;
    chassis.castShadow = true;
    vehicle.add(chassis);

    // Part 2: Cabin & Windshield (Upper Body)
    const cabinGeo = new THREE.BoxGeometry(2.0, 0.75, 1.7);
    const cabinMat = new THREE.MeshStandardMaterial({
      color: '#0f172a',
      metalness: 0.95,
      roughness: 0.1,
    });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(-0.2, 1.55, 0);
    cabin.castShadow = true;
    vehicle.add(cabin);

    // Part 3: Front Bumper & Grille
    const bumperGeo = new THREE.BoxGeometry(0.3, 0.5, 1.8);
    const bumperMat = new THREE.MeshStandardMaterial({ color: '#090d16', metalness: 0.5, roughness: 0.5 });
    const bumper = new THREE.Mesh(bumperGeo, bumperMat);
    bumper.position.set(1.85, 0.65, 0);
    vehicle.add(bumper);

    // Part 4: Headlights (Emissive + Dual Forward Spotlights)
    const headlightMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      emissive: '#60a5fa',
      emissiveIntensity: 4,
    });
    const hlGeo = new THREE.BoxGeometry(0.1, 0.25, 0.35);

    const hlLeft = new THREE.Mesh(hlGeo, headlightMat);
    hlLeft.position.set(1.82, 0.85, 0.65);
    vehicle.add(hlLeft);

    const hlRight = new THREE.Mesh(hlGeo, headlightMat);
    hlRight.position.set(1.82, 0.85, -0.65);
    vehicle.add(hlRight);

    const spotLightLeft = new THREE.SpotLight('#bae6fd', 6, 60, Math.PI / 6, 0.4, 1.5);
    spotLightLeft.position.set(2.0, 0.85, 0.65);
    spotLightLeft.target.position.set(25, 0, 0.65);
    vehicle.add(spotLightLeft);
    vehicle.add(spotLightLeft.target);

    const spotLightRight = new THREE.SpotLight('#bae6fd', 6, 60, Math.PI / 6, 0.4, 1.5);
    spotLightRight.position.set(2.0, 0.85, -0.65);
    spotLightRight.target.position.set(25, 0, -0.65);
    vehicle.add(spotLightRight);
    vehicle.add(spotLightRight.target);

    // Part 5: Taillights (Red)
    const tailMat = new THREE.MeshStandardMaterial({
      color: '#ef4444',
      emissive: '#dc2626',
      emissiveIntensity: 3,
    });
    const tlLeft = new THREE.Mesh(hlGeo, tailMat);
    tlLeft.position.set(-1.82, 0.85, 0.65);
    vehicle.add(tlLeft);

    const tlRight = new THREE.Mesh(hlGeo, tailMat);
    tlRight.position.set(-1.82, 0.85, -0.65);
    vehicle.add(tlRight);

    // Part 6: 4 Wheels with Hubcaps
    const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.35, 16);
    const wheelMat = new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.8 });
    const wheelPositions: [number, number, number][] = [
      [1.1, 0.45, 1.0],
      [1.1, 0.45, -1.0],
      [-1.1, 0.45, 1.0],
      [-1.1, 0.45, -1.0],
    ];

    wheelPositions.forEach(([wx, wy, wz]) => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(wx, wy, wz);
      wheel.castShadow = true;
      vehicle.add(wheel);
    });

    // Part 7: Rooftop Safety Light Beacon (Blue Flasher)
    const beaconMat = new THREE.MeshStandardMaterial({
      color: '#38bdf8',
      emissive: '#0284c7',
      emissiveIntensity: 4,
    });
    const beaconGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.25, 8);
    const roofBeacon = new THREE.Mesh(beaconGeo, beaconMat);
    roofBeacon.position.set(-0.2, 2.05, 0);
    vehicle.add(roofBeacon);

    // Part 8: Soft Contact Shadow
    const shadowGeo = new THREE.PlaneGeometry(4.2, 2.4);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: '#000000',
      transparent: true,
      opacity: 0.45,
    });
    const vehicleShadow = new THREE.Mesh(shadowGeo, shadowMat);
    vehicleShadow.rotation.x = -Math.PI / 2;
    vehicleShadow.position.y = 0.05;
    vehicle.add(vehicleShadow);

    scene.add(vehicle);

    // 8. Animation & Render Loop with Damped Camera
    let uT = 0;
    const clock = new THREE.Clock();
    let animFrameId: number;

    const animate = () => {
      animFrameId = requestAnimationFrame(animate);
      const dt = clock.getDelta();

      if (isPlayingRef.current) {
        // Calculate step increment relative to road length
        const baseSpeed = 18 * speedRef.current; // ~18 m/s base speed
        const deltaU = (baseSpeed * dt) / roadLength;
        uT = (uT + deltaU) % 1;
        setProgress(Math.round(uT * 100));
      }

      // Position vehicle on road
      const carPos = roadCurve.getPointAt(uT);
      const carTangent = roadCurve.getTangentAt(uT).normalize();

      vehicle.position.copy(carPos);
      vehicle.position.y = 0.1;

      // Look along tangent direction
      const lookTarget = carPos.clone().add(carTangent);
      vehicle.lookAt(lookTarget);

      // Pulse hazard rings
      hazardGroup.children.forEach((child, i) => {
        const ring = (child as any).pulseRing;
        if (ring) {
          const s = 1 + 0.3 * Math.sin(clock.getElapsedTime() * 4 + i);
          ring.scale.set(s, s, s);
        }
      });

      // Camera Damping logic
      const mode = cameraModeRef.current;
      let targetCameraPos = new THREE.Vector3();
      let targetLookAt = new THREE.Vector3();

      if (mode === 'follow') {
        // Behind and above vehicle, looking forward
        const backward = carTangent.clone().multiplyScalar(-18);
        const upward = new THREE.Vector3(0, 9, 0);
        targetCameraPos = carPos.clone().add(backward).add(upward);
        targetLookAt = carPos.clone().add(carTangent.clone().multiplyScalar(15)).add(new THREE.Vector3(0, 1.5, 0));
      } else if (mode === 'orbit') {
        // Cinematic rotating bird's-eye perspective
        const angle = clock.getElapsedTime() * 0.25;
        const radius = 35;
        targetCameraPos.set(
          carPos.x + Math.sin(angle) * radius,
          carPos.y + 22,
          carPos.z + Math.cos(angle) * radius
        );
        targetLookAt = carPos.clone().add(new THREE.Vector3(0, 2, 0));
      } else {
        // Top-down tactical GPS perspective
        targetCameraPos.set(carPos.x, carPos.y + 90, carPos.z + 0.1);
        targetLookAt = carPos.clone();
      }

      // Damped camera interpolation: 1 - Math.exp(-k * dt)
      const dampFactor = 1 - Math.exp(-4.5 * dt);
      camera.position.lerp(targetCameraPos, dampFactor);

      // Smooth look-at
      camera.lookAt(targetLookAt);

      renderer.render(scene, camera);
    };

    animate();

    // 9. Resize Handling
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // 10. Clean Disposal on Unmount
    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', handleResize);

      roadGeo.dispose();
      roadMat.dispose();
      centerLineGeo.dispose();
      centerLineMat.dispose();
      groundGeo.dispose();
      groundMat.dispose();
      chassisGeo.dispose();
      chassisMat.dispose();
      cabinGeo.dispose();
      cabinMat.dispose();
      renderer.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [route, reports]);

  return (
    <div className="relative w-full h-full bg-[#060b18] overflow-hidden select-none">
      {/* Three.js Canvas Container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Floating Header Dock */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto bg-[#0b1329]/90 border border-blue-900/40 backdrop-blur-md px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-wide">3D Safety Perspective</span>
              <span className="text-[10px] bg-blue-950 text-blue-300 border border-blue-800 px-1.5 py-0.2 rounded font-mono">
                Three.js PBR Engine
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {route.name} · {route.distanceKm} km · Safety Score {route.safetyAnalysis.score}/100
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="pointer-events-auto p-2 bg-[#0b1329]/90 hover:bg-rose-950/80 text-slate-300 hover:text-white rounded-2xl border border-slate-800 hover:border-rose-700/60 transition shadow-xl"
          title="Return to 2D Map"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Bottom Floating Control Dock (<= 15% Viewport footprint per guidelines) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-[94%] max-w-xl pointer-events-auto">
        <div className="bg-[#0b1329]/95 border border-blue-900/50 backdrop-blur-md rounded-2xl p-3 shadow-2xl space-y-2.5 text-white">
          {/* Progress bar */}
          <div className="flex items-center gap-3 text-xs">
            <span className="text-[10px] font-mono text-blue-400 font-semibold">{progress}%</span>
            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400">Corridor Simulation</span>
          </div>

          {/* Interactive Control Dock Bar */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
            {/* Playback Controls */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow transition active:scale-95"
                title={isPlaying ? 'Pause Journey' : 'Play Journey'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              </button>

              <button
                type="button"
                onClick={() => setSpeed(speed === 1 ? 2 : speed === 2 ? 3 : 1)}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-semibold rounded-xl border border-slate-700 transition"
                title="Simulation Speed"
              >
                {speed}x
              </button>
            </div>

            {/* Camera Perspective Mode */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setCameraMode('follow')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                  cameraMode === 'follow'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Follow Driver
              </button>
              <button
                type="button"
                onClick={() => setCameraMode('orbit')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                  cameraMode === 'orbit'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Cinematic
              </button>
              <button
                type="button"
                onClick={() => setCameraMode('top')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                  cameraMode === 'top'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Tactical
              </button>
            </div>

            {/* Exit 3D View */}
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition"
            >
              2D Map
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
