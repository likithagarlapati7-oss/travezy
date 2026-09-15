import assert from "node:assert/strict";
import {
  isValidCoord,
  getServiceCoordinates,
  getMapStyle,
  hasMapboxToken,
  OPEN_MAP_STYLE,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  KNOWN_DESTINATION_COORDS,
  geocodeForward,
  geocodeReverse,
} from "./src/lib/mapbox.ts";
import { toServiceRow } from "./src/lib/services.server.ts";

console.log("================================================================================");
console.log("=== Running Week 3 Map Integration & Location Diagnostic Test Suite ===");
console.log("================================================================================");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err.message);
    failed++;
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err.message);
    failed++;
  }
}

// 1. Coordinate validation
test("1. isValidCoord strictly validates geographic coordinates", () => {
  assert.equal(isValidCoord(15.2993, 73.8567), true);
  assert.equal(isValidCoord(-33.8688, 151.2093), true);
  assert.equal(isValidCoord(0, 0), true);
  assert.equal(isValidCoord(null, 73.8567), false);
  assert.equal(isValidCoord(15.2993, undefined), false);
  assert.equal(isValidCoord(95, 73.8567), false); // Lat > 90
  assert.equal(isValidCoord(15.2993, 195), false); // Lng > 180
  assert.equal(isValidCoord(NaN, 73.8567), false);
});

// 2. Service coordinate resolution from stored lat/lng
test("2. getServiceCoordinates returns exact stored coordinates when present", () => {
  const service = {
    id: "s-1",
    destination: "Goa",
    latitude: 15.5439,
    longitude: 73.7628,
  };
  const coords = getServiceCoordinates(service);
  assert.deepEqual(coords, { lat: 15.5439, lng: 73.7628 });
});

// 3. Service coordinate resolution from destination names
test("3. getServiceCoordinates resolves coordinates for Indian & global destinations", () => {
  const goa = getServiceCoordinates({ destination: "Goa" });
  assert.ok(goa !== null);
  assert.equal(goa.lat, KNOWN_DESTINATION_COORDS["goa"][1]);
  assert.equal(goa.lng, KNOWN_DESTINATION_COORDS["goa"][0]);

  const manali = getServiceCoordinates({ destination: "Manali, Himachal Pradesh" });
  assert.ok(manali !== null);
  assert.equal(manali.lat, KNOWN_DESTINATION_COORDS["manali"][1]);

  const jaipur = getServiceCoordinates({ city: "Jaipur" });
  assert.ok(jaipur !== null);
  assert.equal(jaipur.lat, KNOWN_DESTINATION_COORDS["jaipur"][1]);

  const munnar = getServiceCoordinates({ destination: "Munnar Tea Hills" });
  assert.ok(munnar !== null);
  assert.equal(munnar.lat, KNOWN_DESTINATION_COORDS["munnar"][1]);
});

// 4. Graceful handling of unknown location
test("4. getServiceCoordinates returns null for unknown/empty location without crashing", () => {
  const unknown = getServiceCoordinates({ destination: "", city: null });
  assert.equal(unknown, null);
});

// 5. Open Tile map style fallback when Mapbox token is not configured
test("5. getMapStyle returns OpenStreetMap raster tiles when no Mapbox token is configured", () => {
  const style = getMapStyle();
  if (!hasMapboxToken()) {
    assert.deepEqual(style, OPEN_MAP_STYLE);
    assert.equal(typeof style, "object");
    assert.ok(Array.isArray(style.sources["osm-tiles"].tiles));
  } else {
    assert.equal(style, "mapbox://styles/mapbox/streets-v12");
  }
});

// 6. Provider service row builder persists coordinates
test("6. toServiceRow converts form input to database row with coordinates", () => {
  const input = {
    title: "Luxury Beach Villa",
    description: "Private beachside retreat",
    category: "stay",
    destination: "Goa",
    city: "Calangute",
    state: "Goa",
    country: "India",
    price: 12000,
    currency: "INR",
    image_url: "https://images.unsplash.com/photo-goa.jpg",
    latitude: 15.5439,
    longitude: 73.7628,
  };

  const rowWithCoords = toServiceRow(input, "provider-uuid-1", true);
  assert.equal(rowWithCoords.latitude, 15.5439);
  assert.equal(rowWithCoords.longitude, 73.7628);
  assert.equal(rowWithCoords.provider_id, "provider-uuid-1");

  const rowFallback = toServiceRow(input, "provider-uuid-1", false);
  assert.equal(rowFallback.latitude, undefined);
  assert.equal(rowFallback.longitude, undefined);
});

// 7. Multi-service markers mapping
test("7. Search page mapMarkers builds marker array with title, category, and coords", () => {
  const services = [
    { id: "1", title: "Goa Scuba", destination: "Goa", price: 3500, currency: "INR", category: "activity" },
    { id: "2", title: "Manali Trek", destination: "Manali", price: 5000, currency: "INR", category: "tour" },
    { id: "3", title: "Unknown Mystery Tour", destination: "Unknown Nowhere 999", price: 1000, currency: "INR", category: "tour" },
  ];

  const mapMarkers = services
    .map((s) => {
      const coords = getServiceCoordinates(s);
      if (!coords) return null;
      return {
        id: s.id,
        lat: coords.lat,
        lng: coords.lng,
        title: s.title,
        subtitle: `${s.destination} • ₹${s.price}`,
        category: s.category,
        serviceId: s.id,
      };
    })
    .filter(Boolean);

  assert.equal(mapMarkers.length, 2);
  assert.equal(mapMarkers[0].title, "Goa Scuba");
  assert.equal(mapMarkers[1].title, "Manali Trek");
  assert.ok(isValidCoord(mapMarkers[0].lat, mapMarkers[0].lng));
  assert.ok(isValidCoord(mapMarkers[1].lat, mapMarkers[1].lng));
});

// 8. Service details single marker
test("8. Service Details location marker displays correct coords and metadata", () => {
  const service = {
    id: "svc-jaipur-palace",
    title: "Heritage Haveli Stay",
    destination: "Jaipur",
    category: "stay",
    latitude: null,
    longitude: null,
  };

  const coords = getServiceCoordinates(service);
  assert.ok(coords !== null);

  const marker = {
    id: service.id,
    lat: coords.lat,
    lng: coords.lng,
    title: service.title,
    subtitle: service.destination,
    category: service.category,
    serviceId: service.id,
  };

  assert.equal(marker.title, "Heritage Haveli Stay");
  assert.equal(marker.lat, 26.9124);
  assert.equal(marker.lng, 75.7873);
});

// 9. Geocoding forward lookup
await testAsync("9. geocodeForward returns location suggestions", async () => {
  const suggestions = await geocodeForward("Goa");
  assert.ok(Array.isArray(suggestions));
  assert.ok(suggestions.length > 0);
  assert.ok(isValidCoord(suggestions[0].lat, suggestions[0].lng));
});

// 10. Reverse geocoding lookup
await testAsync("10. geocodeReverse converts [lng, lat] to readable address", async () => {
  const result = await geocodeReverse(73.8567, 15.2993);
  assert.ok(result !== null);
  assert.ok(typeof result.placeName === "string");
  assert.equal(result.lat, 15.2993);
  assert.equal(result.lng, 73.8567);
});

console.log("\n================================================================================");
console.log(`Results: ${passed} passed, ${failed} failed.`);
console.log("================================================================================");

if (failed > 0) process.exit(1);
