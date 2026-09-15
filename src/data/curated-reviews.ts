export interface CuratedReview {
  id: string;
  service_id: string;
  booking_id?: string;
  user_id?: string;
  rating: number;
  title?: string;
  comment: string;
  reviewer_name: string;
  reviewer_avatar?: string | null;
  reviewer_location?: string;
  travel_date: string;
  created_at: string;
  updated_at?: string;
  provider_response?: string | null;
  provider_responded_at?: string | null;
  images?: string[];
  verified_stay: boolean;
}

export const CURATED_REVIEWS: CuratedReview[] = [
  // ─── HOTELS & STAYS ──────────────────────────────────────────────────────────
  {
    id: "cr-hotel-001",
    service_id: "20100000-0000-4000-8000-000000000001", // The Gateway Hotel Beach Road, Visakhapatnam
    rating: 5,
    title: "Panoramic Bay of Bengal views and incredible seafood!",
    comment: "Our 3-night stay at The Gateway was outstanding. Waking up to the sunrise over RK Beach directly from our balcony was magical. The coastal seafood restaurant served the best Andhra crab curry we've ever tasted. Attentive staff and pristine rooms.",
    reviewer_name: "Rahul Sengupta",
    reviewer_avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80",
    reviewer_location: "Kolkata, India",
    travel_date: "August 2026",
    created_at: "2026-08-18T14:30:00.000Z",
    provider_response: "Dear Rahul, thank you for the wonderful review! We're thrilled that you loved the sunrise views and our chef's signature crab curry. Looking forward to hosting you again!",
    provider_responded_at: "2026-08-19T09:15:00.000Z",
    verified_stay: true,
  },
  {
    id: "cr-hotel-002",
    service_id: "20100000-0000-4000-8000-000000000001",
    rating: 5,
    title: "Perfect beach weekend getaway",
    comment: "Clean infinity pool overlooking the ocean, prompt 24/7 room service, and effortless check-in. Walking distance to the Submarine museum. Highly recommend the deluxe sea-view suite!",
    reviewer_name: "Ananya Deshmukh",
    reviewer_avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80",
    reviewer_location: "Hyderabad, India",
    travel_date: "July 2026",
    created_at: "2026-07-26T18:45:00.000Z",
    verified_stay: true,
  },
  {
    id: "cr-hotel-003",
    service_id: "20100000-0000-4000-8000-000000000001",
    rating: 4,
    title: "Very comfortable with great hospitality",
    comment: "The property is well maintained and the breakfast buffet spread is immense with both South Indian and Continental options. The beach road gets slightly lively on Saturday evening, but room soundproofing is good.",
    reviewer_name: "Vikram Patel",
    reviewer_avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=400&q=80",
    reviewer_location: "Ahmedabad, India",
    travel_date: "June 2026",
    created_at: "2026-06-12T11:20:00.000Z",
    verified_stay: true,
  },
  {
    id: "cr-hotel-004",
    service_id: "20100000-0000-4000-8000-000000000002", // Novotel Varun Beach
    rating: 5,
    title: "Unrivalled luxury on Varun Beach",
    comment: "The rooftop infinity lounge and executive suites offer world-class comfort. Excellent spa therapies and a top-notch fitness centre. Truly a 5-star experience in Vizag.",
    reviewer_name: "Siddharth Rao",
    reviewer_avatar: "https://images.unsplash.com/photo-1521119989659-a83eee488004?auto=format&fit=crop&w=400&q=80",
    reviewer_location: "Bengaluru, India",
    travel_date: "August 2026",
    created_at: "2026-08-22T16:10:00.000Z",
    provider_response: "Thank you Siddharth! We take pride in delivering exceptional stays and hope to welcome you back on your next coastal journey.",
    provider_responded_at: "2026-08-23T10:00:00.000Z",
    verified_stay: true,
  },
  {
    id: "cr-hotel-005",
    service_id: "20100000-0000-4000-8000-000000000003",
    rating: 5,
    title: "Enchanting Himalayan sanctuary",
    comment: "Nestled amidst towering deodar cedars with crisp mountain air and heated indoor pool with panoramic snow peaks. The afternoon high tea in the garden was unforgettable.",
    reviewer_name: "Sarah Jenkins",
    reviewer_avatar: "https://images.unsplash.com/photo-1534751516642-a171edd26a88?auto=format&fit=crop&w=400&q=80",
    reviewer_location: "London, UK",
    travel_date: "August 2026",
    created_at: "2026-08-10T12:00:00.000Z",
    verified_stay: true,
  },
  {
    id: "cr-hotel-006",
    service_id: "20100000-0000-4000-8000-000000000004",
    rating: 5,
    title: "Royal palace hospitality at its finest",
    comment: "Staying here felt like stepping back into royal Rajasthan history. Courtyard flute players at dawn, exquisite thali dinner under the stars, and peacocks strolling through the manicured gardens.",
    reviewer_name: "Priya Nair",
    reviewer_avatar: "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=400&q=80",
    reviewer_location: "Kochi, India",
    travel_date: "July 2026",
    created_at: "2026-07-15T09:30:00.000Z",
    verified_stay: true,
  },
  {
    id: "cr-hotel-007",
    service_id: "20100000-0000-4000-8000-000000000005",
    rating: 4,
    title: "Charming heritage mansion",
    comment: "Authentic wooden architecture, serene backwater breeze, and delicious home-cooked Syrian Christian delicacies. Perfect for families looking for peaceful Kerala tranquility.",
    reviewer_name: "David Miller",
    reviewer_avatar: "https://images.unsplash.com/photo-1507591064344-4c6ce005b128?auto=format&fit=crop&w=400&q=80",
    reviewer_location: "Sydney, Australia",
    travel_date: "August 2026",
    created_at: "2026-08-04T15:20:00.000Z",
    verified_stay: true,
  },

  // ─── TOURS & EXPERIENCES ─────────────────────────────────────────────────────
  {
    id: "cr-tour-001",
    service_id: "30100000-0000-4000-8000-000000000001", // Araku Valley Vistadome Rail Expedition
    rating: 5,
    title: "Breathtaking train journey through 58 tunnels and waterfalls!",
    comment: "The glass-domed train journey was straight out of a postcard. Our guide Ramesh shared fascinating folk legends about the Eastern Ghats. The Borra Caves stalactites were surreal, and the organic Araku coffee tasting was the highlight.",
    reviewer_name: "Meera Iyer",
    reviewer_avatar: "https://images.unsplash.com/photo-1548142813-c348350df52b?auto=format&fit=crop&w=400&q=80",
    reviewer_location: "Chennai, India",
    travel_date: "August 2026",
    created_at: "2026-08-25T17:00:00.000Z",
    provider_response: "Dear Meera, thank you! Ramesh was delighted to hear your praise. The Araku coffee harvest season makes this trip extra special!",
    provider_responded_at: "2026-08-26T08:30:00.000Z",
    verified_stay: true,
  },
  {
    id: "cr-tour-002",
    service_id: "30100000-0000-4000-8000-000000000001",
    rating: 5,
    title: "Spectacular eco-adventure for the whole family",
    comment: "Well organized from early morning pickup to the evening return. The Dhimsa tribal dance performance was genuine and joyful. A must-do experience when visiting Andhra Pradesh!",
    reviewer_name: "Amitabh Banerjee",
    reviewer_avatar: "https://images.unsplash.com/photo-1564564321837-a57b7070ac4f?auto=format&fit=crop&w=400&q=80",
    reviewer_location: "Kolkata, India",
    travel_date: "July 2026",
    created_at: "2026-07-19T20:10:00.000Z",
    verified_stay: true,
  },
  {
    id: "cr-tour-003",
    service_id: "30100000-0000-4000-8000-000000000001",
    rating: 4,
    title: "Great guide and picturesque hills",
    comment: "Fascinating geological history inside the million-year-old caves. The train ride was smooth and air-conditioned. Carry a light jacket as Araku gets pleasantly chilly.",
    reviewer_name: "Rohan Verma",
    reviewer_avatar: "https://images.unsplash.com/photo-1492446845049-9c50ce313d00?auto=format&fit=crop&w=400&q=80",
    reviewer_location: "Delhi NCR, India",
    travel_date: "June 2026",
    created_at: "2026-06-28T14:40:00.000Z",
    verified_stay: true,
  },
  {
    id: "cr-tour-004",
    service_id: "30100000-0000-4000-8000-000000000002", // Munnar Tea Garden & Western Ghats Trek
    rating: 5,
    title: "Walking among the emerald clouds in Munnar",
    comment: "We trekked through misty tea estates, visited an artisanal tea factory, and spotted Nilgiri Tahrs at Eravikulam. The guide's knowledge of native bird species made this deeply rewarding.",
    reviewer_name: "Elena Rostova",
    reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
    reviewer_location: "Zurich, Switzerland",
    travel_date: "August 2026",
    created_at: "2026-08-14T11:00:00.000Z",
    provider_response: "Thank you Elena! Munnar's high altitude biodiversity is truly special. Safe travels across Kerala!",
    provider_responded_at: "2026-08-15T09:00:00.000Z",
    verified_stay: true,
  },
  {
    id: "cr-tour-005",
    service_id: "30100000-0000-4000-8000-000000000003", // Alleppey Backwaters Houseboat Cruise
    rating: 5,
    title: "Pure serenity gliding through palm-fringed canals",
    comment: "The traditional thatched Kettuvallam houseboat was spotless with air-conditioned bedrooms. Fresh Karimeen fish cooked on board with coconut curry. Watching village life by the canals was peace redefined.",
    reviewer_name: "Rajesh Kulkarni",
    reviewer_avatar: "https://images.unsplash.com/photo-1500649297466-74794c70acfc?auto=format&fit=crop&w=400&q=80",
    reviewer_location: "Pune, India",
    travel_date: "August 2026",
    created_at: "2026-08-20T19:30:00.000Z",
    verified_stay: true,
  },
  {
    id: "cr-tour-006",
    service_id: "30100000-0000-4000-8000-000000000004", // Jaisalmer Thar Desert Camel & Dune Safari
    rating: 5,
    title: "Golden sunset dunes and Rajasthani campfire night",
    comment: "Riding camels across silky Sam sand dunes at sunset, followed by Kalbelia folk dance around the bonfire with hot dal baati churma. The stargazing in the Thar desert was breathtaking.",
    reviewer_name: "Tanvi Saxena",
    reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=400&q=80",
    reviewer_location: "Jaipur, India",
    travel_date: "July 2026",
    created_at: "2026-07-10T22:15:00.000Z",
    verified_stay: true,
  },

  // ─── RESTAURANTS & CULINARY EXPERIENCES ───────────────────────────────────────
  {
    id: "cr-rest-001",
    service_id: "10100000-0000-4000-8000-000000000001", // Grand Andhra Spice House
    rating: 5,
    title: "Mind-blowing Royyala Vepudu and Hyderabadi Mutton Biryani!",
    comment: "If you love authentic, fiery Andhra cuisine, this is the gold standard in Visakhapatnam. The gongura mutton and prawns fry were packed with flavor. Served on fresh banana leaves with endless aromatic ghee and podi.",
    reviewer_name: "Karthik Reddy",
    reviewer_avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=400&q=80",
    reviewer_location: "Vijayawada, India",
    travel_date: "August 2026",
    created_at: "2026-08-27T13:15:00.000Z",
    provider_response: "Dhanyavadalu Karthik! Our secret is in the stone-ground Guntur spices and heritage slow-cooking techniques. See you again soon!",
    provider_responded_at: "2026-08-28T10:00:00.000Z",
    verified_stay: true,
  },
  {
    id: "cr-rest-002",
    service_id: "10100000-0000-4000-8000-000000000001",
    rating: 5,
    title: "Unforgettable traditional banana leaf feast",
    comment: "Generous portions, warm welcoming service, and authentic regional thali. Even during rush lunch hours the staff managed everything with a smile.",
    reviewer_name: "Sneha Roy",
    reviewer_avatar: "https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=400&q=80",
    reviewer_location: "Bhubaneswar, India",
    travel_date: "August 2026",
    created_at: "2026-08-11T14:00:00.000Z",
    verified_stay: true,
  },
  {
    id: "cr-rest-003",
    service_id: "10100000-0000-4000-8000-000000000001",
    rating: 4,
    title: "Flavors are bold and spicy",
    comment: "Spicy in the best way possible! The Natu Kodi Pulao (country chicken) is deeply aromatic. Remember to order sweet pootharekulu to soothe the palate afterward.",
    reviewer_name: "Gaurav Malhotra",
    reviewer_avatar: "https://images.unsplash.com/photo-1506795660198-e95c77602129?auto=format&fit=crop&w=400&q=80",
    reviewer_location: "Mumbai, India",
    travel_date: "July 2026",
    created_at: "2026-07-29T21:00:00.000Z",
    verified_stay: true,
  },
  {
    id: "cr-rest-004",
    service_id: "10100000-0000-4000-8000-000000000002",
    rating: 5,
    title: "Crispy ghee roast dosas with 4 homemade chutneys",
    comment: "Best breakfast spot in town. Golden crispy paper roast dosas, steaming filter coffee, and melt-in-the-mouth medu vadas. Super fast service and spotless hygiene.",
    reviewer_name: "Lakshmi Narayanan",
    reviewer_avatar: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=400&q=80",
    reviewer_location: "Coimbatore, India",
    travel_date: "August 2026",
    created_at: "2026-08-05T08:45:00.000Z",
    verified_stay: true,
  },
  {
    id: "cr-rest-005",
    service_id: "10100000-0000-4000-8000-000000000003",
    rating: 5,
    title: "Catch-of-the-day fish fry overlooking the beach",
    comment: "They let you pick your fresh catch right from the ice counter. The rava-fried pomfret and crab masala were sublime. Great beachside ambience and gentle sea breeze.",
    reviewer_name: "Johnathan Lee",
    reviewer_avatar: "https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?auto=format&fit=crop&w=400&q=80",
    reviewer_location: "Singapore",
    travel_date: "August 2026",
    created_at: "2026-08-16T20:30:00.000Z",
    provider_response: "Thank you Johnathan! We source fresh catch twice daily from local Vizag fishermen. Thrilled you loved the crab masala!",
    provider_responded_at: "2026-08-17T11:00:00.000Z",
    verified_stay: true,
  },
];

/**
 * Curated pool of distinct realistic human reviewer profiles.
 * Each person has a unique name, location, and verified non-colliding Unsplash portrait URL.
 */
export const REVIEWER_PERSONA_POOL: { name: string; loc: string; avatar: string }[] = [
  {
    name: "Aarav Sharma",
    loc: "Mumbai, India",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Ananya Deshmukh",
    loc: "Hyderabad, India",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Vikram Patel",
    loc: "Ahmedabad, India",
    avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Siddharth Rao",
    loc: "Bengaluru, India",
    avatar: "https://images.unsplash.com/photo-1521119989659-a83eee488004?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Sarah Jenkins",
    loc: "London, UK",
    avatar: "https://images.unsplash.com/photo-1534751516642-a171edd26a88?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Priya Nair",
    loc: "Kochi, India",
    avatar: "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "David Miller",
    loc: "Sydney, Australia",
    avatar: "https://images.unsplash.com/photo-1507591064344-4c6ce005b128?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Meera Iyer",
    loc: "Chennai, India",
    avatar: "https://images.unsplash.com/photo-1548142813-c348350df52b?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Amitabh Banerjee",
    loc: "Kolkata, India",
    avatar: "https://images.unsplash.com/photo-1564564321837-a57b7070ac4f?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Rohan Verma",
    loc: "Delhi NCR, India",
    avatar: "https://images.unsplash.com/photo-1492446845049-9c50ce313d00?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Elena Rostova",
    loc: "Zurich, Switzerland",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Rajesh Kulkarni",
    loc: "Pune, India",
    avatar: "https://images.unsplash.com/photo-1500649297466-74794c70acfc?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Tanvi Saxena",
    loc: "Jaipur, India",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Karthik Reddy",
    loc: "Vijayawada, India",
    avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Sneha Roy",
    loc: "Bhubaneswar, India",
    avatar: "https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Gaurav Malhotra",
    loc: "Mumbai, India",
    avatar: "https://images.unsplash.com/photo-1506795660198-e95c77602129?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Lakshmi Narayanan",
    loc: "Coimbatore, India",
    avatar: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Johnathan Lee",
    loc: "Singapore",
    avatar: "https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Pooja Hegde",
    loc: "Mangaluru, India",
    avatar: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Dr. Arvind Swamy",
    loc: "Mysuru, India",
    avatar: "https://images.unsplash.com/photo-1509783236416-c9ad59bae472?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Chloe Martin",
    loc: "Paris, France",
    avatar: "https://images.unsplash.com/photo-1573496799652-408c2ac9fe98?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Marco Silva",
    loc: "Lisbon, Portugal",
    avatar: "https://images.unsplash.com/photo-1525130413817-d45c1d127c42?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Karan Mehta",
    loc: "Chandigarh, India",
    avatar: "https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "James Wilson",
    loc: "Edinburgh, UK",
    avatar: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Varun Joshi",
    loc: "Nagpur, India",
    avatar: "https://images.unsplash.com/photo-1552058544-f2b08422138a?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Kenji Takahashi",
    loc: "Tokyo, Japan",
    avatar: "https://images.unsplash.com/photo-1541823709867-1b206113eafd?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Aditi Rao",
    loc: "Indore, India",
    avatar: "https://images.unsplash.com/photo-1542206395-9feb3edaa68d?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Emily Watson",
    loc: "Melbourne, Australia",
    avatar: "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Carlos Fernandez",
    loc: "Madrid, Spain",
    avatar: "https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Jessica Taylor",
    loc: "Toronto, Canada",
    avatar: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Guillaume Blanc",
    loc: "Lyon, France",
    avatar: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Karthik Subramanian",
    loc: "Tiruchirappalli, India",
    avatar: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Deepa Menon",
    loc: "Thrissur, India",
    avatar: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Maya Sen",
    loc: "Siliguri, India",
    avatar: "https://images.unsplash.com/photo-1581092334651-ddf26d9a09d0?auto=format&fit=crop&w=400&q=80",
  },
];

/**
 * Stable simple hash function to deterministically select a persona from the pool
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Helper to retrieve curated reviews for a given service ID.
 * Generates dynamic yet consistent realistic reviews for any catalog item if not explicitly in the static list.
 */
export function getCuratedReviewsForService(service: {
  id: string;
  title: string;
  category?: string | null;
  destination?: string | null;
  city?: string | null;
  rating?: number | null;
  review_count?: number | null;
}): CuratedReview[] {
  // 1. Check direct matches
  const directMatches = CURATED_REVIEWS.filter((r) => r.service_id === service.id);
  if (directMatches.length > 0) {
    return directMatches;
  }

  // 2. If no direct match, generate 3-4 realistic contextual reviews based on service category and city
  const city = service.city || service.destination || "India";
  const title = service.title || "Experience";
  const cat = (service.category || "service").toLowerCase();
  const baseRating = service.rating && service.rating > 0 ? Number(service.rating) : 4.8;

  let sampleComments: { title: string; text: string; rating: number; daysAgo: number; response?: string }[] = [];

  if (cat === "hotel" || cat === "resort" || cat === "homestay" || cat === "heritage") {
    sampleComments = [
      {
        title: `Wonderful hospitality and prime location in ${city}`,
        text: `We thoroughly enjoyed our stay at ${title}. The rooms were spotless, beds very comfortable, and the morning breakfast buffet had a wonderful mix of local specialties and continental fare. Highly recommended!`,
        rating: 5,
        daysAgo: 5,
        response: `Thank you for choosing ${title}! We are delighted that you enjoyed your stay and our breakfast offerings. Looking forward to hosting you again.`,
      },
      {
        title: "Peaceful atmosphere, attentive staff",
        text: `A delightful experience in ${city}. The check-in was seamless, the amenities were well-maintained, and the team went above and beyond to make our trip special.`,
        rating: 5,
        daysAgo: 14,
      },
      {
        title: "Great value and scenic views",
        text: `The property is situated in a great spot with easy access to top sightseeing landmarks in ${city}. Clean bathrooms and reliable Wi-Fi throughout our stay.`,
        rating: Math.max(4, Math.min(5, Math.round(baseRating))),
        daysAgo: 29,
      },
    ];
  } else if (cat === "restaurant" || cat === "dining" || cat === "culinary") {
    sampleComments = [
      {
        title: `Authentic regional flavors of ${city}`,
        text: `A feast for the senses at ${title}! The flavors were vibrant, spices balanced to perfection, and the presentation on point. Do not miss their signature specialties.`,
        rating: 5,
        daysAgo: 4,
        response: `Thank you for the warm feedback! Our team puts immense love into preserving genuine regional culinary traditions. See you again!`,
      },
      {
        title: "Exceptional dining and warm ambience",
        text: `From the warm welcome to the last bite of dessert, everything was top-notch. Fast service even on busy evenings and spotless hygiene standards.`,
        rating: 5,
        daysAgo: 18,
      },
      {
        title: "Hearty portions, great value",
        text: `Authentic recipes prepared fresh. The staff guided us through the menu recommendations expertly. One of the best meals we had during our journey in ${city}.`,
        rating: 4,
        daysAgo: 35,
      },
    ];
  } else {
    // Tour / Adventure / Experience
    sampleComments = [
      {
        title: `A highlight of our trip to ${city}!`,
        text: `${title} was superbly organized from start to finish. Our guide was knowledgeable, engaging, and shared deep local stories that you won't find in any guidebook.`,
        rating: 5,
        daysAgo: 7,
        response: `Thank you for exploring with us! We take pride in curating authentic, immersive journeys and are thrilled you had such a memorable time.`,
      },
      {
        title: "Thrilling and well managed",
        text: `Everything went smoothly according to schedule. Safety gear and briefing were thorough, and the scenery throughout was breathtaking. Great photo opportunities!`,
        rating: 5,
        daysAgo: 21,
      },
      {
        title: "Memorable local experience",
        text: `Genuinely authentic and immersive. Learned so much about local culture in ${city}. Suitable for couples, families, and solo travellers alike.`,
        rating: 4,
        daysAgo: 42,
      },
    ];
  }

  const baseHash = hashString(service.id || "travezy");

  return sampleComments.map((sc, index) => {
    // Deterministically pick a unique persona per review of this service
    const personaIndex = (baseHash + index * 5) % REVIEWER_PERSONA_POOL.length;
    const person = REVIEWER_PERSONA_POOL[personaIndex]!;

    const now = new Date();
    const reviewDate = new Date(now.getTime() - sc.daysAgo * 24 * 60 * 60 * 1000);

    return {
      id: `gen-rev-${service.id.slice(0, 8)}-${index + 1}`,
      service_id: service.id,
      rating: sc.rating,
      title: sc.title,
      comment: sc.text,
      reviewer_name: person.name,
      reviewer_avatar: person.avatar,
      reviewer_location: person.loc,
      travel_date: "August 2026",
      created_at: reviewDate.toISOString(),
      provider_response: sc.response || null,
      provider_responded_at: sc.response
        ? new Date(reviewDate.getTime() + 18 * 60 * 60 * 1000).toISOString()
        : null,
      verified_stay: true,
    };
  });
}
