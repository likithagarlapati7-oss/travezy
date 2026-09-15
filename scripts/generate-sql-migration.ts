import fs from "fs";
import path from "path";
import { INDIAN_RESTAURANTS } from "../src/data/indian-restaurants.js";

function escapeSql(str: string | null | undefined): string {
  if (str === null || str === undefined) return "NULL";
  return `'${str.replace(/'/g, "''")}'`;
}

const header = `-- ==============================================================================
-- Migration: Add 108 Authentic Indian Restaurants Across 28 States & 8 UTs
-- Week 9 / India-Wide Restaurant Discovery Extension
-- ==============================================================================

INSERT INTO public.services (
  id,
  title,
  description,
  category,
  destination,
  city,
  state,
  country,
  price,
  currency,
  rating,
  review_count,
  image_url,
  is_active
) VALUES
`;

const values = INDIAN_RESTAURANTS.map((r) => {
  return `(
  ${escapeSql(r.id)},
  ${escapeSql(r.title)},
  ${escapeSql(r.description)},
  ${escapeSql(r.category)},
  ${escapeSql(r.destination)},
  ${escapeSql(r.city)},
  ${escapeSql(r.state)},
  ${escapeSql(r.country)},
  ${r.price},
  ${escapeSql(r.currency)},
  ${r.rating},
  ${r.review_count},
  ${escapeSql(r.image_url)},
  ${r.is_active}
)`;
}).join(",\n");

const footer = `
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  destination = EXCLUDED.destination,
  city = EXCLUDED.city,
  state = EXCLUDED.state,
  country = EXCLUDED.country,
  price = EXCLUDED.price,
  currency = EXCLUDED.currency,
  rating = EXCLUDED.rating,
  review_count = EXCLUDED.review_count,
  image_url = EXCLUDED.image_url,
  is_active = EXCLUDED.is_active;
`;

const migrationContent = header + values + footer;
const targetPath = path.resolve("supabase/migrations/20260906000000_indian_restaurants.sql");
fs.writeFileSync(targetPath, migrationContent, "utf8");
console.log(`Generated SQL migration file at: ${targetPath} (${INDIAN_RESTAURANTS.length} restaurants with UUIDs)`);
