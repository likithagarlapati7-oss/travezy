import type { StaysListing } from "./hotels-and-stays.ts";
import type { IndianRestaurantData } from "./indian-restaurants.ts";
import type { ToursListing } from "./tours-and-experiences.ts";
import type { HumanTourGuide } from "./human-guides.ts";
import { DESTINATIONS_DATA } from "./destinations-data.ts";

// ── Realistic Image Pools for Varied Stays, Dining & Experiences ─────────────

const HOTEL_IMAGES = [
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1568495248636-6432b97bd949?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1561501900-3701fa6a0864?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80",
];

const RESTAURANT_IMAGES = [
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1526318896980-cf78c088247c?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=1200&q=80",
];

const TOUR_IMAGES = [
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1600100397608-f010f443b749?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1588096344356-9b5700810777?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1572455857811-045fb4255b5d?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1558431382-27e303142255?auto=format&fit=crop&w=1200&q=80",
];

const GUIDE_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=600&q=80",
];

// ── Destination-Specific Catalog Profiles ─────────────────────────────────────

interface StateCatalogTemplate {
  state: string;
  cities: string[];
  hotelTemplates: {
    nameSuffix: string;
    type: string;
    cat: "hotel" | "resort" | "homestay" | "heritage";
    star: number;
    price: number;
    amenities: string[];
    desc: (city: string, state: string) => string;
  }[];
  restaurantTemplates: {
    nameSuffix: string;
    cuisine: string;
    price: number;
    desc: (city: string, state: string) => string;
  }[];
  tourTemplates: {
    title: (city: string, state: string) => string;
    cat: "tour" | "activity" | "adventure" | "heritage";
    type: string;
    duration: string;
    price: number;
    desc: (city: string, state: string) => string;
    included: string[];
  }[];
  guideTemplates: {
    name: string;
    gender: "male" | "female";
    languages: string[];
    specialties: string[];
    bio: (state: string, city: string) => string;
    hourly: number;
    halfDay: number;
    fullDay: number;
  }[];
}

// ── Generic Rich Generation Engine for All 36 Destinations ───────────────────

const COMMON_HOTEL_PROFILES = [
  { nameSuffix: "Palace & Luxury Suites", type: "5-Star Luxury Palace Hotel", cat: "heritage" as const, star: 5, price: 12500, amenities: ["Private Butler", "Infinity Pool", "Ayurvedic Spa", "Fine Dining", "Airport Limousine"] },
  { nameSuffix: "Heritage Manor & Courtyard Stays", type: "Colonial Heritage Villa", cat: "heritage" as const, star: 4.8, price: 8200, amenities: ["Heritage Courtyard", "Free WiFi", "Organic Dining", "Library Lounge"] },
  { nameSuffix: "Grand Nature Resort & Spa", type: "Eco-Luxury Eco Resort", cat: "resort" as const, star: 4.9, price: 14500, amenities: ["Mountain/Water Views", "Wellness Spa", "Infinity Pool", "Nature Walks"] },
  { nameSuffix: "Boutique Tea & Coffee Estate Bungalow", type: "Plantation Homestay", cat: "homestay" as const, star: 4.7, price: 6500, amenities: ["Estate Trails", "Fireplace", "Home-Cooked Thalis", "Birdwatching"] },
  { nameSuffix: "Seaside Breeze Retreat & Beachfront Villa", type: "Beachfront Villa & Resort", cat: "resort" as const, star: 4.8, price: 9800, amenities: ["Private Beach Access", "Seafood Barbecue", "Infinity Pool", "Yoga Deck"] },
  { nameSuffix: "Urban Landmark Hotel & Executive Suites", type: "Premium Business & Leisure Hotel", cat: "hotel" as const, star: 4.6, price: 5400, amenities: ["High-Speed WiFi", "Fitness Centre", "All-Day Dining", "Concierge"] },
  { nameSuffix: "Hilltop Panorama Chalet & Alpine Lodge", type: "Scenic Hill Chalet", cat: "hotel" as const, star: 4.8, price: 7800, amenities: ["Panoramic Balcony", "Heated Rooms", "Bonfire Evenings", "Cafe Lounge"] },
  { nameSuffix: "Tranquil Backwater / Lakeside Haven", type: "Waterfront Sanctuary", cat: "resort" as const, star: 4.9, price: 11000, amenities: ["Private Boat Deck", "Sunset Views", "Ayurvedic Massages", "Organic Breakfast"] },
  { nameSuffix: "Royal Haveli & Marwar Suites", type: "Royal Heritage Haveli", cat: "heritage" as const, star: 4.7, price: 7400, amenities: ["Fresco Painted Walls", "Rooftop Restaurant", "Cultural Folk Music", "Pool"] },
  { nameSuffix: "The Fern Eco-Sanctuary", type: "Certified Green Eco-Resort", cat: "resort" as const, star: 4.6, price: 6200, amenities: ["Zero-Waste Kitchen", "Solar Heated Pool", "Forest Safaris", "Spa"] },
  { nameSuffix: "Wilderness Safari Camp & Luxury Tents", type: "Glamping Safari Camp", cat: "resort" as const, star: 4.8, price: 9500, amenities: ["AC Luxury Tents", "Jungle Safari Jeep", "Night Stargazing", "Buffet Dining"] },
  { nameSuffix: "Riverside Cottage & Angler's Cabin", type: "Riverside Homestay", cat: "homestay" as const, star: 4.5, price: 4200, amenities: ["Riverfront Garden", "Fresh Catch Cooking", "Free WiFi", "Pet Friendly"] },
  { nameSuffix: "Artisan Boutique Stay & Cultural Inn", type: "Artisan Boutique Hotel", cat: "hotel" as const, star: 4.6, price: 5100, amenities: ["Local Art Gallery", "Craft Workshops", "Terrace Cafe", "Bicycle Rental"] },
  { nameSuffix: "Golden Palms Residency & Suites", type: "Comfort City Hotel", cat: "hotel" as const, star: 4.3, price: 3400, amenities: ["Free High-Speed WiFi", "24/7 Room Service", "Doctor on Call", "Travel Desk"] },
  { nameSuffix: "Serene Valley Farmstay & Orchards", type: "Organic Farmstay", cat: "homestay" as const, star: 4.7, price: 3800, amenities: ["Fruit Picking", "Milking Experience", "Clay Oven Cooking", "Bonfire"] },
  { nameSuffix: "The Waterfront Boardwalk Hotel", type: "Waterfront Hotel", cat: "hotel" as const, star: 4.5, price: 6900, amenities: ["Harbour Views", "Rooftop Grill", "Swimming Pool", "Cocktail Lounge"] },
  { nameSuffix: "Monastery View Mountain Retreat", type: "Spiritual Hill Retreat", cat: "hotel" as const, star: 4.8, price: 5800, amenities: ["Meditation Hall", "Himalayan Herbal Tea", "Library", "Valley Balconies"] },
  { nameSuffix: "Imperial Classic Heritage Stay", type: "Imperial Heritage Lodge", cat: "heritage" as const, star: 4.7, price: 8600, amenities: ["Antique Furnishings", "Billiards Room", "Lush Lawn Gardens", "Royal Dining"] },
  { nameSuffix: "Sunset Horizon Beach Shacks & Resort", type: "Beach Boutique Resort", cat: "resort" as const, star: 4.6, price: 7200, amenities: ["Beach Hammocks", "Live Acoustic Music", "Cocktail Shack", "Water Sports"] },
  { nameSuffix: "Green Woods Plantation Homestay", type: "Traditional Homestay", cat: "homestay" as const, star: 4.8, price: 4600, amenities: ["Home Cooked Meals", "Spice Garden Walks", "Filtered Spring Water", "Host Guided Treks"] },
  { nameSuffix: "The Grand Regal Hotel & Convention Centre", type: "5-Star Grand Hotel", cat: "hotel" as const, star: 4.9, price: 13500, amenities: ["Luxury Spa", "Multiple Specialty Restaurants", "Helipad Access", "Valet Parking"] },
  { nameSuffix: "Cloud Nine Mountain Chalets", type: "Luxury Hill Chalet", cat: "resort" as const, star: 4.8, price: 10400, amenities: ["Floor-to-Ceiling Windows", "Jacuzzi Tub", "Fireplace", "High-Altitude Breakfast"] },
  { nameSuffix: "Coastal Sands Boutique Hideaway", type: "Boutique Coastal Hideaway", cat: "resort" as const, star: 4.7, price: 7900, amenities: ["Private Cabanas", "Seafood Grill", "Surf Board Rental", "Sunset Cruises"] },
];

const COMMON_RESTAURANT_PROFILES = [
  { nameSuffix: "Heritage Royal Dining Hall", cuisine: "Regional Royal Thali", price: 750 },
  { nameSuffix: "Coastal Spice Seafood Kitchen", cuisine: "Coastal Seafood & Curry", price: 650 },
  { nameSuffix: "The Old Town Cafe & Bakery", cuisine: "Artisan Cafe & Bakery", price: 450 },
  { nameSuffix: "Grand Malabar / Claypot Kitchen", cuisine: "Traditional Regional Delicacies", price: 550 },
  { nameSuffix: "Pure Veg Satvik Bhojanalaya", cuisine: "Pure Vegetarian Thali", price: 320 },
  { nameSuffix: "Spice Route Street Food Courtyard", cuisine: "Regional Street Food & Chaat", price: 280 },
  { nameSuffix: "Rooftop Sky Lounge & Grills", cuisine: "Tandoori & Continental Grills", price: 950 },
  { nameSuffix: "The Riverside Fishermen's Shack", cuisine: "Catch of the Day Fresh Fish", price: 580 },
  { nameSuffix: "Village Clay Oven & Dhaba", cuisine: "Rustic Village Claypot Cooking", price: 380 },
  { nameSuffix: "Emerald Plantation Garden Restaurant", cuisine: "Farm-to-Table Organic Meals", price: 620 },
  { nameSuffix: "Dawat Mughlai & Biryani House", cuisine: "Dum Biryani & Kebabs", price: 520 },
  { nameSuffix: "Highland Tibetan & Himalayan Kitchen", cuisine: "Momos, Thukpa & Soups", price: 350 },
  { nameSuffix: "Saffron Fine Dining Pavilion", cuisine: "Gourmet Pan-Indian", price: 1100 },
  { nameSuffix: "Banana Leaf Traditional Mess", cuisine: "Authentic Banana Leaf Meals", price: 250 },
  { nameSuffix: "Brewery & Craft Woodfired Pizzeria", cuisine: "Woodfired Pizza & Beverages", price: 700 },
  { nameSuffix: "Ocean Pearl Crab & Prawn Corner", cuisine: "Specialty Shellfish & Curries", price: 820 },
  { nameSuffix: "The French Quarter Bistro", cuisine: "Franco-Indian Fusion & Crepes", price: 680 },
  { nameSuffix: "Avakaya & Guntur Andhra Kitchen", cuisine: "Fiery Spiced Regional Curries", price: 490 },
  { nameSuffix: "Chopstick Asian & Street Wok", cuisine: "Indo-Asian Noodle Bar", price: 420 },
  { nameSuffix: "Sweet Heritage Mithai & Chaat Ghar", cuisine: "Traditional Sweets, Lassi & Snacks", price: 220 },
  { nameSuffix: "The Copper Chimney Charcoal Grills", cuisine: "North Indian Tandoori & Naan", price: 600 },
  { nameSuffix: "Green Leaf South Indian Tiffin Centre", cuisine: "Crispy Dosa, Idli & Filter Coffee", price: 200 },
  { nameSuffix: "The Golden Chariot Fine Dining", cuisine: "Royal Court Recipes & Desserts", price: 1200 },
];

const COMMON_TOUR_PROFILES = [
  { titleTemplate: (city: string, state: string) => `${city} Cultural Heritage Walking Trail & Ancient Temples`, cat: "heritage" as const, type: "Heritage Walking Tour", duration: "4 Hours", price: 1400 },
  { titleTemplate: (city: string, state: string) => `${city} Backwater & River Canoe Eco-Expedition`, cat: "activity" as const, type: "Waterway Canoe Expedition", duration: "5 Hours", price: 2200 },
  { titleTemplate: (city: string, state: string) => `${city} Sunrise Mountain Peak Trek & Valley Vistas`, cat: "adventure" as const, type: "High-Altitude Nature Trek", duration: "Full Day (8 Hours)", price: 2800 },
  { titleTemplate: (city: string, state: string) => `${city} Street Food Trail & Spice Market Sensory Walk`, cat: "tour" as const, type: "Culinary Tasting Experience", duration: "3.5 Hours", price: 1200 },
  { titleTemplate: (city: string, state: string) => `${city} Wildlife Safari & Birdwatching Guided Walk`, cat: "adventure" as const, type: "Wildlife Sanctuary Safari", duration: "6 Hours", price: 3100 },
  { titleTemplate: (city: string, state: string) => `${city} Ancient Rock-Cut Caves & Archaeological Exploration`, cat: "heritage" as const, type: "Archaeological Excursion", duration: "5 Hours", price: 1800 },
  { titleTemplate: (city: string, state: string) => `${city} Tea, Coffee & Spice Plantation Guided Sensory Walk`, cat: "activity" as const, type: "Plantation Botanical Walk", duration: "3 Hours", price: 1100 },
  { titleTemplate: (city: string, state: string) => `${city} Sunset Catamaran Cruise & Coastal Dolphin Watch`, cat: "activity" as const, type: "Ocean Sunset Boat Cruise", duration: "3 Hours", price: 1900 },
  { titleTemplate: (city: string, state: string) => `${city} Traditional Village Craft & Handloom Immersion`, cat: "heritage" as const, type: "Artisan Village Tour", duration: "4 Hours", price: 1500 },
  { titleTemplate: (city: string, state: string) => `${city} Twilight Photography Walk & Historic Fort Panorama`, cat: "tour" as const, type: "Guided Photo Walk", duration: "3 Hours", price: 1300 },
  { titleTemplate: (city: string, state: string) => `${city} River Rafting & Adventure Water Rapids`, cat: "adventure" as const, type: "Whitewater River Rafting", duration: "4 Hours", price: 2400 },
  { titleTemplate: (city: string, state: string) => `${city} Spiritual Sacred Ghats & Evening Fire Aarti Ceremony`, cat: "heritage" as const, type: "Spiritual Ceremony Tour", duration: "3 Hours", price: 950 },
  { titleTemplate: (city: string, state: string) => `${city} Organic Farm-to-Table Cooking Masterclass`, cat: "activity" as const, type: "Interactive Cooking Class", duration: "4 Hours", price: 1750 },
  { titleTemplate: (city: string, state: string) => `${city} Deep Forest Jungle Jeep Safari & Waterfall Dip`, cat: "adventure" as const, type: "4x4 Jungle Excursion", duration: "Full Day (7 Hours)", price: 3400 },
  { titleTemplate: (city: string, state: string) => `${city} Cycling Heritage Tour Through Old Quarters`, cat: "tour" as const, type: "Bicycle Heritage Ride", duration: "3.5 Hours", price: 1150 },
  { titleTemplate: (city: string, state: string) => `${city} Traditional Folk Dance & Martial Arts Evening Show`, cat: "tour" as const, type: "Live Cultural Performance", duration: "2.5 Hours", price: 1050 },
  { titleTemplate: (city: string, state: string) => `${city} High-Altitude Stargazing & Camping Night`, cat: "adventure" as const, type: "Stargazing Desert/Hill Camp", duration: "Overnight", price: 4200 },
  { titleTemplate: (city: string, state: string) => `${city} Coastal Mangrove Kayaking & Hidden Lagoons`, cat: "adventure" as const, type: "Guided Kayaking Tour", duration: "3.5 Hours", price: 1650 },
  { titleTemplate: (city: string, state: string) => `${city} Royal Palace Exclusive Guided Tour & Museum`, cat: "heritage" as const, type: "Royal Citadel Tour", duration: "4 Hours", price: 1600 },
  { titleTemplate: (city: string, state: string) => `${city} Secret Waterfall Hidden Trail Expedition`, cat: "adventure" as const, type: "Eco Waterfall Trek", duration: "5 Hours", price: 2100 },
  { titleTemplate: (city: string, state: string) => `${city} Desert Camel Safari & Sand Dune Sunset`, cat: "adventure" as const, type: "Desert Camel Safari", duration: "4 Hours", price: 1950 },
  { titleTemplate: (city: string, state: string) => `${city} Scuba Diving & Coral Reef Marine Discovery`, cat: "adventure" as const, type: "Certified Scuba Dive", duration: "Half Day (5 Hours)", price: 4500 },
];

const COMMON_GUIDE_NAMES = [
  { name: "Arun Nair", gender: "male" as const, langs: ["Malayalam", "English", "Hindi"], specs: ["Heritage & History", "Backwater Trails", "Spice Gardens"] },
  { name: "Priya Sharma", gender: "female" as const, langs: ["Hindi", "English", "Rajasthani"], specs: ["Royal Forts", "Cultural Storytelling", "Culinary Walks"] },
  { name: "Rohit D'Souza", gender: "male" as const, langs: ["English", "Konkani", "Portuguese", "Hindi"], specs: ["Colonial Heritage", "Seaside Trails", "Night Markets"] },
  { name: "Kavitha Raman", gender: "female" as const, langs: ["Tamil", "English", "French"], specs: ["Dravidian Architecture", "Temple Lore", "Silk & Handicrafts"] },
  { name: "Tenzin Norbu", gender: "male" as const, langs: ["Hindi", "Tibetan", "English"], specs: ["Himalayan Treks", "Monastery Culture", "Flora & Fauna"] },
  { name: "Vikramaditya Rao", gender: "male" as const, langs: ["Kannada", "English", "Telugu", "Hindi"], specs: ["Hampi Ruins", "Coffee Trails", "Wildlife Safaris"] },
  { name: "Ananya Banerjee", gender: "female" as const, langs: ["Bengali", "English", "Hindi"], specs: ["Literary Heritage", "Artisan Villages", "Food Walks"] },
  { name: "Farooq Ahmed", gender: "male" as const, langs: ["Kashmiri", "Urdu", "Hindi", "English"], specs: ["Dal Lake Lore", "Valley Treks", "Pashmina Arts"] },
];

/**
 * Generates expanded hotels (22+ per destination)
 */
export function generateExpandedHotels(): StaysListing[] {
  const result: StaysListing[] = [];
  let hotelIdCounter = 100;

  for (const dest of DESTINATIONS_DATA) {
    const cities = dest.popular_cities;

    COMMON_HOTEL_PROFILES.forEach((tmpl, idx) => {
      hotelIdCounter++;
      const city = cities[idx % cities.length] || dest.name;
      const id = `hotel-${dest.slug}-${idx + 1}-${hotelIdCounter}`;
      const title = `${city} ${tmpl.nameSuffix}`;
      const baseLat = dest.latitude + (Math.sin(idx * 1.5) * 0.08);
      const baseLng = dest.longitude + (Math.cos(idx * 1.5) * 0.08);
      const rating = Number((4.4 + (idx % 6) * 0.1).toFixed(1));
      const reviews = 45 + (idx * 23);

      result.push({
        id,
        title,
        description: `Experience exceptional hospitality at ${title} located in ${city}, ${dest.state}. Offering ${tmpl.type.toLowerCase()} comfort, panoramic views, top-tier amenities, and seamless access to ${dest.popular_attractions[idx % dest.popular_attractions.length] || "local landmarks"}.`,
        category: tmpl.cat,
        hotel_type: tmpl.type,
        star_rating: tmpl.star,
        destination: `${city}, ${dest.state}`,
        city,
        state: dest.state,
        country: "India",
        price: tmpl.price + ((idx % 4) * 400),
        currency: "INR",
        rating: Math.min(5.0, rating),
        review_count: reviews,
        latitude: baseLat,
        longitude: baseLng,
        image_url: HOTEL_IMAGES[idx % HOTEL_IMAGES.length] ?? HOTEL_IMAGES[0]!,
        is_active: true,
        max_guests: 4,
        amenities: tmpl.amenities,
        check_in_time: "14:00",
        check_out_time: "11:00",
        cancellation_policy: "Free cancellation up to 24 hours before check-in",
        nearby_attractions: dest.popular_attractions.slice(0, 3),
        verifier_id: `verifier-${dest.slug}-01`,
        provider_id: `provider-${dest.slug}-hotel`,
      });
    });
  }

  return result;
}

/**
 * Generates expanded restaurants (22+ per destination)
 */
export function generateExpandedRestaurants(): IndianRestaurantData[] {
  const result: IndianRestaurantData[] = [];
  let restIdCounter = 200;

  for (const dest of DESTINATIONS_DATA) {
    const cities = dest.popular_cities;

    COMMON_RESTAURANT_PROFILES.forEach((tmpl, idx) => {
      restIdCounter++;
      const city = cities[idx % cities.length] || dest.name;
      const id = `rest-${dest.slug}-${idx + 1}-${restIdCounter}`;
      const title = `${city} ${tmpl.nameSuffix}`;
      const baseLat = dest.latitude + (Math.sin(idx * 2.1) * 0.07);
      const baseLng = dest.longitude + (Math.cos(idx * 2.1) * 0.07);
      const rating = Number((4.3 + (idx % 7) * 0.1).toFixed(1));
      const reviews = 60 + (idx * 31);

      result.push({
        id,
        title,
        category: "restaurant",
        destination: `${city}, ${dest.state}`,
        city,
        state: dest.state,
        country: "India",
        description: `Celebrated dining landmark in ${city}, ${dest.state} specializing in ${tmpl.cuisine}. Indulge in authentic regional flavors prepared with locally sourced spices and time-honored traditional recipes. Vegetarian & non-vegetarian selections available.`,
        price: tmpl.price + ((idx % 3) * 50),
        currency: "INR",
        rating: Math.min(5.0, rating),
        review_count: reviews,
        latitude: baseLat,
        longitude: baseLng,
        image_url: RESTAURANT_IMAGES[idx % RESTAURANT_IMAGES.length] ?? RESTAURANT_IMAGES[0]!,
        is_active: true,
        max_guests: 8,
        cuisine_type: `${dest.name} ${tmpl.cuisine}`,
      });
    });
  }

  return result;
}

/**
 * Generates expanded experiences/tours (22+ per destination)
 */
export function generateExpandedTours(): ToursListing[] {
  const result: ToursListing[] = [];
  let tourIdCounter = 300;

  for (const dest of DESTINATIONS_DATA) {
    const cities = dest.popular_cities;

    COMMON_TOUR_PROFILES.forEach((tmpl, idx) => {
      tourIdCounter++;
      const city = cities[idx % cities.length] || dest.name;
      const id = `tour-${dest.slug}-${idx + 1}-${tourIdCounter}`;
      const title = tmpl.titleTemplate(city, dest.state);
      const baseLat = dest.latitude + (Math.sin(idx * 1.8) * 0.09);
      const baseLng = dest.longitude + (Math.cos(idx * 1.8) * 0.09);
      const rating = Number((4.5 + (idx % 5) * 0.1).toFixed(1));
      const reviews = 35 + (idx * 19);

      result.push({
        id,
        title,
        description: `Embark on the memorable ${title}. Explore iconic sights, hidden scenic viewpoints, and authentic heritage in ${city}, ${dest.state} guided by government-certified local experts. All entry permits and safety equipment included.`,
        category: tmpl.cat,
        tour_type: tmpl.type,
        destination: `${city}, ${dest.state}`,
        city,
        state: dest.state,
        country: "India",
        duration: tmpl.duration,
        price: tmpl.price + ((idx % 4) * 200),
        currency: "INR",
        rating: Math.min(5.0, rating),
        review_count: reviews,
        latitude: baseLat,
        longitude: baseLng,
        image_url: TOUR_IMAGES[idx % TOUR_IMAGES.length] ?? TOUR_IMAGES[0]!,
        is_active: true,
        max_guests: 15,
        included: ["Certified Expert Guide", "Entry Tickets & Permits", "Mineral Water & Light Refreshments", "First Aid Kit"],
        excluded: ["Personal Souvenirs", "Gratuities & Tips"],
        starting_location: `Central Landmark / Station, ${city}`,
        guide_languages: ["English", "Hindi", "Regional Local Language"],
        cancellation_policy: "Free cancellation up to 24 hours prior to tour start",
        provider_id: `provider-${dest.slug}-tour`,
      });
    });
  }

  return result;
}

/**
 * Generates human guides (3-4 per destination)
 */
export function generateExpandedGuides(): HumanTourGuide[] {
  const result: HumanTourGuide[] = [];
  let guideIdCounter = 400;

  for (const dest of DESTINATIONS_DATA) {
    const cities = dest.popular_cities;

    // Create 3-4 guides per destination
    for (let i = 0; i < 4; i++) {
      guideIdCounter++;
      const tmpl = COMMON_GUIDE_NAMES[(dest.name.length + i) % COMMON_GUIDE_NAMES.length] ?? COMMON_GUIDE_NAMES[0]!;
      const city = cities[i % cities.length] || dest.name;
      const guideName = `${tmpl.name.split(" ")[0]} (${dest.name} Expert)`;
      const id = `guide-${dest.slug}-${i + 1}`;
      const userId = `user-guide-${dest.slug}-${i + 1}`;
      const baseLat = dest.latitude + (Math.sin(i * 2.5) * 0.05);
      const baseLng = dest.longitude + (Math.cos(i * 2.5) * 0.05);

      result.push({
        id,
        user_id: userId,
        name: `${tmpl.name.split(" ")[0]} ${tmpl.name.split(" ")[1] || "Guide"}`,
        profile_image: GUIDE_AVATARS[(dest.name.length + i) % GUIDE_AVATARS.length] ?? GUIDE_AVATARS[0]!,
        bio: `Native resident of ${city}, ${dest.state} with ${6 + i * 2} years of professional tour guiding experience. Passionate about local storytelling, regional cuisine, ancient monuments, and secret wilderness spots in ${dest.name}.`,
        city,
        state: dest.state,
        latitude: baseLat,
        longitude: baseLng,
        service_radius_km: 45,
        coverage_areas: [city, ...cities.slice(0, 3)],
        languages: tmpl.langs,
        tour_categories: ["Heritage", "Culture", "Food Walks", "Nature"],
        specializations: tmpl.specs,
        hourly_rate: 650 + (i * 100),
        half_day_rate: 2200 + (i * 300),
        full_day_rate: 3800 + (i * 500),
        currency: "INR",
        experience_years: 5 + i * 2,
        verification_status: "verified",
        is_travezy_verified: true,
        active: true,
        rating: Number((4.7 + (i % 3) * 0.1).toFixed(1)),
        review_count: 28 + (i * 14),
        completed_tours: 110 + (i * 45),
        phone_masked: "+91 98765 •••••",
        phone_full: "+91 9876543210",
        email: `guide.${dest.slug}.${i + 1}@travezy.test`,
        available_today: true,
        availability_slots: [
          { slot_id: `s-${i}-1`, start_time: "09:00", end_time: "13:00", label: "Morning Heritage Walk", is_available: true },
          { slot_id: `s-${i}-2`, start_time: "14:00", end_time: "18:00", label: "Afternoon Sightseeing", is_available: true },
          { slot_id: `s-${i}-3`, start_time: "18:30", end_time: "21:30", label: "Evening Food & Bazaar Trail", is_available: true },
        ],
        tour_packages: [
          {
            id: `pkg-${dest.slug}-${i}-1`,
            title: `Half-Day Highlights of ${city}`,
            duration: "4 Hours",
            duration_type: "half_day",
            price: 2200 + (i * 300),
            description: `A curated half-day excursion covering top cultural monuments, photo points, and secret local food spots in ${city}.`,
            highlights: ["Historical Monuments", "Artisan Workshop", "Local Snack Tasting", "Photo Spots"],
          },
          {
            id: `pkg-${dest.slug}-${i}-2`,
            title: `Full-Day Immersive ${dest.name} Discovery`,
            duration: "8 Hours",
            duration_type: "full_day",
            price: 3800 + (i * 500),
            description: `Complete full-day VIP guided journey with private commentary, authentic dining guidance, and nature trails across ${city} and surrounding areas.`,
            highlights: ["All Major Landmarks", "Traditional Lunch Spot", "Hidden Viewpoints", "Personalized Itinerary"],
          },
        ],
        reviews: [
          {
            id: `rev-g-${dest.slug}-${i}-1`,
            reviewer_name: "Aarav Mehta",
            reviewer_location: "Mumbai, India",
            rating: 5,
            date: "August 2026",
            comment: `Amazing tour in ${city}! Incredibly knowledgeable, friendly, and took us to the most authentic local food places. Highly recommended!`,
            tour_type: "Heritage Walking Tour",
          },
          {
            id: `rev-g-${dest.slug}-${i}-2`,
            reviewer_name: "Elena Rostova",
            reviewer_location: "London, UK",
            rating: 5,
            date: "July 2026",
            comment: `We had a wonderful day exploring ${dest.name}. Punctual, respectful, and shared fascinating historical context.`,
            tour_type: "Full-Day Discovery",
          },
        ],
      });
    }
  }

  return result;
}
