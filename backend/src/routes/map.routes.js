import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "../config/env.js";

const router = Router();

// Helper to compute straight-line distance (Haversine formula in km)
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

// Helper to compute compass bearing (degrees)
function compassBearing(lat1, lon1, lat2, lon2) {
  const y = Math.sin(((lon2 - lon1) * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(((lon2 - lon1) * Math.PI) / 180);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  const normalized = (brng + 360) % 360;
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(normalized / 45) % 8;
  return { degrees: Math.round(normalized), cardinal: directions[index] };
}

// Helper to count cached tiles recursively
function countCachedTiles(dir) {
  if (!fs.existsSync(dir)) return 0;
  let count = 0;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        count += countCachedTiles(path.join(dir, entry.name));
      } else if (entry.name.endsWith(".png")) {
        count++;
      }
    }
  } catch {}
  return count;
}

// Tile handler with local cache and fallback
async function handleTile(req, res) {
  const { z, x, y } = req.params;
  const cleanY = y.replace(/\.png$/, "");
  const tileDir = path.join(DATA_DIR, "maps", "tiles", z, x);
  const tilePath = path.join(tileDir, `${cleanY}.png`);

  // 1. If tile exists in local offline storage and is valid, serve directly from disk
  if (fs.existsSync(tilePath)) {
    try {
      const stat = fs.statSync(tilePath);
      // Ignore 6987 (OSM 403 block image) or 2049 (Carto API key image)
      if (stat.size > 500 && stat.size !== 6987 && stat.size !== 2049) {
        res.setHeader("Content-Type", "image/png");
        res.setHeader("Cache-Control", "public, max-age=2592000"); // 30 days
        res.setHeader("X-Tile-Source", "local-offline-storage");
        return fs.createReadStream(tilePath).pipe(res);
      }
    } catch {}
  }

  // 2. If online sync is allowed, fetch from Humanitarian OSM (first) or standard OSM, cache to disk, and serve
  const isStrictOffline = req.query.offline === "true" || req.query.mode === "strict-offline";
  if (!isStrictOffline) {
    const upstreams = [
      `https://a.tile.openstreetmap.fr/hot/${z}/${x}/${cleanY}.png`,
      `https://b.tile.openstreetmap.fr/hot/${z}/${x}/${cleanY}.png`,
      `https://tile.openstreetmap.org/${z}/${x}/${cleanY}.png`,
    ];

    for (const upstreamUrl of upstreams) {
      try {
        const osmResp = await fetch(upstreamUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Referer: "https://www.openstreetmap.org/",
            Accept: "image/png,image/*;q=0.9",
          },
          signal: AbortSignal.timeout(5000),
        });

        if (osmResp.ok) {
          const buffer = Buffer.from(await osmResp.arrayBuffer());
          // Reject 403 banner images
          if (buffer.length > 500 && buffer.length !== 6987 && buffer.length !== 2049) {
            // Save tile to disk asynchronously for future 100% offline use
            fs.mkdir(tileDir, { recursive: true }, (mkdirErr) => {
              if (!mkdirErr) {
                fs.writeFile(tilePath, buffer, () => {});
              }
            });

            res.setHeader("Content-Type", "image/png");
            res.setHeader("Cache-Control", "public, max-age=2592000");
            res.setHeader("X-Tile-Source", "osm-hot-cached-to-disk");
            return res.send(buffer);
          }
        }
      } catch {
        // Try next upstream
      }
    }
  }

  // 3. Offline fallback: Serve dark tactical coordinate SVG grid tile
  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.setHeader("X-Tile-Source", "tactical-grid-fallback");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
    <rect width="256" height="256" fill="#0b1120"/>
    <path d="M0 0 H256 V256 H0 Z" fill="none" stroke="#1e293b" stroke-width="1"/>
    <path d="M0 64 H256 M0 128 H256 M0 192 H256 M64 0 V256 M128 0 V256 M192 0 V256" fill="none" stroke="#172554" stroke-width="0.5" stroke-dasharray="2,4"/>
    <circle cx="128" cy="128" r="2.5" fill="#38bdf8" opacity="0.35"/>
    <text x="8" y="248" fill="#334155" font-family="monospace" font-size="9">z:${z} [OFFLINE GRID]</text>
  </svg>`;
  return res.send(svg);
}

// 1. Status endpoint
router.get("/status", (_req, res) => {
  const mapsDir = path.join(DATA_DIR, "maps");
  const tilesDir = path.join(mapsDir, "tiles");
  const geojsonFile = path.join(mapsDir, "facilities.geojson");
  const jsonFile = path.join(mapsDir, "facilities.json");

  const cachedTileCount = countCachedTiles(tilesDir);
  const tilesExist = cachedTileCount > 0;
  const facilitiesExist = fs.existsSync(geojsonFile) || fs.existsSync(jsonFile);

  let facilityCount = 0;
  if (fs.existsSync(geojsonFile)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(geojsonFile, "utf-8"));
      facilityCount = Array.isArray(parsed.features) ? parsed.features.length : 0;
    } catch {}
  } else if (fs.existsSync(jsonFile)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(jsonFile, "utf-8"));
      facilityCount = Array.isArray(parsed) ? parsed.length : 0;
    } catch {}
  }

  res.json({
    ok: true,
    mapData: {
      tilesInstalled: tilesExist,
      cachedTileCount,
      tilePath: tilesDir,
      tileStatus: tilesExist
        ? `Local offline tiles active (${cachedTileCount} tiles cached)`
        : "Auto-caching OpenStreetMap tiles to local storage",
      facilitiesInstalled: facilitiesExist,
      facilityCount,
      facilityStatus: facilitiesExist
        ? `Local facility database active (${facilityCount} facilities)`
        : "Facility data not installed",
      routingInstalled: false,
      routingStatus: "Routing data not installed",
      wikiArchivePresent: fs.existsSync(
        path.join(DATA_DIR, "zims", "openstreetmap-wiki_en_all_nopic_2026-10.zim")
      ),
      wikiArchiveNotice:
        "The openstreetmap-wiki_en_all_nopic_2026-10.zim archive contains OpenStreetMap documentation and tag definitions, not geographic map tiles or routing graphs.",
    },
  });
});

// Helper to load facilities from disk
function loadFacilitiesFromDisk() {
  const mapsDir = path.join(DATA_DIR, "maps");
  const geojsonFile = path.join(mapsDir, "facilities.geojson");
  const jsonFile = path.join(mapsDir, "facilities.json");

  let facilities = [];
  let installed = false;

  if (fs.existsSync(geojsonFile)) {
    try {
      const content = JSON.parse(fs.readFileSync(geojsonFile, "utf-8"));
      if (Array.isArray(content.features)) {
        facilities = content.features.map((f, idx) => ({
          id: f.id || `facility-${idx}`,
          name: f.properties?.name || "Unnamed facility",
          type: f.properties?.type || f.properties?.amenity || "emergency_facility",
          latitude: f.geometry?.coordinates?.[1] || 0,
          longitude: f.geometry?.coordinates?.[0] || 0,
          phone: f.properties?.phone || "",
          address: f.properties?.address || "",
          emergencyLevel: f.properties?.emergency_level || "",
          city: f.properties?.city || "",
        }));
        installed = true;
      }
    } catch {}
  } else if (fs.existsSync(jsonFile)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(jsonFile, "utf-8"));
      if (Array.isArray(parsed)) {
        facilities = parsed;
        installed = true;
      }
    } catch {}
  }

  return { facilities, installed };
}

// 2. Facilities endpoint with proximity sorting and radius filtering
router.get("/facilities", (req, res) => {
  const { facilities, installed } = loadFacilitiesFromDisk();
  const { type, query, city, lat, lng, radiusKm, limit } = req.query;

  let filtered = facilities;

  // Filter by facility type (hospital, fire_station, police, shelter)
  if (type && type !== "all") {
    filtered = filtered.filter(
      (f) => f.type?.toLowerCase() === String(type).toLowerCase()
    );
  }

  // Filter by city / region
  if (city && city !== "all") {
    filtered = filtered.filter(
      (f) => f.city?.toLowerCase() === String(city).toLowerCase()
    );
  }

  // Filter by text search
  if (query) {
    const q = String(query).toLowerCase();
    filtered = filtered.filter(
      (f) =>
        f.name?.toLowerCase().includes(q) ||
        f.address?.toLowerCase().includes(q) ||
        f.type?.toLowerCase().includes(q) ||
        f.city?.toLowerCase().includes(q)
    );
  }

  // Calculate distances & sort by proximity if lat/lng are provided
  const userLat = parseFloat(lat);
  const userLng = parseFloat(lng);
  const hasUserCoords = !isNaN(userLat) && !isNaN(userLng);

  if (hasUserCoords) {
    filtered = filtered.map((f) => {
      const dist = haversineDistance(userLat, userLng, f.latitude, f.longitude);
      const bearing = compassBearing(userLat, userLng, f.latitude, f.longitude);
      return {
        ...f,
        distanceKm: dist,
        bearingDegrees: bearing.degrees,
        bearingCardinal: bearing.cardinal,
      };
    });

    // Sort closest first
    filtered.sort((a, b) => a.distanceKm - b.distanceKm);

    // Optional radius filter
    const maxRadius = parseFloat(radiusKm);
    if (!isNaN(maxRadius) && maxRadius > 0) {
      const withinRadius = filtered.filter((f) => f.distanceKm <= maxRadius);
      if (withinRadius.length > 0) {
        filtered = withinRadius;
      }
    }
  }

  if (limit) {
    const l = parseInt(limit, 10);
    if (!isNaN(l) && l > 0) {
      filtered = filtered.slice(0, l);
    }
  }

  res.json({
    ok: true,
    installed,
    count: filtered.length,
    total: facilities.length,
    hasUserCoords,
    userLocation: hasUserCoords ? { latitude: userLat, longitude: userLng } : null,
    status: installed
      ? `Loaded ${facilities.length} facilities from local database`
      : "Facility data not installed",
    facilities: filtered,
  });
});

// 2b. Discover & sync nearby facilities around any GPS coordinate via OSM Nominatim
router.get("/facilities/nearby", async (req, res) => {
  const { lat, lng, radiusKm = 10 } = req.query;
  const userLat = parseFloat(lat);
  const userLng = parseFloat(lng);

  if (isNaN(userLat) || isNaN(userLng)) {
    return res.status(400).json({
      ok: false,
      error: "Missing coordinates",
      message: "lat and lng query parameters are required.",
    });
  }

  const { facilities, installed } = loadFacilitiesFromDisk();

  // 1. Calculate distances from local facilities first
  let localWithDist = facilities.map((f) => {
    const dist = haversineDistance(userLat, userLng, f.latitude, f.longitude);
    const bearing = compassBearing(userLat, userLng, f.latitude, f.longitude);
    return {
      ...f,
      distanceKm: dist,
      bearingDegrees: bearing.degrees,
      bearingCardinal: bearing.cardinal,
    };
  });
  localWithDist.sort((a, b) => a.distanceKm - b.distanceKm);

  const nearestLocal = localWithDist[0];
  const maxRadius = parseFloat(radiusKm) || 10;
  const localNearby = localWithDist.filter((f) => f.distanceKm <= maxRadius);

  // If local facilities exist within radius, return them immediately
  if (localNearby.length >= 3) {
    return res.json({
      ok: true,
      source: "local-database",
      count: localNearby.length,
      facilities: localNearby,
    });
  }

  // 2. Otherwise, fetch real hospitals & emergency stations from OSM Nominatim
  const newlyDiscovered = [];
  try {
    const delta = (maxRadius / 111.0) * 1.2;
    const viewbox = `${userLng - delta},${userLat + delta},${userLng + delta},${userLat - delta}`;
    const searchTerms = ["hospital", "police", "fire station"];

    for (const term of searchTerms) {
      try {
        const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          term
        )}&viewbox=${viewbox}&bounded=1&limit=6`;
        const nomResp = await fetch(nomUrl, {
          headers: {
            "User-Agent":
              "KiwixEmergencyApp/1.0 (Emergency Facilities Finder; https://github.com/Rajakr29sep/off-line)",
          },
          signal: AbortSignal.timeout(4000),
        });

        if (nomResp.ok) {
          const items = await nomResp.json();
          for (const item of items) {
            const itemLat = parseFloat(item.lat);
            const itemLng = parseFloat(item.lon);
            const dist = haversineDistance(userLat, userLng, itemLat, itemLng);
            const bearing = compassBearing(userLat, userLng, itemLat, itemLng);

            let type = "hospital";
            if (term.includes("fire")) type = "fire_station";
            else if (term.includes("police")) type = "police";

            newlyDiscovered.push({
              id: `osm-${item.osm_type || "node"}-${item.osm_id || Math.random().toString(36).slice(2, 8)}`,
              name: item.name || item.display_name.split(",")[0] || "Emergency Facility",
              type,
              latitude: itemLat,
              longitude: itemLng,
              phone: "112",
              address: item.display_name,
              emergencyLevel: "Discovered Local Emergency Facility",
              city: "Nearby Location",
              distanceKm: dist,
              bearingDegrees: bearing.degrees,
              bearingCardinal: bearing.cardinal,
              source: "osm-live-discovered",
            });
          }
        }
      } catch {}
    }
  } catch {}

  // Merge newly discovered with local facilities
  const combined = [...newlyDiscovered, ...localWithDist];
  const uniqueMap = new Map();
  for (const item of combined) {
    if (!uniqueMap.has(item.name.toLowerCase())) {
      uniqueMap.set(item.name.toLowerCase(), item);
    }
  }

  const sortedCombined = Array.from(uniqueMap.values()).sort(
    (a, b) => a.distanceKm - b.distanceKm
  );

  res.json({
    ok: true,
    source: newlyDiscovered.length > 0 ? "osm-discovered-and-local" : "local-database",
    discoveredCount: newlyDiscovered.length,
    count: sortedCombined.length,
    facilities: sortedCombined,
  });
});

// 3. Routing calculation endpoint
router.get("/route", (req, res) => {
  const { startLat, startLng, endLat, endLng } = req.query;

  const lat1 = parseFloat(startLat);
  const lon1 = parseFloat(startLng);
  const lat2 = parseFloat(endLat);
  const lon2 = parseFloat(endLng);

  if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
    return res.status(400).json({
      ok: false,
      error: "Missing coordinates",
      message: "startLat, startLng, endLat, and endLng query parameters are required numbers.",
    });
  }

  const distanceKm = haversineDistance(lat1, lon1, lat2, lon2);
  const bearing = compassBearing(lat1, lon1, lat2, lon2);

  res.json({
    ok: true,
    routingEngineAvailable: false,
    routingStatus: "Routing data not installed",
    message:
      "Turn-by-turn road navigation requires an offline routing engine (such as local OSRM or Valhalla) and an OSM road network graph. Direct geodesic distance and compass bearing are calculated below.",
    directDistanceKm: distanceKm,
    bearingDegrees: bearing.degrees,
    bearingCardinal: bearing.cardinal,
    start: { latitude: lat1, longitude: lon1 },
    destination: { latitude: lat2, longitude: lon2 },
    turnByTurnSteps: [],
  });
});

// 4. On-demand pre-cache trigger endpoint
router.post("/cache", async (_req, res) => {
  const tilesDir = path.join(DATA_DIR, "maps", "tiles");
  try {
    const { exec } = await import("node:child_process");
    const scriptPath = path.resolve(DATA_DIR, "..", "scripts", "cache-emergency-tiles.js");
    exec(`node "${scriptPath}"`, (err, stdout) => {
      const cachedTileCount = countCachedTiles(tilesDir);
      res.json({
        ok: !err,
        cachedTileCount,
        output: stdout,
        error: err ? err.message : null,
      });
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Tile routes (both with and without /tiles prefix)
router.get("/tiles/:z/:x/:y.png", handleTile);
router.get("/:z/:x/:y.png", handleTile);

export const tilesRouter = Router();
tilesRouter.get("/:z/:x/:y.png", handleTile);
tilesRouter.get("/:z/:x/:y", handleTile);

export default router;
