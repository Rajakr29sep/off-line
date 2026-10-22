// API client for Kiwix Emergency appliance

const EXPRESS_API_URL = "/api";
const DIRECT_RAG_URL = (
  import.meta.env.VITE_RAG_BASE_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000"
).replace(/\/+$/, "");

/**
 * Ask a question via offline RAG.
 * Tries the Express API gateway (/api/rag/ask) first, with fallback to FastAPI direct (/ask).
 */
export async function askOfflineRag({ question, categoryId, topic }) {
  const trimmedQuestion = (question || "").trim();
  if (!trimmedQuestion) {
    throw new Error("Question cannot be empty.");
  }

  const payload = {
    question: trimmedQuestion,
    categoryId: categoryId || "emergency-knowledge",
    topic: topic || trimmedQuestion,
  };

  let primaryError = null;

  // 1. Try Express gateway route (/api/rag/ask)
  try {
    const response = await fetch(`${EXPRESS_API_URL}/rag/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(60000),
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok) {
      return data;
    }

    // If Express returned an explicit 503 or 400, record it
    primaryError = new Error(data.detail || data.message || `API error ${response.status}`);
  } catch (err) {
    primaryError = err;
  }

  // 2. Direct fallback to Python FastAPI (/ask)
  try {
    const directResp = await fetch(`${DIRECT_RAG_URL}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(60000),
    });

    const data = await directResp.json().catch(() => ({}));
    if (directResp.ok) {
      return data;
    }
    throw new Error(data.detail || data.message || `FastAPI error ${directResp.status}`);
  } catch (fallbackErr) {
    const detailMsg = primaryError?.message || fallbackErr?.message || "Could not reach offline knowledge service.";
    throw new Error(detailMsg);
  }
}

/**
 * Fetch unified appliance health status.
 */
export async function fetchAppHealth() {
  try {
    const res = await fetch(`${EXPRESS_API_URL}/health`, {
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {}

  // If Express is unreachable, test FastAPI directly
  let ragOk = false;
  let ragDetails = null;
  try {
    const ragRes = await fetch(`${DIRECT_RAG_URL}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    if (ragRes.ok) {
      ragOk = true;
      ragDetails = await ragRes.json();
    }
  } catch {}

  return {
    ok: ragOk,
    service: "kiwix-emergency-api",
    mode: "direct",
    services: {
      express: { status: "offline", port: 3000 },
      ragService: {
        status: ragOk ? "online" : "offline",
        port: 8000,
        details: ragDetails,
      },
      kiwix: { status: "offline", port: 8080 },
    },
    storage: {
      sqliteDatabase: { exists: ragDetails?.indexExists || false },
      zimArchives: { count: ragDetails?.zimArchiveCount || 0 },
      maps: { tilesInstalled: false, status: "Map data unavailable" },
    },
  };
}

/**
 * Fetch offline map configuration and data status.
 */
export async function fetchMapStatus() {
  try {
    const res = await fetch(`${EXPRESS_API_URL}/map/status`, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {}

  return {
    ok: true,
    mapData: {
      tilesInstalled: false,
      tileStatus: "Map data unavailable",
      facilitiesInstalled: false,
      facilityStatus: "Facility data not installed",
      routingInstalled: false,
      routingStatus: "Routing data not installed",
      wikiArchivePresent: true,
      wikiArchiveNotice:
        "The openstreetmap-wiki archive provides offline reference documentation, not geographic road tiles or routing graphs.",
    },
  };
}

/**
 * Fetch emergency facilities sorted by proximity if lat/lng are provided.
 */
export async function fetchFacilities({ type, query, lat, lng, radiusKm, city, limit } = {}) {
  const params = new URLSearchParams();
  if (type) params.set("type", type);
  if (query) params.set("query", query);
  if (lat !== undefined && lat !== null) params.set("lat", String(lat));
  if (lng !== undefined && lng !== null) params.set("lng", String(lng));
  if (radiusKm) params.set("radiusKm", String(radiusKm));
  if (city) params.set("city", city);
  if (limit) params.set("limit", String(limit));

  try {
    const res = await fetch(`${EXPRESS_API_URL}/map/facilities?${params}`, {
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {}

  return {
    ok: true,
    installed: false,
    count: 0,
    facilities: [],
    status: "Facility data not installed",
  };
}

/**
 * Discover real emergency facilities around any GPS coordinate via OSM
 */
export async function fetchNearbyOsmFacilities({ lat, lng, radiusKm = 10 } = {}) {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    radiusKm: String(radiusKm),
  });

  try {
    const res = await fetch(`${EXPRESS_API_URL}/map/facilities/nearby?${params}`, {
      signal: AbortSignal.timeout(12000),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {}

  return { ok: false, facilities: [] };
}

/**
 * Calculate distance and compass bearing to an emergency location.
 */
export async function calculateRoute(startLat, startLng, endLat, endLng) {
  const params = new URLSearchParams({
    startLat: String(startLat),
    startLng: String(startLng),
    endLat: String(endLat),
    endLng: String(endLng),
  });

  try {
    const res = await fetch(`${EXPRESS_API_URL}/map/route?${params}`, {
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {}

  // Fallback client-side calculation if backend is temporarily unreachable
  const R = 6371;
  const dLat = ((endLat - startLat) * Math.PI) / 180;
  const dLon = ((endLng - startLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((startLat * Math.PI) / 180) *
      Math.cos((endLat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const dist = Math.round(R * c * 100) / 100;

  return {
    ok: true,
    routingEngineAvailable: false,
    routingStatus: "Routing data not installed",
    directDistanceKm: dist,
    start: { latitude: startLat, longitude: startLng },
    destination: { latitude: endLat, longitude: endLng },
  };
}

/**
 * Trigger offline map tile pre-caching.
 */
export async function triggerTileCache() {
  try {
    const res = await fetch(`${EXPRESS_API_URL}/map/cache`, {
      method: "POST",
      signal: AbortSignal.timeout(60000),
    });
    return await res.json();
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
