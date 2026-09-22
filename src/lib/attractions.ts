import type { ToursListing } from "@/data/tours-and-experiences";
import type { ServiceWithProvider } from "@/lib/travezy";

export interface AttractionInfo {
  attractionName: string;
  attractionType: string;
  entryFeeType: "free" | "paid" | "venue";
  entryFeeDisplay: string;
  adultTicket?: string;
  childTicket?: string;
  foreignTicket?: string;
  parkingFee?: string;
  activityFee?: string;
  openingTime: string;
  closingTime: string;
  timingsDisplay: string;
  bestTimeToVisit: string;
  recommendedDuration: string;
  distanceFromCity: string;
  thingsToDo: string[];
  isBookableActivity: boolean;
  googleMapsUrl: string;
}

/**
 * Known curated dictionary of famous Indian attractions with accurate timings, ticket fees, and visitor information.
 */
const KNOWN_ATTRACTIONS_KNOWLEDGE_BASE: Record<
  string,
  Partial<AttractionInfo>
> = {
  // ── KERALA ATTRACTIONS ──
  "bekal fort": {
    attractionName: "Bekal Fort",
    attractionType: "Historic Coastal Fort",
    entryFeeType: "paid",
    entryFeeDisplay: "Entry: ₹25/person",
    adultTicket: "₹25 (Indian)",
    childTicket: "Free under 15 yrs",
    foreignTicket: "₹300",
    parkingFee: "₹30 (Cars) / ₹10 (Two-wheelers)",
    openingTime: "8:00 AM",
    closingTime: "5:30 PM",
    timingsDisplay: "8:00 AM – 5:30 PM",
    bestTimeToVisit: "October to March (Late afternoon 4:00 PM – 5:30 PM for sunset)",
    recommendedDuration: "1.5 – 2 Hours",
    distanceFromCity: "16 km from Kasaragod town",
    thingsToDo: [
      "Historic observation tower walk",
      "Panoramic Arabian Sea photography",
      "Keyhole fort ramparts stroll",
      "Sunset viewing over the coast",
    ],
    isBookableActivity: false,
  },
  "athirappilly": {
    attractionName: "Athirappilly & Vazhachal Waterfalls",
    attractionType: "Scenic Waterfall & Rainforest Trail",
    entryFeeType: "paid",
    entryFeeDisplay: "Entry: ₹50/person",
    adultTicket: "₹50 (Adult)",
    childTicket: "₹10 (Child)",
    foreignTicket: "₹300",
    parkingFee: "₹30 (Cars) / ₹10 (Bikes)",
    activityFee: "Bamboo Forest Walk included",
    openingTime: "8:00 AM",
    closingTime: "5:00 PM",
    timingsDisplay: "8:00 AM – 5:00 PM",
    bestTimeToVisit: "June to January (Post-monsoon for majestic cascading volume)",
    recommendedDuration: "2 – 3 Hours",
    distanceFromCity: "30 km from Chalakudy · 70 km from Kochi",
    thingsToDo: [
      "View 80-foot majestic Niagara of India waterfall",
      "Trek down to the riverbed viewing point",
      "Rainforest & hornbill birdwatching",
      "Vazhachal rapids exploration",
    ],
    isBookableActivity: false,
  },
  "fort kochi": {
    attractionName: "Fort Kochi & Chinese Fishing Nets",
    attractionType: "Colonial Heritage Port & Promenade",
    entryFeeType: "free",
    entryFeeDisplay: "Entry: Free",
    adultTicket: "Free",
    childTicket: "Free",
    parkingFee: "₹20 (Public Parking)",
    openingTime: "Open 24 Hours",
    closingTime: "Open 24 Hours",
    timingsDisplay: "Open 24 Hours (Best at Sunrise & Sunset)",
    bestTimeToVisit: "October to March (Early morning 6:30 AM or 5:00 PM sunset)",
    recommendedDuration: "2 – 3 Hours",
    distanceFromCity: "Central Fort Kochi coastal area",
    thingsToDo: [
      "Watch traditional cantilevered Chinese fishing nets in action",
      "Stroll along Vasco da Gama seaside promenade",
      "Explore St. Francis Church & colonial art cafes",
      "Sunset viewing over the Arabian Sea harbour",
    ],
    isBookableActivity: false,
  },
  "eravikulam": {
    attractionName: "Eravikulam National Park & Tea Hills",
    attractionType: "Wildlife Sanctuary & High-Altitude Peak",
    entryFeeType: "paid",
    entryFeeDisplay: "Entry: ₹200 (Adult) · ₹150 (Child)",
    adultTicket: "₹200 (Indian)",
    childTicket: "₹150 (Child)",
    foreignTicket: "₹500",
    parkingFee: "₹40 at Anamudi checkpost",
    openingTime: "7:30 AM",
    closingTime: "4:00 PM",
    timingsDisplay: "7:30 AM – 4:00 PM (Closed Feb–Mar for calving season)",
    bestTimeToVisit: "September to January (Pleasant weather & clear mountain peaks)",
    recommendedDuration: "3 – 4 Hours",
    distanceFromCity: "15 km from Munnar town center",
    thingsToDo: [
      "Spot endangered Nilgiri Tahr mountain goats",
      "Board scenic eco-safari bus to Rajamalai viewpoint",
      "Admire Anamudi (South India's highest peak)",
      "High-altitude shola forest nature photography",
    ],
    isBookableActivity: false,
  },
  "alleppey beach": {
    attractionName: "Alleppey Beach & Historic Sea Pier",
    attractionType: "Beach & Maritime Heritage",
    entryFeeType: "free",
    entryFeeDisplay: "Entry: Free",
    adultTicket: "Free",
    childTicket: "Free",
    parkingFee: "₹20 (Beach parking)",
    activityFee: "Lighthouse Entry: ₹20 (Adult) / ₹10 (Child)",
    openingTime: "Open 24 Hours",
    closingTime: "Open 24 Hours",
    timingsDisplay: "Open 24 Hours (Lighthouse: 3:00 PM – 5:00 PM)",
    bestTimeToVisit: "October to March (Late afternoon 4:30 PM – 6:30 PM)",
    recommendedDuration: "1.5 – 2 Hours",
    distanceFromCity: "4 km from Alappuzha Railway Station",
    thingsToDo: [
      "Walk past the historic 150-year-old wooden sea bridge pier",
      "Climb the 1862 Alleppey Lighthouse for 360° views",
      "Enjoy coastal breeze, beach volleyball, and local snacks",
      "Golden hour sunset photography over the Arabian Sea",
    ],
    isBookableActivity: false,
  },
  "mattancherry": {
    attractionName: "Mattancherry Dutch Palace & Jewish Synagogue",
    attractionType: "Museum & Historical Monument",
    entryFeeType: "paid",
    entryFeeDisplay: "Entry: ₹10 (Palace) · ₹10 (Synagogue)",
    adultTicket: "₹10 (Palace) · ₹10 (Synagogue)",
    childTicket: "Free under 15 yrs",
    foreignTicket: "₹10",
    openingTime: "9:45 AM",
    closingTime: "5:00 PM",
    timingsDisplay: "9:45 AM – 5:00 PM (Closed Fridays & Saturdays for Synagogue)",
    bestTimeToVisit: "Morning 10:00 AM – 1:00 PM",
    recommendedDuration: "1.5 – 2 Hours",
    distanceFromCity: "3 km from Fort Kochi · Jew Town area",
    thingsToDo: [
      "Marvel at 16th-century Ramayana mythological murals",
      "View hand-painted 18th-century Chinese blue-and-white tiles",
      "Browse antique spice and handicraft stores in Jew Town",
      "Explore royal palanquins and coronation robes",
    ],
    isBookableActivity: false,
  },
  "kumarakom": {
    attractionName: "Kumarakom Bird Sanctuary & Vembanad Lake",
    attractionType: "Wetland Nature Sanctuary",
    entryFeeType: "paid",
    entryFeeDisplay: "Entry: ₹100/person",
    adultTicket: "₹100 (Indian)",
    childTicket: "₹50 (Child)",
    foreignTicket: "₹250",
    activityFee: "Motorboat / Canoe Ride: ₹400 – ₹800/hour",
    openingTime: "6:00 AM",
    closingTime: "6:00 PM",
    timingsDisplay: "6:00 AM – 6:00 PM (Best at dawn)",
    bestTimeToVisit: "November to February (Peak season for Siberian storks & migratory birds)",
    recommendedDuration: "2 – 3 Hours",
    distanceFromCity: "14 km from Kottayam · on Vembanad Lake banks",
    thingsToDo: [
      "Spot migratory egrets, darters, herons, and kingfishers",
      "Walk along elevated canopy boardwalks through mangrove forests",
      "Take a peaceful wooden canoe ride on Vembanad Lake",
      "Capture serene early morning sunrise mist over the backwaters",
    ],
    isBookableActivity: false,
  },
  "jatayu": {
    attractionName: "Jatayu Earth's Center & Nature Park",
    attractionType: "Sculpture Monument & Eco Park",
    entryFeeType: "paid",
    entryFeeDisplay: "Entry + Cable Car: ₹450/person",
    adultTicket: "₹450 (Including Swiss Cable Car)",
    childTicket: "₹350 (Child)",
    foreignTicket: "₹600",
    parkingFee: "₹40",
    activityFee: "Adventure Rock Zone: ₹1,000 (Optional)",
    openingTime: "10:00 AM",
    closingTime: "5:30 PM",
    timingsDisplay: "10:00 AM – 5:30 PM",
    bestTimeToVisit: "September to March (Early morning or 3:30 PM batch)",
    recommendedDuration: "3 Hours",
    distanceFromCity: "Chadayamangalam · 38 km from Kollam · 46 km from Trivandrum",
    thingsToDo: [
      "Ascend to hilltop via scenic Swiss cable car ropeway",
      "View world's largest bird sculpture (200 ft long, 150 ft wide)",
      "Explore 6D theatre and digital museum inside the sculpture",
      "Enjoy 360° views of the Western Ghats granite hills",
    ],
    isBookableActivity: false,
  },
  "varkala": {
    attractionName: "Varkala North Cliff & Papanasam Beach",
    attractionType: "Geological Cliff & Sacred Beach",
    entryFeeType: "free",
    entryFeeDisplay: "Entry: Free",
    adultTicket: "Free",
    childTicket: "Free",
    parkingFee: "₹20 (Cliff parking)",
    openingTime: "Open 24 Hours",
    closingTime: "Open 24 Hours",
    timingsDisplay: "Open 24 Hours (Cliff Cafes: 7:30 AM – 10:30 PM)",
    bestTimeToVisit: "November to March (Sunset between 5:30 PM – 6:30 PM)",
    recommendedDuration: "2 – 3 Hours",
    distanceFromCity: "4 km from Varkala Sivagiri Railway Station",
    thingsToDo: [
      "Stroll along the dramatic red tertiary sedimentary cliff pathway",
      "Relax at coastal cliff-top cafes with ocean breeze",
      "Dip in the natural mineral spring waters of Papanasam Beach",
      "Panoramic sunset views and coastal photography",
    ],
    isBookableActivity: false,
  },

  // ── RAJASTHAN ATTRACTIONS ──
  "amber fort": {
    attractionName: "Amber Fort & Palace",
    attractionType: "Royal Hill Fort & UNESCO Site",
    entryFeeType: "paid",
    entryFeeDisplay: "Entry: ₹100 (Indian) · ₹500 (Foreigner)",
    adultTicket: "₹100 (Indian Adult)",
    childTicket: "₹10 (Student) / Free under 7 yrs",
    foreignTicket: "₹500 (Foreign Tourist)",
    parkingFee: "₹50 (Cars)",
    activityFee: "Light & Sound Show: ₹250 (English) / ₹150 (Hindi)",
    openingTime: "8:00 AM",
    closingTime: "5:30 PM",
    timingsDisplay: "8:00 AM – 5:30 PM · Night View: 6:30 PM – 9:15 PM",
    bestTimeToVisit: "October to March (Morning 8:30 AM to avoid midday heat)",
    recommendedDuration: "2.5 – 3 Hours",
    distanceFromCity: "11 km from Jaipur city centre",
    thingsToDo: [
      "Marvel at the thousands of convex mirrors in Sheesh Mahal",
      "Explore royal courtyards, Zenana palace, and Diwan-e-Aam",
      "View Maota Lake and Kesar Kyari garden from ramparts",
      "Watch evening Light & Sound Show in the fort courtyard",
    ],
    isBookableActivity: false,
  },
  "hawa mahal": {
    attractionName: "Hawa Mahal (Palace of Winds)",
    attractionType: "Iconic Royal Heritage Monument",
    entryFeeType: "paid",
    entryFeeDisplay: "Entry: ₹50 (Indian) · ₹200 (Foreigner)",
    adultTicket: "₹50 (Indian)",
    childTicket: "₹10 (Student)",
    foreignTicket: "₹200",
    openingTime: "9:00 AM",
    closingTime: "5:00 PM",
    timingsDisplay: "9:00 AM – 5:00 PM",
    bestTimeToVisit: "Morning 9:00 AM (Golden sunlight illuminates the pink facade)",
    recommendedDuration: "1 – 1.5 Hours",
    distanceFromCity: "Badi Choupad, Old Pink City, Jaipur",
    thingsToDo: [
      "Admire 953 honeycomb latticework jharokha windows",
      "Climb to the top tier for panoramic City Palace & Jantar Mantar views",
      "Visit rooftop cafes opposite for iconic photography",
      "Explore the small archaeological courtyard museum",
    ],
    isBookableActivity: false,
  },
  "city palace": {
    attractionName: "City Palace & Royal Complex",
    attractionType: "Royal Palace Complex & Museum",
    entryFeeType: "paid",
    entryFeeDisplay: "Adult: ₹300 · Child: ₹100",
    adultTicket: "₹300 (Adult)",
    childTicket: "₹100 (Child 5–12 yrs)",
    foreignTicket: "₹700",
    activityFee: "Audio Guide: ₹150 | Lake Boat Cruise: ₹450",
    openingTime: "9:30 AM",
    closingTime: "5:30 PM",
    timingsDisplay: "9:30 AM – 5:30 PM",
    bestTimeToVisit: "October to March (Morning 10:00 AM)",
    recommendedDuration: "2 – 3 Hours",
    distanceFromCity: "City Centre, Old Quarter",
    thingsToDo: [
      "Explore royal armory, royal textile galleries, and silver urns",
      "Photograph the peacock-mosaic courtyards (Mor Chowk)",
      "Take a scenic boat ride on Lake Pichola to Jag Mandir",
      "Admire traditional Mewar / Rajput architecture and crystal gallery",
    ],
    isBookableActivity: false,
  },
  "mehrangarh": {
    attractionName: "Mehrangarh Fort & Museum",
    attractionType: "Majestic Hilltop Fortress",
    entryFeeType: "paid",
    entryFeeDisplay: "Entry: ₹100 (Indian) · ₹600 (Foreigner)",
    adultTicket: "₹100 (Indian)",
    childTicket: "Free under 10 yrs",
    foreignTicket: "₹600 (Includes Audio Guide)",
    parkingFee: "₹40",
    activityFee: "Flying Fox Zipline: ₹1,500 (Optional)",
    openingTime: "9:00 AM",
    closingTime: "5:00 PM",
    timingsDisplay: "9:00 AM – 5:00 PM",
    bestTimeToVisit: "October to March (Late afternoon for sunset over Blue City)",
    recommendedDuration: "2.5 – 3 Hours",
    distanceFromCity: "5 km from Jodhpur city centre",
    thingsToDo: [
      "Marvel at palanquin galleries, royal howdahs, and cannon ramparts",
      "Gaze at the 360° blue panoramic landscape of Jodhpur city",
      "Tour the intricate Phool Mahal (Palace of Flowers) & Sheesh Mahal",
      "Experience Flying Fox 6-zipline adventure across fort lakes",
    ],
    isBookableActivity: false,
  },

  // ── GOA ATTRACTIONS ──
  "fort aguada": {
    attractionName: "Fort Aguada & 1864 Portuguese Lighthouse",
    attractionType: "Portuguese Coastal Fort & Lighthouse",
    entryFeeType: "paid",
    entryFeeDisplay: "Entry: ₹25/person",
    adultTicket: "₹25 (Indian Adult)",
    childTicket: "Free under 15 yrs",
    foreignTicket: "₹300",
    parkingFee: "₹30 (Cars)",
    openingTime: "9:30 AM",
    closingTime: "6:00 PM",
    timingsDisplay: "9:30 AM – 6:00 PM",
    bestTimeToVisit: "November to March (Evening 4:30 PM – 6:00 PM for sunset)",
    recommendedDuration: "1.5 – 2 Hours",
    distanceFromCity: "4 km from Candolim Beach · 16 km from Panaji",
    thingsToDo: [
      "Walk the 17th-century bastion walls overlooking Sinquerim Beach",
      "Photograph the iconic four-storey 1864 Portuguese lighthouse",
      "Explore the historic 2,376,000-gallon freshwater cistern",
      "Watch dramatic waves crash against the rocky headland",
    ],
    isBookableActivity: false,
  },
  "basilica of bom jesus": {
    attractionName: "Basilica of Bom Jesus & Se Cathedral",
    attractionType: "UNESCO World Heritage Baroque Church",
    entryFeeType: "free",
    entryFeeDisplay: "Entry: Free",
    adultTicket: "Free",
    childTicket: "Free",
    openingTime: "9:00 AM",
    closingTime: "6:30 PM",
    timingsDisplay: "9:00 AM – 6:30 PM (Sundays: 10:30 AM – 6:30 PM)",
    bestTimeToVisit: "November to March (Morning 9:30 AM for peaceful prayer)",
    recommendedDuration: "1.5 Hours",
    distanceFromCity: "Old Goa · 10 km east of Panaji",
    thingsToDo: [
      "View sacred 400-year-old relics of St. Francis Xavier in silver casket",
      "Admire Corinthian baroque gilding and intricately carved basalt pillars",
      "Visit Se Cathedral opposite featuring the Golden Bell",
      "Explore the Christian Art Museum in the adjacent convent",
    ],
    isBookableActivity: false,
  },
  "dudhsagar": {
    attractionName: "Dudhsagar Waterfalls & Jeep Safari",
    attractionType: "Four-Tier Mountain Waterfall & Forest",
    entryFeeType: "paid",
    entryFeeDisplay: "Entry: ₹100 · Safari: ₹500/seat",
    adultTicket: "₹100 (Forest Entry)",
    childTicket: "₹50 (Child)",
    activityFee: "Forest 4x4 Jeep Safari: ₹500 per seat (Shared 7-seater)",
    parkingFee: "₹50 at Kulem station base",
    openingTime: "7:00 AM",
    closingTime: "5:00 PM",
    timingsDisplay: "7:00 AM – 5:00 PM (Closed during peak monsoon floods)",
    bestTimeToVisit: "October to April (Clean forest trails and full waterfall spray)",
    recommendedDuration: "4 – 5 Hours (Half Day)",
    distanceFromCity: "Mollem National Park · 60 km from Panaji",
    thingsToDo: [
      "Thrilling 45-minute 4x4 jungle jeep safari through river streams",
      "Gaze at the spectacular 310-meter 'Sea of Milk' cascade",
      "Swim in natural freshwater pool with mandatory lifejacket",
      "Photograph the iconic arch railway bridge across the falls",
    ],
    isBookableActivity: true,
  },

  // ── KARNATAKA ATTRACTIONS ──
  "hampi": {
    attractionName: "Hampi UNESCO Monolithic Ruins & Vittala Temple",
    attractionType: "UNESCO World Heritage Ancient Ruins",
    entryFeeType: "paid",
    entryFeeDisplay: "Entry: ₹40 (Indian) · ₹600 (Foreigner)",
    adultTicket: "₹40 (Indian)",
    childTicket: "Free under 15 yrs",
    foreignTicket: "₹600",
    activityFee: "Coracle Boat on Tungabhadra: ₹100–₹150 | Battery Cart: ₹20",
    openingTime: "6:00 AM",
    closingTime: "6:00 PM",
    timingsDisplay: "6:00 AM – 6:00 PM (Virupaksha Temple open from 6:00 AM)",
    bestTimeToVisit: "October to March (Early morning sunrise at Matanga Hill)",
    recommendedDuration: "Full Day (6–8 Hours)",
    distanceFromCity: "Hampi · 12 km from Hosapete Railway Station",
    thingsToDo: [
      "Stand before the world-famous carved Stone Chariot at Vittala Temple",
      "Listen to the 56 musical acoustic granite pillars in Ranga Mantapa",
      "Cross the rocky Tungabhadra River in a traditional round coracle boat",
      "Watch golden sunrise over boulder-strewn landscape from Matanga Hill",
    ],
    isBookableActivity: false,
  },
  "mysore palace": {
    attractionName: "Mysore Palace & Royal Durbar Hall",
    attractionType: "Indo-Saracenic Royal Palace",
    entryFeeType: "paid",
    entryFeeDisplay: "Adult: ₹100 · Child: ₹50",
    adultTicket: "₹100 (Adult)",
    childTicket: "₹50 (Child 10–18 yrs) / Free below 10 yrs",
    foreignTicket: "₹200 (Includes Audio Guide)",
    parkingFee: "₹40 (Cars)",
    openingTime: "10:00 AM",
    closingTime: "5:30 PM",
    timingsDisplay: "10:00 AM – 5:30 PM · Illumination: Sun 7:00 PM – 8:00 PM",
    bestTimeToVisit: "October to March (Sunday evening for 100,000 bulb illumination)",
    recommendedDuration: "2 – 2.5 Hours",
    distanceFromCity: "Central Mysuru, 2 km from Mysore Junction",
    thingsToDo: [
      "Marvel at stained glass ceiling of Kalyana Mantapa (Wedding Hall)",
      "View golden Ambari elephant throne and royal art collection",
      "Witness Sunday evening grand illumination with 97,000 bulbs",
      "Walk through the landscaped royal gardens and pillared arches",
    ],
    isBookableActivity: false,
  },

  // ── TAMIL NADU ATTRACTIONS ──
  "meenakshi": {
    attractionName: "Meenakshi Amman Temple",
    attractionType: "Dravidian Temple & Monument",
    entryFeeType: "free",
    entryFeeDisplay: "Entry: Free (Special Darshan: ₹100)",
    adultTicket: "Free General Entry",
    childTicket: "Free",
    activityFee: "Special Darshan: ₹100 | Thousand Pillar Hall Museum: ₹50",
    openingTime: "5:00 AM",
    closingTime: "10:00 PM",
    timingsDisplay: "5:00 AM – 12:30 PM · 4:00 PM – 10:00 PM",
    bestTimeToVisit: "October to March (Evening 6:30 PM for temple procession)",
    recommendedDuration: "2 – 3 Hours",
    distanceFromCity: "Central Madurai, 1.5 km from Madurai Junction",
    thingsToDo: [
      "Gaze up at 14 towering gopurams covered in thousands of colorful statues",
      "Explore the ancient Hall of 1000 Pillars with acoustic stone columns",
      "Dip your eyes in the sacred Golden Lotus Pond (Potramarai Kulam)",
      "Witness the nightly ceremonial palanquin procession of Lord Shiva",
    ],
    isBookableActivity: false,
  },

  // ── HIMACHAL PRADESH ATTRACTIONS ──
  "hadimba": {
    attractionName: "Hadimba Devi Cedar Temple",
    attractionType: "Ancient Pagoda Wooden Temple",
    entryFeeType: "free",
    entryFeeDisplay: "Entry: Free",
    adultTicket: "Free",
    childTicket: "Free",
    parkingFee: "₹30",
    openingTime: "8:00 AM",
    closingTime: "6:00 PM",
    timingsDisplay: "8:00 AM – 6:00 PM",
    bestTimeToVisit: "April to June (Spring blooms) or Dec to Feb (Snow cover)",
    recommendedDuration: "1 – 1.5 Hours",
    distanceFromCity: "Dhungri Forest · 2.5 km from Old Manali Mall Road",
    thingsToDo: [
      "Admire 1553 four-tier pagoda roof carved from deodar pine timber",
      "Stroll along serene ancient cedar forest trails surrounding temple",
      "Take memorable photos with local fluffy Angora rabbits and yaks",
      "Visit nearby Ghatotkach tree shrine and local wooden handicraft stalls",
    ],
    isBookableActivity: false,
  },
  "solang": {
    attractionName: "Solang Valley & Alpine Viewpoint",
    attractionType: "Alpine Adventure Valley & Snow Point",
    entryFeeType: "free",
    entryFeeDisplay: "Entry: Free (Activities extra)",
    adultTicket: "Free (Valley Access)",
    childTicket: "Free",
    activityFee: "Ropeway Cable Car: ₹500 | Paragliding: ₹1,500 – ₹3,000",
    parkingFee: "₹50 (Cars)",
    openingTime: "6:00 AM",
    closingTime: "6:00 PM",
    timingsDisplay: "6:00 AM – 6:00 PM (Activities best 9:00 AM – 4:00 PM)",
    bestTimeToVisit: "Oct to March (Snow sports) · May to June (Green valley & gliding)",
    recommendedDuration: "3 – 5 Hours (Half Day)",
    distanceFromCity: "14 km northwest of Manali on Rohtang Highway",
    thingsToDo: [
      "Ride the modern cable car gondola up to Mt. Phatru (10,500 ft)",
      "Experience tandem paragliding with panoramic views of snow peaks",
      "Zorbing, quad biking, and winter skiing/snowboarding",
      "Sip hot Himalayan herbal tea and taste local steamed momos",
    ],
    isBookableActivity: false,
  },

  // ── JAMMU & KASHMIR ATTRACTIONS ──
  "dal lake": {
    attractionName: "Dal Lake & Floating Market",
    attractionType: "Alpine Lake & Wooden Shikara Heritage",
    entryFeeType: "free",
    entryFeeDisplay: "Entry: Free (Shikara: ₹500–₹1,000/boat)",
    adultTicket: "Free (Lakeside Promenade)",
    childTicket: "Free",
    activityFee: "Shikara Ride: ₹500 – ₹1,000 per boat / hour (Government rate)",
    openingTime: "Open 24 Hours",
    closingTime: "Open 24 Hours",
    timingsDisplay: "Open 24 Hours (Floating Market: 5:00 AM – 7:30 AM)",
    bestTimeToVisit: "April to October (Pleasant weather, lotus blooms & Chinar colors)",
    recommendedDuration: "2 – 3 Hours",
    distanceFromCity: "Boulevard Road, Srinagar",
    thingsToDo: [
      "Glide on an ornate wooden Shikara boat across mirror-smooth waters",
      "Wake up early to witness the centuries-old floating vegetable market",
      "Step onto Char Chinar island surrounded by four historic trees",
      "Shop saffron, kahwa tea, and pashmina shawls from floating vendors",
    ],
    isBookableActivity: false,
  },
};

/**
 * Resolves complete attraction information for any tour/experience/attraction listing.
 */
export function getAttractionInfo(
  item: Partial<ToursListing> | Partial<ServiceWithProvider> | any
): AttractionInfo {
  const title = (item.title || "").toLowerCase();
  const desc = (item.description || "").toLowerCase();
  const category = (item.category || "").toLowerCase();
  const tourType = (item.tour_type || "").toLowerCase();
  const destination = item.destination || item.city || "Destination";
  const city = item.city || item.destination || "City Center";
  const price = Number(item.price) || 0;

  // 1. Check direct match in known attractions knowledge base
  for (const [key, known] of Object.entries(KNOWN_ATTRACTIONS_KNOWLEDGE_BASE)) {
    if (title.includes(key) || desc.includes(key) || (item.destination && item.destination.toLowerCase().includes(key))) {
      return {
        attractionName: item.title || known.attractionName || "Tourist Attraction",
        attractionType: known.attractionType || "Tourism Landmark & Attraction",
        entryFeeType: known.entryFeeType || "paid",
        entryFeeDisplay: known.entryFeeDisplay || (price > 0 ? `Entry: ₹${price}/person` : "Entry: Free"),
        adultTicket: known.adultTicket || (price > 0 ? `₹${price}` : "Free"),
        childTicket: known.childTicket || (price > 0 ? `₹${Math.round(price / 2)}` : "Free"),
        foreignTicket: known.foreignTicket || (price > 0 ? `₹${price * 3}` : undefined),
        parkingFee: known.parkingFee || "₹30 (Cars) / ₹10 (Bikes)",
        activityFee: known.activityFee,
        openingTime: known.openingTime || "8:00 AM",
        closingTime: known.closingTime || "5:30 PM",
        timingsDisplay: known.timingsDisplay || "8:00 AM – 5:30 PM",
        bestTimeToVisit: known.bestTimeToVisit || "October to March (Morning & Sunset)",
        recommendedDuration: known.recommendedDuration || item.duration || "1.5 – 2 Hours",
        distanceFromCity: known.distanceFromCity || `${city}, ${item.state || ""}`,
        thingsToDo: known.thingsToDo && known.thingsToDo.length > 0 ? known.thingsToDo : [
          "Sightseeing & scenic photography",
          "Heritage & historical architecture walk",
          "Nature trail exploration",
          "Panoramic viewpoints & sunset viewing",
        ],
        isBookableActivity: Boolean(known.isBookableActivity),
        googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((item.title || "") + " " + (item.destination || item.city || ""))}`,
      };
    }
  }

  // 2. Heuristic classification based on keyword patterns

  // Category A: Beaches, Lakes, Promenades, Ghats, Open Viewpoints (Usually Free)
  const isFreeAttraction =
    /beach|promenade|ghat|lake|viewpoint|sunrise|sunset|marine drive|cliff|waterfront/i.test(
      title + " " + tourType
    );

  if (isFreeAttraction) {
    return {
      attractionName: item.title || "Scenic Coastal & Nature Spot",
      attractionType: /beach/i.test(title)
        ? "Beach & Coastal Promenade"
        : /ghat|lake/i.test(title)
        ? "Scenic Lake & Waterfront"
        : "Scenic Viewpoint & Nature Area",
      entryFeeType: "free",
      entryFeeDisplay: "Entry: Free",
      adultTicket: "Free",
      childTicket: "Free",
      parkingFee: "₹20 – ₹30 (Vehicle Parking)",
      openingTime: "Open 24 Hours",
      closingTime: "Open 24 Hours",
      timingsDisplay: "Open 24 Hours (Best at Sunrise & Sunset)",
      bestTimeToVisit: "Early Morning (6:00 AM) or Sunset (5:00 PM – 6:30 PM)",
      recommendedDuration: item.duration || "1.5 – 2 Hours",
      distanceFromCity: `${city} Area · ${item.state || ""}`,
      thingsToDo: [
        "Scenic promenade walk & sunset viewing",
        "Coastal & landscape photography",
        "Local refreshments & artisan stalls",
        "Relaxation and refreshing ocean/mountain breeze",
      ],
      isBookableActivity: false,
      googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((item.title || "") + " " + destination)}`,
    };
  }

  // Category B: Temples, Churches, Mosques, Gurudwaras (Spiritual Places - Free / Token Entry)
  const isSpiritual =
    /temple|church|cathedral|mosque|gurudwara|ashram|monastery|aarti|spiritual/i.test(
      title + " " + tourType
    );

  if (isSpiritual) {
    return {
      attractionName: item.title || "Sacred Shrine & Heritage",
      attractionType: "Sacred Temple & Spiritual Monument",
      entryFeeType: "free",
      entryFeeDisplay: "Entry: Free",
      adultTicket: "Free (General Darshan)",
      childTicket: "Free",
      parkingFee: "₹20",
      activityFee: "Special Darshan / Puja pass available at venue",
      openingTime: "5:30 AM",
      closingTime: "9:00 PM",
      timingsDisplay: "5:30 AM – 12:30 PM · 4:00 PM – 9:00 PM",
      bestTimeToVisit: "Early Morning (6:00 AM) or Evening Aarti Ceremony",
      recommendedDuration: "1 – 2 Hours",
      distanceFromCity: `Central ${city}`,
      thingsToDo: [
        "Spiritual prayer & peaceful reflection",
        "Admire intricate ancient architecture & stone carvings",
        "Participate in evening musical bell ceremonies",
        "Explore sacred heritage courtyards & temple ponds",
      ],
      isBookableActivity: false,
      googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((item.title || "") + " " + destination)}`,
    };
  }

  // Category C: Forts, Palaces, Caves, Museums, Historical Monuments (Standard Ticketed Monument)
  const isMonument =
    /fort|palace|cave|caves|museum|memorial|ruins|heritage|monument|citadel/i.test(
      title + " " + tourType
    );

  if (isMonument) {
    const entryAmount = price > 0 && price <= 200 ? price : 25;
    return {
      attractionName: item.title || "Heritage Monument & Fort",
      attractionType: /fort|citadel/i.test(title)
        ? "Historic Fort & Fortress"
        : /palace/i.test(title)
        ? "Royal Palace & Heritage Complex"
        : /museum|memorial/i.test(title)
        ? "Museum & Cultural Gallery"
        : "Archaeological Monument & Ruins",
      entryFeeType: "paid",
      entryFeeDisplay: `Entry: ₹${entryAmount}/person`,
      adultTicket: `₹${entryAmount} (Indian Adult)`,
      childTicket: "Free under 15 yrs",
      foreignTicket: `₹${Math.max(250, entryAmount * 5)}`,
      parkingFee: "₹30 (Cars) / ₹10 (Bikes)",
      openingTime: "8:00 AM",
      closingTime: "5:30 PM",
      timingsDisplay: "8:00 AM – 5:30 PM",
      bestTimeToVisit: "October to March (Morning 9:00 AM or Late Afternoon 4:00 PM)",
      recommendedDuration: item.duration || "2 – 3 Hours",
      distanceFromCity: `${city} · ${item.state || ""}`,
      thingsToDo: [
        "Historical ramparts & royal courtyard walk",
        "Architecture, fresco & sculpture photography",
        "Panoramic city / ocean views from high watchtowers",
        "Museum artifact & royal weaponry exploration",
      ],
      isBookableActivity: false,
      googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((item.title || "") + " " + destination)}`,
    };
  }

  // Category D: Waterfalls, Botanical Gardens, National Parks, Sanctuaries
  const isNature =
    /waterfall|falls|sanctuary|national park|botanical|garden|zoo|forest|valley/i.test(
      title + " " + tourType
    );

  if (isNature) {
    const entryAmount = price > 0 && price <= 300 ? price : 50;
    return {
      attractionName: item.title || "Nature Spot & Waterfall",
      attractionType: /waterfall|falls/i.test(title)
        ? "Scenic Waterfall & Nature Trail"
        : /sanctuary|national park/i.test(title)
        ? "Wildlife Sanctuary & Nature Reserve"
        : "Botanical Garden & Eco Park",
      entryFeeType: "paid",
      entryFeeDisplay: `Entry: ₹${entryAmount}/person`,
      adultTicket: `₹${entryAmount} (Adult)`,
      childTicket: `₹${Math.round(entryAmount / 2)} (Child)`,
      foreignTicket: `₹${entryAmount * 4}`,
      parkingFee: "₹30 (Cars) / ₹10 (Bikes)",
      openingTime: "8:00 AM",
      closingTime: "5:00 PM",
      timingsDisplay: "8:00 AM – 5:00 PM",
      bestTimeToVisit: "June to February (Lush green post-monsoon and winter)",
      recommendedDuration: item.duration || "2 – 3 Hours",
      distanceFromCity: `${city} Outskirts · ${item.state || ""}`,
      thingsToDo: [
        "Enjoy cool natural spray & scenic waterfall viewpoints",
        "Flora, fauna, and landscape photography",
        "Bamboo trails & rainforest canopy walks",
        "Picnic and fresh natural spring waters",
      ],
      isBookableActivity: false,
      googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((item.title || "") + " " + destination)}`,
    };
  }

  // Category E: Bookable Adventure & Guided Tours (Safaris, Scuba, Kayaking, Rafting, Guided Treks)
  const isAdventure =
    /safari|cruise|rafting|scuba|trek|kayak|paragliding|expedition|boating|ride/i.test(
      title + " " + tourType
    );

  return {
    attractionName: item.title || "Adventure & Outdoor Experience",
    attractionType: /safari/i.test(title)
      ? "Wildlife Jungle Safari"
      : /cruise|boat/i.test(title)
      ? "Scenic Boat & River Cruise"
      : /trek/i.test(title)
      ? "Guided Mountain / Forest Trek"
      : "Outdoor Activity & Adventure",
    entryFeeType: price > 0 ? "paid" : "venue",
    entryFeeDisplay:
      price > 0
        ? `Activity Fee: ₹${price.toLocaleString("en-IN")}/person`
        : "Ticket Cost: Check at Venue",
    adultTicket: price > 0 ? `₹${price.toLocaleString("en-IN")}` : "Check at Venue",
    childTicket: price > 0 ? `₹${Math.round(price * 0.7).toLocaleString("en-IN")}` : undefined,
    parkingFee: "₹40 (Vehicle Parking)",
    openingTime: "6:00 AM",
    closingTime: "6:00 PM",
    timingsDisplay: "Morning & Afternoon Departure Slots (6:00 AM – 5:00 PM)",
    bestTimeToVisit: "October to April (Ideal weather & crystal clear visibility)",
    recommendedDuration: item.duration || "3 – 5 Hours (Half Day)",
    distanceFromCity: `${city} Base Point · ${item.state || ""}`,
    thingsToDo: [
      "Guided outdoor excursion with safety briefing",
      "Wildlife spotting & scenic landscape photography",
      "Authentic local story interaction with certified guides",
      "All safety gear, permits, and equipment provided",
    ],
    isBookableActivity: isAdventure,
    googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((item.title || "") + " " + destination)}`,
  };
}
