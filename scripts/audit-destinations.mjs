import { DESTINATIONS_DATA } from "../src/data/destinations-data.ts";
import { HOTELS_AND_STAYS } from "../src/data/hotels-and-stays.ts";
import { INDIAN_RESTAURANTS } from "../src/data/indian-restaurants.ts";
import { TOURS_AND_EXPERIENCES } from "../src/data/tours-and-experiences.ts";
import { HUMAN_TOUR_GUIDES } from "../src/data/human-guides.ts";

console.log("==================================================================================");
console.log("           TRAVEZY DESTINATION INVENTORY AUDIT (CURRENT STATE)                    ");
console.log("==================================================================================");
console.log("Destination                  | Hotels | Restaurants | Experiences | Human Guides  ");
console.log("-----------------------------+--------+-------------+-------------+---------------");

for (const dest of DESTINATIONS_DATA) {
  const isMatch = (item) => {
    const sMatch = item.state && item.state.toLowerCase() === dest.state.toLowerCase();
    const dMatch = item.destination && item.destination.toLowerCase().includes(dest.name.toLowerCase());
    const cMatch = item.city && dest.popular_cities.some((c) => c.toLowerCase() === item.city.toLowerCase());
    return Boolean(sMatch || dMatch || cMatch);
  };

  const hCount = HOTELS_AND_STAYS.filter(isMatch).length;
  const rCount = INDIAN_RESTAURANTS.filter(isMatch).length;
  const tCount = TOURS_AND_EXPERIENCES.filter(isMatch).length;
  const gCount = HUMAN_TOUR_GUIDES.filter((g) => {
    const sMatch = g.state && g.state.toLowerCase() === dest.state.toLowerCase();
    const cMatch = dest.popular_cities.some((c) => c.toLowerCase() === g.city.toLowerCase());
    return Boolean(sMatch || cMatch);
  }).length;

  console.log(
    `${dest.name.padEnd(28)} | ${String(hCount).padEnd(6)} | ${String(rCount).padEnd(11)} | ${String(tCount).padEnd(11)} | ${gCount}`
  );
}
console.log("==================================================================================");
