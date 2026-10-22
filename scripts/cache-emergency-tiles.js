import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const TILES_DIR = path.join(ROOT_DIR, "data", "maps", "tiles");
const FACILITIES_FILE = path.join(ROOT_DIR, "data", "maps", "facilities.geojson");

function deg2num(lat_deg, lon_deg, zoom) {
  const lat_rad = (lat_deg * Math.PI) / 180;
  const n = Math.pow(2, zoom);
  const xtile = Math.floor(((lon_deg + 180) / 360) * n);
  const ytile = Math.floor(
    ((1 - Math.asinh(Math.tan(lat_rad)) / Math.PI) / 2) * n
  );
  return [xtile, ytile];
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchTileWithRetry(z, x, y, retries = 2) {
  const targetDir = path.join(TILES_DIR, String(z), String(x));
  const targetPath = path.join(targetDir, `${y}.png`);

  if (fs.existsSync(targetPath)) {
    const stat = fs.statSync(targetPath);
    // 6987 is known size of OSM 403 blocked PNG
    if (stat.size > 0 && stat.size !== 6987 && stat.size !== 2049) {
      return { status: "cached", path: targetPath };
    }
  }

  // Upstreams: HOT (Humanitarian OSM - emergency/medical highlight) first, then standard OSM
  const upstreams = [
    {
      url: `https://a.tile.openstreetmap.fr/hot/${z}/${x}/${y}.png`,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://www.openstreetmap.org/",
      },
    },
    {
      url: `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://www.openstreetmap.org/",
      },
    },
  ];

  for (const upstream of upstreams) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const resp = await fetch(upstream.url, {
          headers: upstream.headers,
          signal: AbortSignal.timeout(6000),
        });

        if (resp.ok) {
          const buffer = Buffer.from(await resp.arrayBuffer());
          // Ensure it's not a block banner (which is exactly 6987 bytes)
          if (buffer.length > 500 && buffer.length !== 6987 && buffer.length !== 2049) {
            fs.mkdirSync(targetDir, { recursive: true });
            fs.writeFileSync(targetPath, buffer);
            return { status: "downloaded", path: targetPath, size: buffer.length };
          }
        }
      } catch {
        await sleep(300 * attempt);
      }
    }
  }

  return { status: "error", error: "Could not fetch tile" };
}

async function main() {
  console.log("=== Kiwix Emergency: Offline Map Tile Pre-Cacher ===");
  console.log(`Destination: ${TILES_DIR}`);

  // Default coordinate center: New Delhi emergency facilities
  let minLat = 28.53;
  let maxLat = 28.66;
  let minLng = 77.16;
  let maxLng = 77.25;

  if (fs.existsSync(FACILITIES_FILE)) {
    try {
      const geo = JSON.parse(fs.readFileSync(FACILITIES_FILE, "utf-8"));
      if (Array.isArray(geo.features)) {
        for (const feat of geo.features) {
          const [lng, lat] = feat.geometry?.coordinates || [];
          if (lat && lng) {
            minLat = Math.min(minLat, lat - 0.015);
            maxLat = Math.max(maxLat, lat + 0.015);
            minLng = Math.min(minLng, lng - 0.015);
            maxLng = Math.max(maxLng, lng + 0.015);
          }
        }
        console.log(`Computed bounds for ${geo.features.length} facilities:`);
        console.log(`Lat: ${minLat.toFixed(4)}..${maxLat.toFixed(4)} | Lng: ${minLng.toFixed(4)}..${maxLng.toFixed(4)}`);
      }
    } catch (e) {
      console.warn("Using default bounds:", e.message);
    }
  }

  // Pre-cache zoom levels 9, 10, 11, 12, 13, 14
  const zooms = [9, 10, 11, 12, 13, 14];
  const queue = [];

  for (const z of zooms) {
    const [minX, maxY] = deg2num(minLat, minLng, z);
    const [maxX, minY] = deg2num(maxLat, maxLng, z);

    for (let x = Math.min(minX, maxX); x <= Math.max(minX, maxX); x++) {
      for (let y = Math.min(minY, maxY); y <= Math.max(minY, maxY); y++) {
        queue.push({ z, x, y });
      }
    }
  }

  console.log(`Total tiles to cache: ${queue.length} across zooms [${zooms.join(", ")}]`);

  let downloadedCount = 0;
  let cachedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < queue.length; i++) {
    const { z, x, y } = queue[i];
    const res = await fetchTileWithRetry(z, x, y);

    if (res.status === "downloaded") {
      downloadedCount++;
      process.stdout.write(`\rProgress: ${i + 1}/${queue.length} (New: ${downloadedCount}, Cached: ${cachedCount})`);
      await sleep(80);
    } else if (res.status === "cached") {
      cachedCount++;
    } else {
      errorCount++;
    }
  }

  console.log("\n");
  console.log("=== Offline Map Tile Cache Complete ===");
  console.log(`✓ Total checked:    ${queue.length}`);
  console.log(`✓ Newly downloaded: ${downloadedCount}`);
  console.log(`✓ Cached on disk:   ${cachedCount}`);
  if (errorCount > 0) console.log(`⚠ Skipped/errors:   ${errorCount}`);
  console.log(`Tiles stored at:    ${TILES_DIR}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
