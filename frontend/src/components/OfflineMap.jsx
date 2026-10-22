import { useEffect, useState, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
  useMap,
  Circle,
} from "react-leaflet";
import L from "leaflet";
import {
  MapPin,
  Navigation,
  Compass,
  AlertTriangle,
  Hospital,
  Shield,
  Flame,
  Home,
  Layers,
  Search,
  Info,
  CheckCircle2,
  BookOpen,
  Maximize2,
  Download,
  Crosshair,
  Sparkles,
  PhoneCall,
  ArrowUpRight,
} from "lucide-react";
import {
  fetchMapStatus,
  fetchFacilities,
  calculateRoute,
  triggerTileCache,
  fetchNearbyOsmFacilities,
} from "../services/api.js";

// Standard city hubs across India for instant 1-click jump
const CITY_PRESETS = [
  { name: "Delhi NCR", lat: 28.59, lng: 77.21, zoom: 12 },
  { name: "Mumbai", lat: 19.0514, lng: 72.8294, zoom: 12 },
  { name: "Bengaluru", lat: 12.9716, lng: 77.5946, zoom: 12 },
  { name: "Kolkata", lat: 22.556, lng: 88.353, zoom: 12 },
  { name: "Hyderabad", lat: 17.385, lng: 78.4867, zoom: 12 },
  { name: "Chennai", lat: 13.0827, lng: 80.2707, zoom: 12 },
  { name: "Pune", lat: 18.5284, lng: 73.8739, zoom: 12 },
  { name: "Ahmedabad", lat: 23.03, lng: 72.585, zoom: 12 },
  { name: "Jaipur", lat: 26.8974, lng: 75.8166, zoom: 12 },
  { name: "Lucknow", lat: 26.869, lng: 80.9152, zoom: 12 },
  { name: "Patna", lat: 25.5941, lng: 85.1376, zoom: 12 },
];

// Helper to compute client-side Haversine distance and bearing
function computeDistanceAndBearing(lat1, lon1, lat2, lon2) {
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
  const dist = Math.round(R * c * 100) / 100;

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

  return {
    distanceKm: dist,
    bearingDegrees: Math.round(normalized),
    bearingCardinal: directions[index],
  };
}

// Leaflet marker icons
const userIcon = new L.DivIcon({
  className: "custom-leaflet-marker user-marker",
  html: `<div style="background:#38bdf8;width:24px;height:24px;border-radius:50%;border:3px solid #0b0f19;box-shadow:0 0 10px rgba(56,189,248,0.7);display:flex;align-items:center;justify-content:center;color:#0b0f19;font-weight:bold;font-size:12px;">★</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const facilityIcon = (type) => {
  let color = "#ef4444";
  let letter = "H";
  if (type === "fire_station") {
    color = "#f59e0b";
    letter = "F";
  } else if (type === "police") {
    color = "#3b82f6";
    letter = "P";
  } else if (type === "shelter") {
    color = "#10b981";
    letter = "S";
  }

  return new L.DivIcon({
    className: "custom-leaflet-marker facility-marker",
    html: `<div style="background:${color};width:26px;height:26px;border-radius:6px;border:2px solid #ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;color:#ffffff;font-weight:bold;font-size:12px;">${letter}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
};

function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// MapController manages pan/zoom and fitting bounds
function MapController({ targetCenter, targetBounds }) {
  const map = useMap();

  useEffect(() => {
    if (targetBounds && targetBounds.length > 0) {
      map.fitBounds(targetBounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [targetBounds, map]);

  useEffect(() => {
    if (targetCenter && (!targetBounds || targetBounds.length === 0)) {
      map.setView(targetCenter, map.getZoom() || 12);
    }
  }, [targetCenter, targetBounds, map]);

  return null;
}

export default function OfflineMap() {
  // Default coordinate: Central Delhi emergency zone
  const [selectedLocation, setSelectedLocation] = useState({
    lat: 28.59,
    lng: 77.21,
    source: "Delhi Emergency Zone",
  });
  const [manualLat, setManualLat] = useState("28.5900");
  const [manualLng, setManualLng] = useState("77.2100");

  const [mapStatus, setMapStatus] = useState(null);
  const [facilities, setFacilities] = useState([]);
  const [facilitySearch, setFacilitySearch] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedCity, setSelectedCity] = useState("Delhi NCR");
  const [radiusFilter, setRadiusFilter] = useState("all"); // "all", "5", "15", "50"
  const [activeFacility, setActiveFacility] = useState(null);
  const [routingResult, setRoutingResult] = useState(null);
  const [loadingGps, setLoadingGps] = useState(false);
  const [gpsError, setGpsError] = useState("");

  // Map layer options: "local" (offline cached + auto-cache), "hot" (Humanitarian OSM live), "satellite" (ArcGIS), "grid" (Tactical grid)
  const [layerMode, setLayerMode] = useState("local");
  const [targetBounds, setTargetBounds] = useState(null);
  const [cachingInProgress, setCachingInProgress] = useState(false);
  const [cacheMessage, setCacheMessage] = useState("");
  const [searchingNearby, setSearchingNearby] = useState(false);
  const [nearbyFeedback, setNearbyFeedback] = useState("");

  const refreshStatus = () => {
    fetchMapStatus().then((res) => {
      if (res?.mapData) setMapStatus(res.mapData);
    });
  };

  // Load status and facilities
  useEffect(() => {
    refreshStatus();
    fetchFacilities({ lat: selectedLocation.lat, lng: selectedLocation.lng }).then((res) => {
      if (res?.facilities) setFacilities(res.facilities);
    });
  }, []);

  function handleLocationSelect(lat, lng, source = "Manual map click") {
    const roundLat = Math.round(lat * 10000) / 10000;
    const roundLng = Math.round(lng * 10000) / 10000;
    setSelectedLocation({ lat: roundLat, lng: roundLng, source });
    setManualLat(String(roundLat));
    setManualLng(String(roundLng));
    setGpsError("");
    setTargetBounds(null);

    if (activeFacility) {
      calculateRoute(roundLat, roundLng, activeFacility.latitude, activeFacility.longitude)
        .then(setRoutingResult);
    }
  }

  function handleManualCoordinateSubmit(e) {
    e.preventDefault();
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setGpsError("Please enter valid latitude (-90 to 90) and longitude (-180 to 180).");
      return;
    }
    handleLocationSelect(lat, lng, "Manual coordinate input");
  }

  function handleDetectGps() {
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser.");
      return;
    }

    setLoadingGps(true);
    setGpsError("");
    setNearbyFeedback("");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLoadingGps(false);
        const lat = Math.round(pos.coords.latitude * 10000) / 10000;
        const lng = Math.round(pos.coords.longitude * 10000) / 10000;
        setSelectedCity("My Live GPS");
        handleLocationSelect(
          lat,
          lng,
          `Live GPS (Accuracy: ±${Math.round(pos.coords.accuracy)}m)`
        );

        // Fetch proximity facilities sorted directly from user's live position
        fetchFacilities({ lat, lng }).then((res) => {
          if (res?.facilities && res.facilities.length > 0) {
            setFacilities(res.facilities);
            setNearbyFeedback(`Sorted ${res.facilities.length} emergency facilities nearest to your live GPS position.`);
          }
        });
      },
      (err) => {
        setLoadingGps(false);
        setGpsError(`GPS error: ${err.message}. Select your city from presets or click the map.`);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }

  function handleSelectCityPreset(preset) {
    setSelectedCity(preset.name);
    handleLocationSelect(preset.lat, preset.lng, `${preset.name} Center`);
    setNearbyFeedback("");

    // Re-fetch sorted facilities for this preset location
    fetchFacilities({ lat: preset.lat, lng: preset.lng }).then((res) => {
      if (res?.facilities) setFacilities(res.facilities);
    });
  }

  function handleSelectFacility(facility) {
    setActiveFacility(facility);
    calculateRoute(
      selectedLocation.lat,
      selectedLocation.lng,
      facility.latitude,
      facility.longitude
    ).then(setRoutingResult);
  }

  function handleFitAllFacilities() {
    if (facilities.length === 0) return;
    const bounds = facilities.map((f) => [f.latitude, f.longitude]);
    bounds.push([selectedLocation.lat, selectedLocation.lng]);
    setTargetBounds(bounds);
  }

  async function handlePreCacheTiles() {
    setCachingInProgress(true);
    setCacheMessage("Downloading & caching emergency road tiles to local storage...");
    try {
      const res = await triggerTileCache();
      if (res?.ok) {
        setCacheMessage(`✓ Successfully cached! ${res.cachedTileCount} tiles now stored on local disk.`);
        refreshStatus();
      } else {
        setCacheMessage("Tile cache completed. Refreshing status...");
        refreshStatus();
      }
    } catch (e) {
      setCacheMessage(`Cache notice: ${e.message}`);
    } finally {
      setCachingInProgress(false);
    }
  }

  async function handleFindNearbyOsm() {
    setSearchingNearby(true);
    setNearbyFeedback("Searching OpenStreetMap for emergency facilities near your pin...");
    try {
      const res = await fetchNearbyOsmFacilities({
        lat: selectedLocation.lat,
        lng: selectedLocation.lng,
        radiusKm: 15,
      });

      if (res?.ok && Array.isArray(res.facilities) && res.facilities.length > 0) {
        setFacilities(res.facilities);
        setNearbyFeedback(`✓ Found ${res.count} emergency facilities near your location!`);
      } else {
        setNearbyFeedback("Showing closest emergency hospitals from local database.");
      }
    } catch (e) {
      setNearbyFeedback(`Search note: ${e.message}`);
    } finally {
      setSearchingNearby(false);
    }
  }

  // 1. Calculate proximity for EVERY facility from selectedLocation & SORT CLOSEST FIRST
  const sortedAndFilteredFacilities = useMemo(() => {
    const withMetrics = facilities.map((f) => {
      const metrics = computeDistanceAndBearing(
        selectedLocation.lat,
        selectedLocation.lng,
        f.latitude,
        f.longitude
      );
      return {
        ...f,
        distanceKm: metrics.distanceKm,
        bearingDegrees: metrics.bearingDegrees,
        bearingCardinal: metrics.bearingCardinal,
      };
    });

    // Sort strictly nearest first
    withMetrics.sort((a, b) => a.distanceKm - b.distanceKm);

    // Apply filters
    return withMetrics.filter((f) => {
      const matchesType =
        selectedType === "all" ||
        (f.type && f.type.toLowerCase().includes(selectedType.toLowerCase()));
      const matchesSearch =
        !facilitySearch.trim() ||
        f.name?.toLowerCase().includes(facilitySearch.toLowerCase()) ||
        f.address?.toLowerCase().includes(facilitySearch.toLowerCase()) ||
        f.city?.toLowerCase().includes(facilitySearch.toLowerCase());

      let matchesRadius = true;
      if (radiusFilter !== "all") {
        const maxKm = parseFloat(radiusFilter);
        matchesRadius = f.distanceKm <= maxKm;
      }

      return matchesType && matchesSearch && matchesRadius;
    });
  }, [facilities, selectedLocation, selectedType, facilitySearch, radiusFilter]);

  const closestFacility = sortedAndFilteredFacilities[0] || null;
  const cachedTileCount = mapStatus?.cachedTileCount || 0;
  const tilesInstalled = Boolean(mapStatus?.tilesInstalled || cachedTileCount > 0);
  const facilitiesInstalled = Boolean(mapStatus?.facilitiesInstalled);

  // Map layer URLs
  let tileLayerUrl = "/api/tiles/{z}/{x}/{y}.png";
  let tileAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> (Offline Storage)';

  if (layerMode === "hot") {
    tileLayerUrl = "https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png";
    tileAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by Humanitarian OSM';
  } else if (layerMode === "satellite") {
    tileLayerUrl = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
    tileAttribution = "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community";
  } else if (layerMode === "grid") {
    tileLayerUrl = "/api/tiles/{z}/{x}/{y}.png?mode=strict-offline";
    tileAttribution = "Offline Tactical Grid Fallback";
  }

  return (
    <div className="offline-map-system">
      {/* 1. Header & Live Status Indicators */}
      <section className="map-system-header">
        <div>
          <p className="eyebrow">EMERGENCY NAVIGATION &amp; COORDINATES</p>
          <h2>Nearby Emergency Facilities Map</h2>
          <p className="subtitle">
            Instantly displays the closest hospitals, trauma centers, and emergency services sorted
            by live distance from your pin or GPS location.
          </p>
        </div>

        <div className="status-badge-group">
          <span className={`status-pill ${tilesInstalled ? "pill-green" : "pill-amber"}`}>
            <span className="dot" />
            {tilesInstalled
              ? `Map Tiles: ${cachedTileCount} Cached (Offline Ready)`
              : "Map Tiles: Downloading on Demand"}
          </span>

          <span className={`status-pill ${facilitiesInstalled ? "pill-green" : "pill-amber"}`}>
            <span className="dot" />
            {facilitiesInstalled
              ? `Facilities: ${facilities.length} Loaded (${sortedAndFilteredFacilities.length} Nearby)`
              : "Facilities: Not Installed"}
          </span>

          <span className="status-pill pill-green">
            <span className="dot" />
            Sorting: Nearest First Active
          </span>
        </div>
      </section>

      {/* 2. City Hub Presets Selector Bar */}
      <section className="city-presets-container" aria-label="Quick City Hub Jump">
        <div className="city-presets-header">
          <span>Jump to City / Region Hub:</span>
          <span>Pin: <strong>{selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}</strong></span>
        </div>

        <div className="city-presets-list">
          {CITY_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              className={`city-preset-btn ${selectedCity === preset.name ? "active" : ""}`}
              onClick={() => handleSelectCityPreset(preset)}
            >
              📍 {preset.name}
            </button>
          ))}
        </div>
      </section>

      {/* 3. Reassuring Notice Banner */}
      {tilesInstalled ? (
        <div
          className="notice-banner banner-green"
          role="status"
          style={{
            borderLeft: "4px solid #10b981",
            background: "#06281e",
            padding: "12px 18px",
            borderRadius: "10px",
            margin: "0 0 12px 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "14px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <CheckCircle2 size={18} style={{ color: "#34d399", flexShrink: 0 }} />
            <div>
              <strong style={{ color: "#e6fffa", fontSize: "0.9rem" }}>
                Offline Street Map Active &amp; Sorted Nearest-First
              </strong>
              <p style={{ margin: "2px 0 0", color: "#a7f3d0", fontSize: "0.82rem" }}>
                {closestFacility
                  ? `Closest facility to your pin is ${closestFacility.name} (${closestFacility.distanceKm} km away).`
                  : `${cachedTileCount} tiles cached on local disk.`}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              className="action-button secondary"
              style={{ padding: "5px 10px", fontSize: "0.78rem", height: "auto" }}
              onClick={handleFindNearbyOsm}
              disabled={searchingNearby}
            >
              <Crosshair size={13} /> {searchingNearby ? "Searching..." : "Find OSM Facilities Near Pin"}
            </button>

            <button
              type="button"
              className="action-button secondary"
              style={{ padding: "5px 10px", fontSize: "0.78rem", height: "auto" }}
              onClick={handleFitAllFacilities}
            >
              <Maximize2 size={13} /> Fit All Facilities
            </button>
          </div>
        </div>
      ) : null}

      {nearbyFeedback && (
        <div style={{ padding: "8px 14px", background: "#0b192c", border: "1px solid #1e3a5f", borderRadius: "8px", fontSize: "0.85rem", color: "#38bdf8", marginBottom: "12px" }}>
          {nearbyFeedback}
        </div>
      )}

      {/* 4. Controls Bar: GPS & Coordinates Input */}
      <section className="map-control-bar">
        <div className="gps-section">
          <button
            type="button"
            className="action-button primary"
            onClick={handleDetectGps}
            disabled={loadingGps}
          >
            <Navigation size={16} />
            {loadingGps ? "Acquiring GPS..." : "Detect My Live Location"}
          </button>

          <span className="current-source">
            Source: <strong>{selectedLocation.source}</strong>
          </span>
        </div>

        <form onSubmit={handleManualCoordinateSubmit} className="coords-form">
          <label>
            <span>Lat:</span>
            <input
              type="number"
              step="any"
              value={manualLat}
              onChange={(e) => setManualLat(e.target.value)}
              placeholder="28.5900"
              required
            />
          </label>

          <label>
            <span>Lng:</span>
            <input
              type="number"
              step="any"
              value={manualLng}
              onChange={(e) => setManualLng(e.target.value)}
              placeholder="77.2100"
              required
            />
          </label>

          <button type="submit" className="action-button secondary">
            Set Pin
          </button>
        </form>
      </section>

      {gpsError && (
        <div className="gps-error-message" role="alert">
          <AlertTriangle size={16} /> {gpsError}
        </div>
      )}

      {/* Map Layer Switcher Toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap", padding: "10px 14px", background: "#0b0f19", border: "1px solid #1f293d", borderRadius: "10px 10px 0 0", borderBottom: "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <Layers size={16} style={{ color: "#38bdf8" }} />
          <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#cbd5e1" }}>Map Layer:</span>

          <button
            type="button"
            onClick={() => setLayerMode("local")}
            style={{
              padding: "5px 11px",
              borderRadius: "6px",
              fontSize: "0.8rem",
              cursor: "pointer",
              border: layerMode === "local" ? "1px solid #38bdf8" : "1px solid #263449",
              background: layerMode === "local" ? "#0284c7" : "#111827",
              color: "#ffffff",
              fontWeight: layerMode === "local" ? "bold" : "normal",
            }}
          >
            🛡️ Local Storage ({cachedTileCount} tiles)
          </button>

          <button
            type="button"
            onClick={() => setLayerMode("hot")}
            style={{
              padding: "5px 11px",
              borderRadius: "6px",
              fontSize: "0.8rem",
              cursor: "pointer",
              border: layerMode === "hot" ? "1px solid #38bdf8" : "1px solid #263449",
              background: layerMode === "hot" ? "#0284c7" : "#111827",
              color: "#ffffff",
              fontWeight: layerMode === "hot" ? "bold" : "normal",
            }}
          >
            🌐 Humanitarian OSM Live
          </button>

          <button
            type="button"
            onClick={() => setLayerMode("satellite")}
            style={{
              padding: "5px 11px",
              borderRadius: "6px",
              fontSize: "0.8rem",
              cursor: "pointer",
              border: layerMode === "satellite" ? "1px solid #38bdf8" : "1px solid #263449",
              background: layerMode === "satellite" ? "#0284c7" : "#111827",
              color: "#ffffff",
              fontWeight: layerMode === "satellite" ? "bold" : "normal",
            }}
          >
            🛰️ Satellite View
          </button>

          <button
            type="button"
            onClick={() => setLayerMode("grid")}
            style={{
              padding: "5px 11px",
              borderRadius: "6px",
              fontSize: "0.8rem",
              cursor: "pointer",
              border: layerMode === "grid" ? "1px solid #38bdf8" : "1px solid #263449",
              background: layerMode === "grid" ? "#0284c7" : "#111827",
              color: "#ffffff",
              fontWeight: layerMode === "grid" ? "bold" : "normal",
            }}
          >
            ⬛ Tactical Grid
          </button>
        </div>

        <button
          type="button"
          onClick={handleFitAllFacilities}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            padding: "5px 11px",
            borderRadius: "6px",
            fontSize: "0.8rem",
            background: "#1e293b",
            border: "1px solid #334155",
            color: "#f8fafc",
            cursor: "pointer",
          }}
        >
          <Maximize2 size={13} /> Frame Facilities
        </button>
      </div>

      {/* 5. Main Map & Facilities Split View */}
      <div className="map-workspace" style={{ marginTop: "0" }}>
        {/* Leaflet Map Display */}
        <div className="map-wrapper">
          <div className="map-container" style={{ borderRadius: "0 0 16px 16px", borderTop: "none" }}>
            <MapContainer
              center={[selectedLocation.lat, selectedLocation.lng]}
              zoom={12}
              scrollWheelZoom={true}
              style={{ height: "100%", width: "100%", background: "#1e293b" }}
            >
              <MapController
                targetCenter={[selectedLocation.lat, selectedLocation.lng]}
                targetBounds={targetBounds}
              />

              <TileLayer
                key={layerMode}
                attribution={tileAttribution}
                url={tileLayerUrl}
                maxZoom={18}
              />

              <MapClickHandler onLocationSelect={handleLocationSelect} />

              {/* User Position Marker */}
              <Marker
                position={[selectedLocation.lat, selectedLocation.lng]}
                icon={userIcon}
              >
                <Popup>
                  <div className="popup-card">
                    <strong>Your Location Pin</strong>
                    <p>Lat: {selectedLocation.lat}</p>
                    <p>Lng: {selectedLocation.lng}</p>
                    <small>{selectedLocation.source}</small>
                  </div>
                </Popup>
              </Marker>

              {/* User Accuracy Radius */}
              <Circle
                center={[selectedLocation.lat, selectedLocation.lng]}
                radius={800}
                pathOptions={{
                  color: "#38bdf8",
                  fillColor: "#38bdf8",
                  fillOpacity: 0.12,
                  weight: 2,
                }}
              />

              {/* Facilities Markers */}
              {sortedAndFilteredFacilities.map((f, idx) => (
                <Marker
                  key={f.id || `fac-${idx}`}
                  position={[f.latitude, f.longitude]}
                  icon={facilityIcon(f.type)}
                  eventHandlers={{
                    click: () => handleSelectFacility(f),
                  }}
                >
                  <Popup>
                    <div className="popup-card">
                      <strong>{f.name}</strong>
                      <p>Type: {f.type.replace(/_/g, " ").toUpperCase()}</p>
                      <p style={{ color: "#059669", fontWeight: "bold" }}>
                        Distance: {f.distanceKm} km away ({f.bearingCardinal})
                      </p>
                      {f.address && <p>{f.address}</p>}
                      {f.phone && <p>Tel: {f.phone}</p>}
                      <button
                        type="button"
                        className="popup-select-btn"
                        onClick={() => handleSelectFacility(f)}
                      >
                        Calculate Bearing &amp; Route
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          <div className="map-tip">
            <Info size={14} /> Click anywhere on the map to drop your location pin. The facilities list instantly sorts by closest distance to that point.
          </div>
        </div>

        {/* Right Sidebar: Facilities Directory & Proximity */}
        <div className="map-sidebar">
          {/* Spotlight on Closest Facility */}
          {closestFacility && (
            <div className="nearest-spotlight-card">
              <div className="spotlight-top">
                <span>⭐ Nearest Emergency Facility</span>
                <span className="spotlight-distance-badge">
                  {closestFacility.distanceKm} km ({closestFacility.bearingCardinal})
                </span>
              </div>
              <h4 className="spotlight-name">{closestFacility.name}</h4>
              {closestFacility.address && (
                <p className="spotlight-address">{closestFacility.address}</p>
              )}
              <div className="spotlight-actions">
                <button
                  type="button"
                  className="spotlight-btn-primary"
                  onClick={() => handleSelectFacility(closestFacility)}
                >
                  <ArrowUpRight size={14} /> Navigate / Heading
                </button>
                {closestFacility.phone && (
                  <a
                    href={`tel:${closestFacility.phone.split("/")[0].trim()}`}
                    className="spotlight-btn-call"
                  >
                    <PhoneCall size={13} /> Call
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Facility Filter & Search */}
          <div className="sidebar-card">
            <div className="card-header">
              <Hospital size={18} />
              <h3>Nearby Facilities ({sortedAndFilteredFacilities.length})</h3>
            </div>

            <div className="filter-group">
              <div className="search-box">
                <Search size={15} />
                <input
                  type="text"
                  placeholder="Search by hospital, city, or street..."
                  value={facilitySearch}
                  onChange={(e) => setFacilitySearch(e.target.value)}
                />
              </div>

              {/* Radius Filter Chips */}
              <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", alignItems: "center", fontSize: "0.75rem", color: "#94a3b8" }}>
                <span>Radius:</span>
                <button
                  type="button"
                  className={`chip ${radiusFilter === "5" ? "active" : ""}`}
                  onClick={() => setRadiusFilter("5")}
                >
                  &lt; 5 km
                </button>
                <button
                  type="button"
                  className={`chip ${radiusFilter === "15" ? "active" : ""}`}
                  onClick={() => setRadiusFilter("15")}
                >
                  &lt; 15 km
                </button>
                <button
                  type="button"
                  className={`chip ${radiusFilter === "50" ? "active" : ""}`}
                  onClick={() => setRadiusFilter("50")}
                >
                  &lt; 50 km
                </button>
                <button
                  type="button"
                  className={`chip ${radiusFilter === "all" ? "active" : ""}`}
                  onClick={() => setRadiusFilter("all")}
                >
                  All
                </button>
              </div>

              {/* Type Filter Chips */}
              <div className="type-chips">
                <button
                  type="button"
                  className={`chip ${selectedType === "all" ? "active" : ""}`}
                  onClick={() => setSelectedType("all")}
                >
                  All Types
                </button>
                <button
                  type="button"
                  className={`chip ${selectedType === "hospital" ? "active" : ""}`}
                  onClick={() => setSelectedType("hospital")}
                >
                  Hospitals
                </button>
                <button
                  type="button"
                  className={`chip ${selectedType === "fire_station" ? "active" : ""}`}
                  onClick={() => setSelectedType("fire_station")}
                >
                  Fire
                </button>
                <button
                  type="button"
                  className={`chip ${selectedType === "police" ? "active" : ""}`}
                  onClick={() => setSelectedType("police")}
                >
                  Police
                </button>
              </div>
            </div>

            {/* Sorted Proximity Facility List */}
            <div className="facility-scroll-list">
              {sortedAndFilteredFacilities.map((f, idx) => {
                const isSelected = activeFacility?.id === f.id;
                let badgeClass = "distance-far";
                if (f.distanceKm < 3) badgeClass = "distance-close";
                else if (f.distanceKm < 15) badgeClass = "distance-mid";

                return (
                  <div
                    key={f.id || `item-${idx}`}
                    className={`facility-item ${isSelected ? "selected" : ""}`}
                    onClick={() => handleSelectFacility(f)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="facility-item-main" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                      <div>
                        <strong>{f.name}</strong>
                        <div style={{ display: "flex", gap: "4px", alignItems: "center", marginTop: "3px" }}>
                          <span className="facility-type-tag">{f.type.replace(/_/g, " ")}</span>
                          {f.city && <span className="facility-city-pill">{f.city}</span>}
                        </div>
                      </div>

                      <span className={`distance-badge ${badgeClass}`}>
                        {f.distanceKm} km {f.bearingCardinal}
                      </span>
                    </div>

                    {f.address && <p className="facility-addr">{f.address}</p>}
                    {f.phone && <p className="facility-phone">📞 {f.phone}</p>}
                  </div>
                );
              })}

              {sortedAndFilteredFacilities.length === 0 && (
                <div style={{ textAlign: "center", padding: "20px 10px", color: "#94a3b8" }}>
                  <p style={{ margin: "0 0 8px" }}>No facilities match current filters within selected radius.</p>
                  <button
                    type="button"
                    className="action-button secondary"
                    style={{ fontSize: "0.8rem", padding: "6px 12px" }}
                    onClick={() => {
                      setRadiusFilter("all");
                      setSelectedType("all");
                      setFacilitySearch("");
                    }}
                  >
                    Reset Filters
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Direct Distance & Navigation Panel */}
          {activeFacility && (
            <div className="sidebar-card destination-card">
              <div className="card-header">
                <Compass size={18} />
                <h3>Navigation &amp; Bearing</h3>
              </div>

              <div className="dest-summary">
                <span className="dest-label">Selected Destination:</span>
                <strong>{activeFacility.name}</strong>
                <small>{activeFacility.address}</small>
              </div>

              {routingResult ? (
                <div className="route-metrics">
                  <div className="metric-box">
                    <span className="metric-value">
                      {routingResult.directDistanceKm}
                    </span>
                    <span className="metric-unit">km (Direct Haversine)</span>
                  </div>

                  {routingResult.bearingCardinal && (
                    <div className="metric-box">
                      <span className="metric-value">
                        {routingResult.bearingCardinal} ({routingResult.bearingDegrees}°)
                      </span>
                      <span className="metric-unit">Compass Heading</span>
                    </div>
                  )}

                  <div className="route-notice">
                    <Info size={14} />
                    <span>
                      Direct air-line distance calculated offline via Haversine formula.
                    </span>
                  </div>
                </div>
              ) : (
                <p className="calculating-text">Calculating bearing...</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
