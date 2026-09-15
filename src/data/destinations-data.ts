export interface DestinationData {
  slug: string;
  name: string;
  state: string;
  country: string;
  region: "South India" | "North India" | "West India" | "East India" | "Central India" | "North East" | "Islands & UTs" | "International";
  tagline: string;
  description: string;
  cover_image: string;
  banner_images?: string[];
  popular_cities: string[];
  best_time_to_visit: string;
  climate: string;
  ideal_duration: string;
  popular_attractions: string[];
  culture_and_cuisine: string;
  latitude: number;
  longitude: number;
  featured?: boolean;
}

export const DESTINATIONS_DATA: DestinationData[] = [
  // ─── SOUTH INDIA ─────────────────────────────────────────────────────────────
  {
    slug: "kerala",
    name: "Kerala",
    state: "Kerala",
    country: "India",
    region: "South India",
    tagline: "God's Own Country — Serene Backwaters, Misty Tea Hills & Ayurvedic Bliss",
    description:
      "A coastal wonderland renowned for its palm-fringed backwaters, emerald tea estates in Munnar, heritage ports in Kochi, and centuries-old Ayurvedic traditions. Kerala seamlessly blends cultural vibrancy with tranquil natural escapes.",
    cover_image: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1600&q=80",
    banner_images: [
      "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1593693397690-362cb9666fc2?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80",
    ],
    popular_cities: ["Kochi", "Munnar", "Alleppey", "Kumarakom", "Thiruvananthapuram", "Kozhikode", "Wayanad", "Varkala"],
    best_time_to_visit: "September to March",
    climate: "Tropical coastal, pleasant winter mornings with cool hill station breezes",
    ideal_duration: "5 to 8 Days",
    popular_attractions: [
      "Alleppey Backwater Houseboat Cruises",
      "Munnar & Meesapulimala Tea Plantations",
      "Fort Kochi Chinese Fishing Nets & Mattancherry",
      "Kumarakom Bird Sanctuary & Vembanad Lake",
      "Athirappilly & Vazhachal Waterfalls",
      "Periyar National Park & Wildlife Sanctuary",
    ],
    culture_and_cuisine:
      "Famous for Kathakali dance dramas, Kalaripayattu martial arts, and aromatic Malabar Biryani, Karimeen Pollichathu, Appam with stew, and traditional banana-leaf Sadya feasts.",
    latitude: 9.9312,
    longitude: 76.2673,
    featured: true,
  },
  {
    slug: "rajasthan",
    name: "Rajasthan",
    state: "Rajasthan",
    country: "India",
    region: "North India",
    tagline: "Land of Kings — Majestic Forts, Regal Palaces & Golden Sand Dunes",
    description:
      "The jewel of royal India. From the pink sandstone palaces of Jaipur to the blue maze of Jodhpur and the romantic lakes of Udaipur, Rajasthan invites travellers into a grand tapestry of chivalry, vibrant folklore, and desert elegance.",
    cover_image: "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1600&q=80",
    banner_images: [
      "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=1200&q=80",
    ],
    popular_cities: ["Jaipur", "Udaipur", "Jodhpur", "Jaisalmer", "Pushkar", "Bikaner", "Mount Abu"],
    best_time_to_visit: "October to March",
    climate: "Dry desert climate with sunny pleasant winter days and cool nights",
    ideal_duration: "6 to 9 Days",
    popular_attractions: [
      "Amber Fort & Hawa Mahal in Jaipur",
      "Lake Pichola & City Palace in Udaipur",
      "Mehrangarh Fort & Blue City in Jodhpur",
      "Sam Sand Dunes & Desert Camping in Jaisalmer",
      "Pushkar Brahma Temple & Holy Ghats",
      "Ranthambore Tiger Reserve Safari",
    ],
    culture_and_cuisine:
      "Ghoomar folk dances, puppet storytelling, miniature royal paintings, and rich delicacies such as Dal Baati Churma, Laal Maas, Ker Sangri, and Mawa Kachori.",
    latitude: 26.9124,
    longitude: 75.7873,
    featured: true,
  },
  {
    slug: "goa",
    name: "Goa",
    state: "Goa",
    country: "India",
    region: "West India",
    tagline: "Sun, Sand & Portuguese Heritage — Coastal Paradise on the Arabian Sea",
    description:
      "A sun-soaked coastal paradise blending golden Arabian Sea beaches, UNESCO Portuguese colonial architecture, vibrant spice plantations, river cruises, and a world-renowned culinary and nightlife scene.",
    cover_image: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1600&q=80",
    popular_cities: ["Panaji", "Calangute", "Anjuna", "Margao", "Palolem", "Old Goa", "Candolim"],
    best_time_to_visit: "November to March",
    climate: "Tropical coastal with warm sunny beach days and cool sea breezes",
    ideal_duration: "4 to 6 Days",
    popular_attractions: [
      "Basilica of Bom Jesus & Old Goa Churches",
      "Dudhsagar Waterfalls Trek & Jeep Safari",
      "Anjuna, Palolem & Calangute Beach Trails",
      "Mandovi River Sunset Cruises",
      "Fort Aguada & Chapora Fort Panoramic Points",
      "Sahakari Spice Farm Guided Walks",
    ],
    culture_and_cuisine:
      "Konkani and Portuguese fusion, Fado music, carnival festivities, and authentic Goan Fish Curry, Prawn Balchão, Pork Vindaloo, and Bebinca layer cake.",
    latitude: 15.2993,
    longitude: 74.124,
    featured: true,
  },
  {
    slug: "karnataka",
    name: "Karnataka",
    state: "Karnataka",
    country: "India",
    region: "South India",
    tagline: "One State, Many Worlds — Ancient Hampi Ruins, Misty Coorg & Silicon Hub",
    description:
      "A diverse southern state showcasing the Vijayanagara ruins of Hampi, fragrant coffee plantations of Coorg and Chikmagalur, royal palaces of Mysuru, and the vibrant modern culture of Bengaluru.",
    cover_image: "https://images.unsplash.com/photo-1600100397608-f010f443b749?auto=format&fit=crop&w=1600&q=80",
    popular_cities: ["Bengaluru", "Mysuru", "Coorg", "Hampi", "Gokarna", "Chikmagalur", "Mangalore"],
    best_time_to_visit: "October to March",
    climate: "Pleasant year-round in hill districts and Bengaluru with cool winter nights",
    ideal_duration: "5 to 7 Days",
    popular_attractions: [
      "Hampi UNESCO World Heritage Stone Chariot & Temples",
      "Mysuru Palace Royal Illumination",
      "Coorg Coffee Plantations & Abbey Falls",
      "Gokarna Om Beach & Mahabaleshwar Temple",
      "Bandipur & Nagarhole Tiger Reserves",
      "Jog Falls & Western Ghats Trails",
    ],
    culture_and_cuisine:
      "Yakshagana theater, Mysore silk, and culinary staples like Bisi Bele Bath, Mysore Pak, Neer Dosa with Mangalorean Ghee Roast, and authentic Filter Coffee.",
    latitude: 12.9716,
    longitude: 77.5946,
    featured: true,
  },
  {
    slug: "tamil-nadu",
    name: "Tamil Nadu",
    state: "Tamil Nadu",
    country: "India",
    region: "South India",
    tagline: "Enchanting Heritage — Towering Dravidian Gopurams & Nilgiri Hills",
    description:
      "Home to millennia-old living Dravidian temples, the misty Nilgiri tea hills of Ooty, seaside rock monuments of Mahabalipuram, and sacred coastal pilgrimage sites at Rameswaram and Kanyakumari.",
    cover_image: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1600&q=80",
    popular_cities: ["Chennai", "Madurai", "Ooty", "Kanyakumari", "Mahabalipuram", "Rameswaram", "Coimbatore"],
    best_time_to_visit: "November to March",
    climate: "Tropical plains with cool hill retreat climates in Nilgiris and Kodaikanal",
    ideal_duration: "5 to 8 Days",
    popular_attractions: [
      "Madurai Meenakshi Amman Temple",
      "Mahabalipuram Shore Temple & Pancha Rathas",
      "Nilgiri Mountain Railway Toy Train in Ooty",
      "Rameswaram Pamban Bridge & Ramanathaswamy Temple",
      "Kanyakumari Vivekananda Rock Memorial & Triveni Sangam",
      "Chettinad Heritage Mansions",
    ],
    culture_and_cuisine:
      "Bharatanatyam classical dance, Carnatic music traditions, and spicy Chettinad Chicken, crispy Masala Dosas, Idiyappam, Filter Kaapi, and Jigarthanda.",
    latitude: 13.0827,
    longitude: 80.2707,
    featured: true,
  },
  {
    slug: "himachal-pradesh",
    name: "Himachal Pradesh",
    state: "Himachal Pradesh",
    country: "India",
    region: "North India",
    tagline: "Valley of the Gods — Snow-Capped Peaks, Pine Forests & Alpine Trails",
    description:
      "A breathtaking Himalayan wonderland offering snow adventures in Manali, colonial charm in Shimla, Tibetan spirituality in Dharamshala, and high-altitude moonscapes in Spiti Valley.",
    cover_image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80",
    popular_cities: ["Manali", "Shimla", "Dharamshala", "Spiti Valley", "Kasol", "Dalhousie", "Kullu"],
    best_time_to_visit: "March to June (Summer) & October to February (Snow)",
    climate: "Crisp alpine mountain air, sub-zero snowy winters and refreshing summers",
    ideal_duration: "5 to 8 Days",
    popular_attractions: [
      "Solang Valley & Rohtang Pass Snow Adventures",
      "Dharamshala Dalai Lama Temple & McLeodGanj",
      "Shimla Mall Road & Jakhu Temple",
      "Spiti Valley Key Monastery & Chandratal Lake",
      "Kasol Parvati River & Kheerganga Trek",
      "Great Himalayan National Park",
    ],
    culture_and_cuisine:
      "Nati folk dance, Tibetan prayer wheels, Kullu shawls, and Himachali Dham, Siddu with ghee, Madra, Trout Fish, and steaming Thukpa.",
    latitude: 31.1048,
    longitude: 77.1734,
    featured: true,
  },
  {
    slug: "maharashtra",
    name: "Maharashtra",
    state: "Maharashtra",
    country: "India",
    region: "West India",
    tagline: "Gateway of India — Ancient Cave Marvels, Sahyadri Forts & Arabian Coast",
    description:
      "Dynamic and historic, Maharashtra brings together the bustling energy of Mumbai, UNESCO Ajanta & Ellora rock-cut cave temples, Sahyadri mountain retreats like Lonavala, and ancient Maratha hill forts.",
    cover_image: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=1600&q=80",
    popular_cities: ["Mumbai", "Pune", "Lonavala", "Mahabaleshwar", "Alibaug", "Aurangabad", "Nashik"],
    best_time_to_visit: "October to March",
    climate: "Pleasant winters with cool Sahyadri mountain escapes and coastal warmth",
    ideal_duration: "4 to 7 Days",
    popular_attractions: [
      "Gateway of India & Marine Drive in Mumbai",
      "Ajanta & Ellora Caves UNESCO Masterpieces",
      "Lonavala Tiger Point & Karla Caves",
      "Mahabaleshwar Strawberry Valleys & Arthur's Seat",
      "Nashik Vineyard Wine Trails",
      "Shivaji Heritage Forts at Raigad and Sinhagad",
    ],
    culture_and_cuisine:
      "Lavani folk dance, Ganesh Chaturthi fervor, and culinary favorites including Mumbai Vada Pav, Pav Bhaji, Misal Pav, Puran Poli, and Kolhapuri Tambda Rassa.",
    latitude: 18.922,
    longitude: 72.8347,
    featured: true,
  },
  {
    slug: "uttar-pradesh",
    name: "Uttar Pradesh",
    state: "Uttar Pradesh",
    country: "India",
    region: "North India",
    tagline: "Spiritual & Architectural Heart — The Taj Mahal & Sacred Ghats of Varanasi",
    description:
      "The spiritual and historical heartland of India. Marvel at the timeless Taj Mahal in Agra, witness evening Ganga Aarti at Varanasi's sacred ghats, and savor Awadhi Nawabi elegance in Lucknow.",
    cover_image: "https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=1600&q=80",
    popular_cities: ["Varanasi", "Agra", "Lucknow", "Mathura", "Vrindavan", "Ayodhya", "Prayagraj"],
    best_time_to_visit: "October to March",
    climate: "Pleasant sunny winters and rich festive autumn atmosphere",
    ideal_duration: "4 to 7 Days",
    popular_attractions: [
      "Taj Mahal & Agra Fort UNESCO World Wonder",
      "Varanasi Dashashwamedh Ghat Evening Ganga Aarti",
      "Bada Imambara & Rumi Darwaza in Lucknow",
      "Sarnath Buddhist Pilgrimage & Dhamek Stupa",
      "Mathura & Vrindavan Krishna Heritage Temples",
      "Ram Janmabhoomi Complex in Ayodhya",
    ],
    culture_and_cuisine:
      "Kathak classical dance, Chikankari embroidery, Banarasi silk, and royal Galouti Kebabs, Lucknawi Biryani, Banarasi Paan, and Bedmi Puri.",
    latitude: 27.1751,
    longitude: 78.0421,
    featured: true,
  },
  {
    slug: "uttarakhand",
    name: "Uttarakhand",
    state: "Uttarakhand",
    country: "India",
    region: "North India",
    tagline: "Devbhoomi — Yoga Capital Rishikesh, Holy Rivers & Himalayan Glaciers",
    description:
      "The divine mountain sanctuary where holy rivers originate. Practice world-class yoga in Rishikesh, explore sparkling lakes in Nainital, go river rafting in Shivpuri, and spot tigers in Jim Corbett.",
    cover_image: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1600&q=80",
    popular_cities: ["Rishikesh", "Nainital", "Mussoorie", "Dehradun", "Haridwar", "Jim Corbett", "Auli"],
    best_time_to_visit: "March to June & September to November",
    climate: "Invigorating mountain air, snowy winter slopes at Auli and cool valleys",
    ideal_duration: "5 to 7 Days",
    popular_attractions: [
      "Rishikesh Laxman Jhula & River Rafting Rapids",
      "Jim Corbett National Park Jeep Safaris",
      "Nainital Naini Lake Boating & Naina Peak",
      "Mussoorie Kempty Falls & Mall Road",
      "Haridwar Har Ki Pauri Ganga Aarti",
      "Auli Skiing Slopes & Himalayan Cable Car",
    ],
    culture_and_cuisine:
      "Garhwali & Kumaoni folk traditions, Ayurvedic healing, and regional dishes like Kafuli, Chainsoo, Bhatt ki Churkani, Bal Mithai, and Singori.",
    latitude: 30.0869,
    longitude: 78.2676,
    featured: true,
  },
  {
    slug: "jammu-and-kashmir",
    name: "Jammu & Kashmir",
    state: "Jammu & Kashmir",
    country: "India",
    region: "North India",
    tagline: "Paradise on Earth — Dal Lake Shikaras, Pine Valleys & Snow Peaks",
    description:
      "An earthly paradise graced by traditional wooden houseboats on Dal Lake, sprawling Mughal gardens in Srinagar, Gondola rides in Gulmarg, and the betaab valleys of Pahalgam.",
    cover_image: "https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&w=1600&q=80",
    popular_cities: ["Srinagar", "Gulmarg", "Pahalgam", "Sonamarg", "Jammu", "Patnitop"],
    best_time_to_visit: "April to October (Spring/Autumn) & Dec to Feb (Skiing)",
    climate: "Mild alpine summers with blooming tulip gardens and snow-covered winters",
    ideal_duration: "6 to 8 Days",
    popular_attractions: [
      "Dal Lake Shikara Rides & Floating Markets",
      "Gulmarg Apharwat Peak Gondola & Ski Slopes",
      "Pahalgam Betaab Valley & Aru Valley",
      "Shalimar Bagh & Nishat Mughal Gardens",
      "Sonamarg Thajiwas Glacier Pony Trek",
      "Vaishno Devi Sacred Shrine",
    ],
    culture_and_cuisine:
      "Pashmina weaving, Walnut woodwork, and royal Wazwan banquets (Rogan Josh, Gushtaba, Yakhni), Kashmiri Kahwa tea with saffron, and warm Girda bread.",
    latitude: 34.0837,
    longitude: 74.7973,
    featured: true,
  },
  {
    slug: "ladakh",
    name: "Ladakh",
    state: "Ladakh",
    country: "India",
    region: "North India",
    tagline: "Land of High Passes — Azure High-Altitude Lakes & Starlit Monasteries",
    description:
      "A rugged high-altitude desert surrounded by towering Himalayan peaks, dramatic Tibetan Buddhist gompas, the azure waters of Pangong Tso, and the sand dunes of Nubra Valley.",
    cover_image: "https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?auto=format&fit=crop&w=1600&q=80",
    popular_cities: ["Leh", "Nubra Valley", "Pangong Tso", "Kargil", "Zanskar Valley", "Tso Moriri"],
    best_time_to_visit: "May to September",
    climate: "Crisp, sunny mountain skies with cool evenings and pure thin mountain air",
    ideal_duration: "6 to 9 Days",
    popular_attractions: [
      "Pangong Tso High-Altitude Salt Lake",
      "Nubra Valley Hunder Double-Humped Camel Rides",
      "Khardung La Pass — World's Highest Motorable Roads",
      "Thiksey & Hemis Ancient Monasteries",
      "Magnetic Hill & Indus-Zanskar River Confluence",
      "Shanti Stupa Panoramic Sunset Point",
    ],
    culture_and_cuisine:
      "Masked Cham monastery dances, Ladakhi butter tea (Gur Gur Chai), steamed Momos, Skyu soup, Thukpa, and Chhurpi yak cheese.",
    latitude: 34.1526,
    longitude: 77.5771,
    featured: true,
  },
  {
    slug: "west-bengal",
    name: "West Bengal",
    state: "West Bengal",
    country: "India",
    region: "East India",
    tagline: "Cultural & Literary Soul — Darjeeling Toy Train & Sundarbans Mangroves",
    description:
      "From the colonial grandeur and intellectual coffee houses of Kolkata to the Himalayan tea hills of Darjeeling and the mangrove tiger reserves of the Sundarbans.",
    cover_image: "https://images.unsplash.com/photo-1558431382-27e303142255?auto=format&fit=crop&w=1600&q=80",
    popular_cities: ["Kolkata", "Darjeeling", "Kalimpong", "Sundarbans", "Digha", "Siliguri", "Shantiniketan"],
    best_time_to_visit: "October to March",
    climate: "Pleasant temperate winter with cool mountain tea breezes in Darjeeling",
    ideal_duration: "5 to 7 Days",
    popular_attractions: [
      "Victoria Memorial & Howrah Bridge in Kolkata",
      "Darjeeling Himalayan Railway & Tiger Hill Sunrise",
      "Sundarbans UNESCO Mangrove Tiger Cruise",
      "Dakshineswar & Belur Math Spiritual Centers",
      "Shantiniketan Tagore Cultural Heritage",
      "Happy Valley Organic Tea Estate Walk",
    ],
    culture_and_cuisine:
      "Rabindra Sangeet, Durga Puja festivities, Dokra art, and Kosha Mangsho, Shorshe Ilish (Mustard Hilsa), Kolkata Biryani, Sandesh, and spongy Rosogolla.",
    latitude: 22.5726,
    longitude: 88.3639,
    featured: true,
  },
  {
    slug: "gujarat",
    name: "Gujarat",
    state: "Gujarat",
    country: "India",
    region: "West India",
    tagline: "Vibrant Heritage — White Desert of Kutch & Asiatic Lions of Gir",
    description:
      "A colourful, industrious state renowned for the shimmering salt flats of the Rann of Kutch, the last sanctuary of Asiatic Lions at Gir, the colossal Statue of Unity, and sacred coastal temples.",
    cover_image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=1600&q=80",
    popular_cities: ["Ahmedabad", "Rann of Kutch", "Gir National Park", "Dwarka", "Somnath", "Vadodara", "Surat"],
    best_time_to_visit: "November to February",
    climate: "Warm sunny days with crisp winter desert nights at Rann of Kutch",
    ideal_duration: "5 to 8 Days",
    popular_attractions: [
      "Great Rann of Kutch White Desert & Rann Utsav",
      "Gir National Park Asiatic Lion Safari",
      "Statue of Unity at Kevadia",
      "Sabarmati Ashram & Old Ahmedabad UNESCO Walled City",
      "Dwarkadhish Temple & Somnath Jyotirlinga",
      "Sun Temple at Modhera & Rani ki Vav Stepwell",
    ],
    culture_and_cuisine:
      "Garba and Dandiya folk dance, Bandhani textiles, Patola weaving, and sumptuous Gujarati Thali, Khaman Dhokla, Handvo, Thepla, and Fafda Jalebi.",
    latitude: 23.0225,
    longitude: 72.5714,
    featured: false,
  },
  {
    slug: "delhi",
    name: "Delhi",
    state: "Delhi",
    country: "India",
    region: "North India",
    tagline: "Historic Capital — Mughal Citadels, Grand Boulevards & Street Food",
    description:
      "India's vibrant capital seamlessly unites centuries of history. Explore the imposing Red Fort and Qutub Minar, stroll along Rajpath, and immerse yourself in the culinary wonders of Chandni Chowk.",
    cover_image: "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=1600&q=80",
    popular_cities: ["New Delhi", "Old Delhi", "Mehrauli", "Hauz Khas", "Connaught Place", "Chandni Chowk"],
    best_time_to_visit: "October to March",
    climate: "Sunny crisp winter days with vibrant cultural and food festivals",
    ideal_duration: "3 to 5 Days",
    popular_attractions: [
      "Qutub Minar & Humayun's Tomb UNESCO Monuments",
      "Red Fort & Jama Masjid Historic Architecture",
      "India Gate & Rashtrapati Bhavan Grand Boulevards",
      "Chandni Chowk Food & Spice Market Walk",
      "Akshardham Temple & Lotus Temple",
      "Lodhi Gardens Heritage & Art District",
    ],
    culture_and_cuisine:
      "Sufi music at Nizamuddin Dargah, Dilli Haat artisan bazaar, and legendary Butter Chicken, Chole Bhature, Parathas of Gali Paranthe Wali, and Chaat.",
    latitude: 28.6139,
    longitude: 77.209,
    featured: false,
  },
  {
    slug: "punjab",
    name: "Punjab",
    state: "Punjab",
    country: "India",
    region: "North India",
    tagline: "The Golden Heart — Radiant Golden Temple & Hearty Hospitality",
    description:
      "A land of generous hospitality, rolling mustard fields, and rich Sikh heritage. Experience the serenity of the Golden Temple in Amritsar and witness the spirited Wagah Border ceremony.",
    cover_image: "https://images.unsplash.com/photo-1588096344356-9b5700810777?auto=format&fit=crop&w=1600&q=80",
    popular_cities: ["Amritsar", "Chandigarh", "Ludhiana", "Patiala", "Jalandhar", "Bathinda"],
    best_time_to_visit: "October to March",
    climate: "Invigorating sunny winter season ideal for rural tours and monument visits",
    ideal_duration: "3 to 5 Days",
    popular_attractions: [
      "Golden Temple (Sri Harmandir Sahib) & Langar Hall",
      "Wagah Border Beating Retreat Ceremony",
      "Jallianwala Bagh Historic Memorial",
      "Chandigarh Rock Garden & Sukhna Lake",
      "Qila Mubarak & Sheesh Mahal in Patiala",
      "Rural Punjab Mustard Field Farm Stays",
    ],
    culture_and_cuisine:
      "Bhangra and Giddha energetic folk dances, Phulkari needlework, and Sarson da Saag with Makki di Roti, Amritsari Kulcha, Butter Chicken, and creamy Lassi.",
    latitude: 31.634,
    longitude: 74.8723,
    featured: false,
  },
  {
    slug: "madhya-pradesh",
    name: "Madhya Pradesh",
    state: "Madhya Pradesh",
    country: "India",
    region: "Central India",
    tagline: "Heart of Incredible India — Khajuraho Sculptures & Tiger Habitats",
    description:
      "The wild and architectural heart of India. Home to world-class tiger sanctuaries like Bandhavgarh and Kanha, the sensuous temple carvings of Khajuraho, and the ancient Buddhist stupas of Sanchi.",
    cover_image: "https://images.unsplash.com/photo-1600100397608-f010f443b749?auto=format&fit=crop&w=1600&q=80",
    popular_cities: ["Khajuraho", "Bhopal", "Indore", "Bandhavgarh", "Kanha", "Ujjain", "Gwalior"],
    best_time_to_visit: "October to March",
    climate: "Mild pleasant winters perfect for tiger safaris and monument walks",
    ideal_duration: "5 to 8 Days",
    popular_attractions: [
      "Khajuraho Group of Temples UNESCO Site",
      "Bandhavgarh & Kanha Tiger Reserve Safaris",
      "Sanchi Buddhist Great Stupa",
      "Gwalior Fort & Jai Vilas Palace",
      "Bhedaghat Marble Rocks & Dhuandhar Falls",
      "Ujjain Mahakaleshwar Jyotirlinga",
    ],
    culture_and_cuisine:
      "Gond tribal paintings, Chanderi and Maheshwari silk, and delicious Indori Poha Jalebi, Bhutte Ka Kees, Dal Bafla, and Rogan Josh.",
    latitude: 23.2599,
    longitude: 77.4126,
    featured: false,
  },
  {
    slug: "odisha",
    name: "Odisha",
    state: "Odisha",
    country: "India",
    region: "East India",
    tagline: "Soul of Incredible India — Konark Sun Temple & Pristine Chilika Lake",
    description:
      "A coastal gem where ancient Kalinga architecture meets tranquil lagoon ecosystems. Marvel at the stone chariot wheels of Konark Sun Temple, spot Irrawaddy dolphins in Chilika Lake, and visit sacred Puri.",
    cover_image: "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=1600&q=80",
    popular_cities: ["Bhubaneswar", "Puri", "Konark", "Chilika Lake", "Cuttack", "Gopalpur", "Rourkela"],
    best_time_to_visit: "October to March",
    climate: "Temperate tropical breezes along the Bay of Bengal coastline",
    ideal_duration: "4 to 6 Days",
    popular_attractions: [
      "Konark Sun Temple UNESCO Architectural Marvel",
      "Puri Jagannath Temple & Golden Beach",
      "Chilika Lake Irrawaddy Dolphin Sanctuary",
      "Udayagiri & Khandagiri Ancient Rock Caves",
      "Raghurajpur Heritage Pattachitra Craft Village",
      "Bhubaneswar Mukteshvara & Lingaraj Temples",
    ],
    culture_and_cuisine:
      "Odissi classical dance, Silver filigree (Tarakasi), and iconic culinary treasures like Chhena Poda, Rasagola, Dalma, Pakhala Bhata, and fresh coastal Crab Curry.",
    latitude: 20.2961,
    longitude: 85.8245,
    featured: false,
  },
  {
    slug: "andhra-pradesh",
    name: "Andhra Pradesh",
    state: "Andhra Pradesh",
    country: "India",
    region: "South India",
    tagline: "The Sunrise State — Araku Valley Hills & Pristine Bay of Bengal Coast",
    description:
      "From the misty coffee plantations and million-year-old Borra Caves of Araku Valley to the sacred Tirumala Venkateswara Temple and the bustling coastal promenade of Visakhapatnam.",
    cover_image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=80",
    popular_cities: ["Visakhapatnam", "Tirupati", "Vijayawada", "Araku Valley", "Rajahmundry", "Guntur", "Kurnool"],
    best_time_to_visit: "October to March",
    climate: "Tropical coastal with cool hill breezes in the Eastern Ghats",
    ideal_duration: "4 to 7 Days",
    popular_attractions: [
      "Araku Valley & Borra Caves Vistadome Rail Tour",
      "Tirupati Balaji Sacred Hilltop Temple",
      "Visakhapatnam RK Beach & Submarine Museum",
      "Undavalli Rock-Cut Caves & Krishna River Cruise",
      "Papikondalu Godavari River Boat Safari",
      "Lepakshi Hanging Pillar & Nandi Sculpture",
    ],
    culture_and_cuisine:
      "Kuchipudi classical dance, Kalamkari textiles, and fiery Andhra meals with Gongura Mamsam, Royyala Vepudu (Prawn Fry), Ulava Charu, and Pootharekulu sweet.",
    latitude: 17.6868,
    longitude: 83.2185,
    featured: false,
  },
  {
    slug: "telangana",
    name: "Telangana",
    state: "Telangana",
    country: "India",
    region: "South India",
    tagline: "Heritage & Tech Harmony — Historic Golconda Fort & Hyderabadi Biryani",
    description:
      "An enchanting blend of Nizami grandeur and cutting-edge tech metropolis. Explore Charminar, the acoustic marvels of Golconda Fort, and UNESCO Ramappa Temple.",
    cover_image: "https://images.unsplash.com/photo-1572455857811-045fb4255b5d?auto=format&fit=crop&w=1600&q=80",
    popular_cities: ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Khammam", "Nagarjuna Sagar"],
    best_time_to_visit: "October to March",
    climate: "Pleasant winter days with cool evenings and low humidity",
    ideal_duration: "3 to 5 Days",
    popular_attractions: [
      "Charminar & Laad Bazaar Pearl Market",
      "Golconda Fort Sound & Light Show",
      "Chowmahalla Palace & Taj Falaknuma Grandeur",
      "Ramappa Kakatiya Temple UNESCO Site",
      "Warangal Thousand Pillar Temple",
      "Hussain Sagar Lake & Buddha Statue",
    ],
    culture_and_cuisine:
      "Perini Shivatandavam dance, Bidriware metalwork, Pochampally Ikat silk, and world-famous Hyderabadi Dum Biryani, Haleem, Mirchi Ka Salan, and Double Ka Meetha.",
    latitude: 17.385,
    longitude: 78.4867,
    featured: false,
  },
  {
    slug: "assam",
    name: "Assam",
    state: "Assam",
    country: "India",
    region: "North East",
    tagline: "Wild & Serene — One-Horned Rhinos of Kaziranga & Brahmaputra Trails",
    description:
      "The gateway to Northeast India, blessed with the mighty Brahmaputra river, sprawling rolling green tea gardens, the sacred Kamakhya temple, and the world's highest density of One-Horned Rhinos at Kaziranga.",
    cover_image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80",
    popular_cities: ["Guwahati", "Kaziranga", "Majuli Island", "Jorhat", "Tezpur", "Manas", "Dibrugarh"],
    best_time_to_visit: "November to April",
    climate: "Mild temperate winters with crisp morning mists over tea plantations",
    ideal_duration: "4 to 7 Days",
    popular_attractions: [
      "Kaziranga National Park One-Horned Rhino Safari",
      "Majuli Island — World's Largest River Island",
      "Kamakhya Devi Ancient Shakti Temple in Guwahati",
      "Brahmaputra River Sunset & Island Cruises",
      "Manas Wildlife Sanctuary & Biosphere Reserve",
      "Jorhat Heritage Tea Estate Bungalow Stays",
    ],
    culture_and_cuisine:
      "Bihu folk dance, Muga Golden Silk weaving, Assamese Gamusa, and aromatic Kaji Nemu Fish Tenga, Duck with Ash Gourd, Khar, and Pitha sweets.",
    latitude: 26.1445,
    longitude: 91.7362,
    featured: false,
  },
  {
    slug: "meghalaya",
    name: "Meghalaya",
    state: "Meghalaya",
    country: "India",
    region: "North East",
    tagline: "Abode of Clouds — Living Root Bridges, Crystal Rivers & Waterfalls",
    description:
      "A mystical highland state celebrated for its bio-engineered Living Root Bridges in Cherrapunji, crystal-clear emerald waters of the Umngot River in Dawki, and rolling misty pine hills in Shillong.",
    cover_image: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1600&q=80",
    popular_cities: ["Shillong", "Cherrapunji (Sohra)", "Dawki", "Mawlynnong", "Jowai", "Nongriat"],
    best_time_to_visit: "October to April",
    climate: "Cool mountain air with dramatic clouds, waterfalls and refreshing breezes",
    ideal_duration: "4 to 6 Days",
    popular_attractions: [
      "Nongriat Double Decker Living Root Bridge Trek",
      "Dawki Umngot River Boating over Glass-Clear Waters",
      "Cherrapunji Nohkalikai & Seven Sisters Waterfalls",
      "Mawlynnong — Asia's Cleanest Village",
      "Mawsmai Limestone Cave Exploration",
      "Shillong Peak & Umiam Lake Water Sports",
    ],
    culture_and_cuisine:
      "Khasi and Garo matrilineal heritage, rock music festivals in Shillong, and local culinary specialties including Jadoh (red rice with pork/chicken), Dohneiiong, and Tungrymbai.",
    latitude: 25.5788,
    longitude: 91.8933,
    featured: false,
  },
  {
    slug: "sikkim",
    name: "Sikkim",
    state: "Sikkim",
    country: "India",
    region: "North East",
    tagline: "Himalayan Gem — Kanchenjunga Vistas & Ancient Tibetan Monasteries",
    description:
      "Nestled in the eastern Himalayas, Sikkim offers awe-inspiring vistas of Mt. Kanchenjunga, serene high-altitude Gurudongmar Lake, fluttering prayer flags at Rumtek Monastery, and pristine organic valleys.",
    cover_image: "https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?auto=format&fit=crop&w=1600&q=80",
    popular_cities: ["Gangtok", "Pelling", "Lachung", "Lachen", "Yuksom", "Ravangla", "Namchi"],
    best_time_to_visit: "March to May & October to December",
    climate: "Alpine mountain climate with blooming rhododendrons in spring and crisp sunny winters",
    ideal_duration: "5 to 7 Days",
    popular_attractions: [
      "Tsomgo Lake & Nathula Pass Border Experience",
      "Yumthang Valley of Flowers & Hot Springs",
      "Gurudongmar Sacred High-Altitude Lake",
      "Rumtek & Pemayangtse Tibetan Monasteries",
      "Pelling Skywalk & Kanchenjunga Viewpoints",
      "Ravangla Buddha Park Giant Golden Statue",
    ],
    culture_and_cuisine:
      "Bhutia and Lepcha cultural arts, Thangka paintings, and steaming Thukpa, Momos, Gundruk soup, Phagshapa, and Tongba millet brew.",
    latitude: 27.3389,
    longitude: 88.6065,
    featured: false,
  },
  {
    slug: "andaman-and-nicobar-islands",
    name: "Andaman and Nicobar Islands",
    state: "Andaman and Nicobar Islands",
    country: "India",
    region: "Islands & UTs",
    tagline: "Tropical Island Eden — Radhanagar Beach & Coral Reef Scuba Diving",
    description:
      "A turquoise island archipelago in the Bay of Bengal. World-famous for Radhanagar Beach's powder white sands, bioluminescent night kayaking, coral reef scuba diving, and Cellular Jail history.",
    cover_image: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1600&q=80",
    popular_cities: ["Port Blair", "Havelock Island (Swaraj Dweep)", "Neil Island (Shaheed Dweep)", "Baratang", "Ross Island"],
    best_time_to_visit: "October to May",
    climate: "Tropical island climate with azure waters and gentle tropical sea breeze",
    ideal_duration: "5 to 8 Days",
    popular_attractions: [
      "Radhanagar Beach — Asia's Top Rated Beach",
      "Havelock Elephant Beach Coral Scuba & Snorkeling",
      "Cellular Jail Light & Sound Historic Presentation",
      "Neil Island Natural Bridge & Laxmanpur Sunset",
      "Baratang Mangrove Creek & Limestone Caves",
      "Bioluminescence Night Kayaking in Swaraj Dweep",
    ],
    culture_and_cuisine:
      "Indigenous tribal heritage, sea-craft woodwork, and fresh Andaman Lobster, Tandoori Fish, Coconut Prawn Curry, and island fruit smoothies.",
    latitude: 11.6234,
    longitude: 92.7265,
    featured: true,
  },
  {
    slug: "puducherry",
    name: "Puducherry",
    state: "Puducherry",
    country: "India",
    region: "Islands & UTs",
    tagline: "French Riviera of the East — Pastel Quarters, Promenades & Auroville",
    description:
      "A tranquil coastal union territory adorned with French colonial architecture, yellow pastel villas in White Town, breezy seaside promenades, beachfront cafes, and the universal township of Auroville.",
    cover_image: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1600&q=80",
    popular_cities: ["White Town", "Auroville", "Heritage Town", "Paradise Beach", "Serenity Beach"],
    best_time_to_visit: "October to March",
    climate: "Balmy coastal climate with breezy evenings along Rock Beach Promenade",
    ideal_duration: "3 to 4 Days",
    popular_attractions: [
      "White Town French Quarter Bicycle Heritage Tour",
      "Auroville Matrimandir & International Community",
      "Rock Beach Promenade & French War Memorial",
      "Paradise Beach Ferry Ride & Chunnambar Boat House",
      "Sri Aurobindo Ashram Meditation Center",
      "Serenity Beach Surfing Lessons",
    ],
    culture_and_cuisine:
      "Franco-Tamil culinary fusion, boutique handmade paper, ceramic pottery, and fresh French croissants, Ratatouille, Baguettes, Crêpes, and Chettinad seafood.",
    latitude: 11.9416,
    longitude: 79.8083,
    featured: false,
  },
  {
    slug: "chandigarh",
    name: "Chandigarh",
    state: "Chandigarh",
    country: "India",
    region: "North India",
    tagline: "The City Beautiful — Le Corbusier Architecture & Rock Sculpture Gardens",
    description:
      "India's first planned modernist city, celebrated for its tree-lined boulevards, the whimsical recycled art sculptures of Nek Chand's Rock Garden, serene Sukhna Lake, and Asia's largest Rose Garden.",
    cover_image: "https://images.unsplash.com/photo-1588096344356-9b5700810777?auto=format&fit=crop&w=1600&q=80",
    popular_cities: ["Sector 17", "Sukhna Lake District", "Rose Garden Sector", "Mohali", "Panchkula"],
    best_time_to_visit: "October to March",
    climate: "Sunny crisp winter with pleasant park strolls and lake breezes",
    ideal_duration: "2 to 3 Days",
    popular_attractions: [
      "Nek Chand's Rock Garden Recycled Sculptures",
      "Sukhna Lake Sunset Boating & Walking Track",
      "Zakir Hussain Rose Garden with 50,000 Rose Bushes",
      "Capitol Complex Le Corbusier UNESCO Architecture",
      "Sector 17 Plaza Shopping & Dining Hub",
      "Pinjore Mughal Gardens & Timber Trail Cable Car",
    ],
    culture_and_cuisine:
      "Punjabi urban culture, modern open-air theater, and rich Butter Chicken, Tandoori Platters, Chole Bhature, and creamy Malai Lassi.",
    latitude: 30.7333,
    longitude: 76.7794,
    featured: false,
  },
  {
    slug: "bihar",
    name: "Bihar",
    state: "Bihar",
    country: "India",
    region: "East India",
    tagline: "Land of Enlightenment — Mahabodhi Temple & Nalanda Ancient University",
    description:
      "The historic cradle of Buddhism and Jainism. Walk under the Bodhi Tree at Bodh Gaya where Lord Buddha attained enlightenment, and explore the sprawling ruins of Nalanda University.",
    cover_image: "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=1600&q=80",
    popular_cities: ["Bodh Gaya", "Patna", "Nalanda", "Rajgir", "Vaishali", "Gaya"],
    best_time_to_visit: "October to March",
    climate: "Sunny pleasant winters ideal for Buddhist circuit tours",
    ideal_duration: "3 to 5 Days",
    popular_attractions: [
      "Mahabodhi Temple & Sacred Bodhi Tree UNESCO Site",
      "Ancient Nalanda University Archaeological Ruins",
      "Rajgir Vishwa Shanti Stupa & Ropeway",
      "Patna Museum & Takht Sri Patna Sahib",
      "Vaishali Ashokan Pillar & Buddha Relic Stupa",
      "Barabar Ancient Rock-Cut Caves",
    ],
    culture_and_cuisine:
      "Madhubani folk art painting, Chhath Puja grand festival, and traditional Litti Chokha, Sattu Paratha, Thekua, and Khaja sweets.",
    latitude: 24.6951,
    longitude: 84.9913,
    featured: false,
  },
  {
    slug: "chhattisgarh",
    name: "Chhattisgarh",
    state: "Chhattisgarh",
    country: "India",
    region: "Central India",
    tagline: "Untamed Heartland — Chitrakote Niagara Falls & Tribal Craft Heritage",
    description:
      "An unexplored green treasure featuring the horseshoe-shaped Chitrakote Falls (the Niagara of India), ancient tribal crafts of Bastar, dense Sal forests, and historic temple ruins.",
    cover_image: "https://images.unsplash.com/photo-1600100397608-f010f443b749?auto=format&fit=crop&w=1600&q=80",
    popular_cities: ["Raipur", "Jagdalpur", "Bastar", "Bilaspur", "Sirpur", "Kanker"],
    best_time_to_visit: "October to March",
    climate: "Pleasant temperate winter with misty forest waterfalls",
    ideal_duration: "4 to 6 Days",
    popular_attractions: [
      "Chitrakote Falls — Horse-Shoe Waterfall on Indravati River",
      "Kanger Valley National Park & Kotumsar Stalactite Caves",
      "Bastar Tribal Craft Villages & Haat Markets",
      "Sirpur 7th Century Lakshmana Brick Temple",
      "Tirathgarh Step Waterfalls",
      "Bhoramdeo 11th Century Khajuraho-style Temple",
    ],
    culture_and_cuisine:
      "Dhokra bell-metal casting, Bastar wooden art, and regional Chusela, Fara, Dubki Kadhi, Angakar Roti, and Mahua tea.",
    latitude: 21.2514,
    longitude: 81.6296,
    featured: false,
  },
  {
    slug: "jharkhand",
    name: "Jharkhand",
    state: "Jharkhand",
    country: "India",
    region: "East India",
    tagline: "Land of Forests — Cascading Waterfalls, Betla Tigers & Tribal Lore",
    description:
      "A scenic state of rolling plateau forests, gushing waterfalls around Ranchi, tiger habitats in Betla National Park, and sacred pilgrimage points at Parasnath and Deoghar.",
    cover_image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80",
    popular_cities: ["Ranchi", "Jamshedpur", "Dhanbad", "Deoghar", "Hazaribagh", "Netarhat"],
    best_time_to_visit: "October to March",
    climate: "Cool plateau winter breezes with sunny pleasant sightseeing weather",
    ideal_duration: "3 to 5 Days",
    popular_attractions: [
      "Hundru, Jonha & Dassam Waterfalls around Ranchi",
      "Betla National Park Elephant & Tiger Trails",
      "Netarhat Sunset Point & Magnolia View",
      "Baidyanath Dham Jyotirlinga in Deoghar",
      "Parasnath Shikharji Jain Pilgrimage",
      "Jubilee Park & Dalma Wildlife Sanctuary in Jamshedpur",
    ],
    culture_and_cuisine:
      "Sohrai and Khovar tribal mural paintings, Sarhul nature festival, and Dhuska with Ghugni, Chilka Roti, Rugra mushroom curry, and Arsa Pitha.",
    latitude: 23.3441,
    longitude: 85.3096,
    featured: false,
  },
  {
    slug: "arunachal-pradesh",
    name: "Arunachal Pradesh",
    state: "Arunachal Pradesh",
    country: "India",
    region: "North East",
    tagline: "Land of the Dawn-Lit Mountains — Tawang Monastery & Sela Snow Pass",
    description:
      "India's easternmost frontier where the sun first rises over snow-capped Himalayan peaks. Discover the 400-year-old Tawang Monastery, frozen Sela Pass lake, and pristine Ziro Valley.",
    cover_image: "https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?auto=format&fit=crop&w=1600&q=80",
    popular_cities: ["Tawang", "Ziro Valley", "Itanagar", "Bomdila", "Dirang", "Pasighat"],
    best_time_to_visit: "October to April",
    climate: "Crisp mountain air, winter snowfall at high passes and mild alpine summers",
    ideal_duration: "6 to 8 Days",
    popular_attractions: [
      "Tawang Monastery — India's Largest Tibetan Monastery",
      "Sela Pass & Sela Lake at 13,700 ft Altitude",
      "Ziro Valley Apatani Pine Trails & Music Festival Grounds",
      "Madhuri (Sangetsar) Lake & PTSO Lake",
      "Namdapha Tiger Reserve & Rainforest",
      "Dirang Dzong & Hot Springs",
    ],
    culture_and_cuisine:
      "Monpa and Apatani tribal traditions, handwoven carpets, and Bamboo Shoot fry, Pika Pila pickle, Lukter smoked beef/pork, and butter tea.",
    latitude: 27.5861,
    longitude: 91.8653,
    featured: false,
  },
  {
    slug: "manipur",
    name: "Manipur",
    state: "Manipur",
    country: "India",
    region: "North East",
    tagline: "Jeweled Land — Floating Phumdis of Loktak Lake & Sangai Deer",
    description:
      "A scenic valley surrounded by nine hill ranges. Famed for Loktak Lake — the world's only floating national park with endangered Sangai brow-antlered deer — and the women-run Ima Keithel market.",
    cover_image: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1600&q=80",
    popular_cities: ["Imphal", "Moirang", "Loktak Lake", "Ukhrul", "Churachandpur"],
    best_time_to_visit: "October to March",
    climate: "Mild sunny winters with cool hill breezes",
    ideal_duration: "3 to 5 Days",
    popular_attractions: [
      "Keibul Lamjao Floating National Park & Sangai Deer",
      "Loktak Lake Traditional Canoe & Homestay Experience",
      "Ima Keithel — World's Largest All-Women Market in Imphal",
      "Kangla Fort Historical Citadel",
      "Ukhrul Shirui Lily Flower Valleys",
      "INA Memorial at Moirang",
    ],
    culture_and_cuisine:
      "Manipuri Classical Raas Leela dance, polo origins (Sagol Kangjei), and Eromba, Singju spicy salad, Chamthong stew, and Chak-hao black rice kheer.",
    latitude: 24.817,
    longitude: 93.9368,
    featured: false,
  },
  {
    slug: "nagaland",
    name: "Nagaland",
    state: "Nagaland",
    country: "India",
    region: "North East",
    tagline: "Land of Festivals — Hornbill Extravaganza, Dzukou Valley & Naga Hills",
    description:
      "A culturally rich highland state known worldwide for the Hornbill Festival in Kohima, the emerald trekking paradise of Dzukou Valley, and traditional Naga warrior tribal heritage.",
    cover_image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80",
    popular_cities: ["Kohima", "Dimapur", "Dzukou Valley", "Mokokchung", "Mon", "Khonoma"],
    best_time_to_visit: "October to May (December for Hornbill Festival)",
    climate: "Pleasant temperate mountain climate with cool evenings",
    ideal_duration: "4 to 6 Days",
    popular_attractions: [
      "Hornbill Festival at Kisama Heritage Village",
      "Dzukou Valley Trek & Lily Blooms",
      "Khonoma — India's First Green Eco Village",
      "Kohima WWII War Cemetery Memorial",
      "Mon Konyak Tattooed Warrior Villages",
      "Mokokchung Ao Naga Cultural Centers",
    ],
    culture_and_cuisine:
      "Naga warrior shawls, wood carving, bamboo crafts, and Smoked Pork with Anishi, Bamboo Shoot Curry, Axone fermented bean relish, and Raja Mircha chili sauce.",
    latitude: 25.6751,
    longitude: 94.1086,
    featured: false,
  },
  {
    slug: "mizoram",
    name: "Mizoram",
    state: "Mizoram",
    country: "India",
    region: "North East",
    tagline: "Land of Rolling Hills — Blue Mountains, Reiek Peaks & Bamboo Trails",
    description:
      "A serene tranquil paradise characterized by verdant bamboo hills, the Blue Mountain (Phawngpui), panoramic trekking at Reiek Peak, and the warm harmonious Mizo community life.",
    cover_image: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1600&q=80",
    popular_cities: ["Aizawl", "Reiek", "Lunglei", "Champhai", "Phawngpui", "Thenzawl"],
    best_time_to_visit: "October to April",
    climate: "Crisp hill station weather with fresh mountain pine air",
    ideal_duration: "3 to 5 Days",
    popular_attractions: [
      "Reiek Peak Panoramic Trek & Heritage Village",
      "Phawngpui Blue Mountain National Park",
      "Vantawng Falls — Highest Waterfall in Mizoram",
      "Aizawl Solomon's Temple & Durtlang Hills Viewpoint",
      "Tam Dil Natural Forest Lake",
      "Thenzawl Handloom Weaving Center",
    ],
    culture_and_cuisine:
      "Cheraw bamboo dance, Chapchar Kut festival, and healthy steamed Bai stew, Vawksa Rep (smoked pork), Bamboo Shoot Fry, and Panch Phoron Curry.",
    latitude: 23.7271,
    longitude: 92.7176,
    featured: false,
  },
  {
    slug: "tripura",
    name: "Tripura",
    state: "Tripura",
    country: "India",
    region: "North East",
    tagline: "Royal Legacy — Floating Neermahal Palace & Unakoti Rock Carvings",
    description:
      "A historic princely state featuring the stunning water palace Neermahal on Rudrasagar Lake, the royal Ujjayanta Palace, and the colossal 7th-century rock-cut Shiva carvings at Unakoti.",
    cover_image: "https://images.unsplash.com/photo-1558431382-27e303142255?auto=format&fit=crop&w=1600&q=80",
    popular_cities: ["Agartala", "Unakoti", "Udaipur", "Neermahal", "Jampui Hills"],
    best_time_to_visit: "October to March",
    climate: "Temperate and breezy with pleasant orange blossoms in Jampui Hills",
    ideal_duration: "3 to 5 Days",
    popular_attractions: [
      "Neermahal Water Palace & Lake Boating",
      "Unakoti 7th-Century Giant Rock-Cut Sculptures",
      "Ujjayanta Palace & State Museum in Agartala",
      "Tripura Sundari Temple at Udaipur",
      "Jampui Hills Orange Valley Viewpoints",
      "Sepahijala Wildlife Sanctuary & Clouded Leopard Habitat",
    ],
    culture_and_cuisine:
      "Tripuri tribal dances (Hojagiri), fine cane and bamboo handcrafts, and Mui Borok traditional cuisine, Berma fermented fish dishes, Kosoi Bwtwi, and Gudok.",
    latitude: 23.8315,
    longitude: 91.2868,
    featured: false,
  },
  {
    slug: "lakshadweep",
    name: "Lakshadweep",
    state: "Lakshadweep",
    country: "India",
    region: "Islands & UTs",
    tagline: "Coral Atolls & Emerald Lagoons — India's Secret Tropical Eden",
    description:
      "An idyllic tropical archipelago of coral atolls, turquoise lagoons, coconut palms, and pristine underwater marine reserves perfect for scuba diving, kayaking, and reef snorkeling.",
    cover_image: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1600&q=80",
    popular_cities: ["Agatti Island", "Bangaram Atoll", "Kavaratti", "Kadmat Island", "Minicoy"],
    best_time_to_visit: "October to mid-May",
    climate: "Pure tropical ocean climate with warm calm lagoon waters",
    ideal_duration: "4 to 6 Days",
    popular_attractions: [
      "Bangaram Atoll Coral Lagoon & Sandbar Walks",
      "Agatti Island Scuba Diving & Sea Turtle Watching",
      "Kadmat Water Sports & Kayaking Academy",
      "Kavaratti Marine Aquarium & Glass-Bottom Boat Tours",
      "Minicoy Lighthouse Panoramic Ocean Views",
      "Coral Reef Night Snorkeling",
    ],
    culture_and_cuisine:
      "Mahal and Malayalam coastal traditions, coir craft, and fresh Grilled Tuna, Rayereha (spicy red tuna curry), Coconut Rice, and Sweet Kadalakka.",
    latitude: 10.5667,
    longitude: 72.6417,
    featured: false,
  },
  {
    slug: "haryana",
    name: "Haryana",
    state: "Haryana",
    country: "India",
    region: "North India",
    tagline: "Heritage & Modernity — Kurukshetra Epics, Sultanpur Birds & Millennium Hub",
    description:
      "A dynamic state intertwining ancient epic heritage at sacred Kurukshetra with birdwatching at Sultanpur National Park and the futuristic modern cityscape of Gurugram.",
    cover_image: "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=1600&q=80",
    popular_cities: ["Gurugram", "Kurukshetra", "Faridabad", "Panipat", "Panchkula", "Hisar"],
    best_time_to_visit: "October to March",
    climate: "Sunny crisp winter days with pleasant outdoor weather",
    ideal_duration: "2 to 4 Days",
    popular_attractions: [
      "Brahma Sarovar & Jyotisar Gita Updesh Site in Kurukshetra",
      "Sultanpur National Park Migratory Bird Sanctuary",
      "Kingdom of Dreams & CyberHub in Gurugram",
      "Pinjore Gardens & Morni Hills Lake",
      "Surajkund International Crafts Mela grounds",
      "Panipat Historic Battlefields & Museum",
    ],
    culture_and_cuisine:
      "Ragni folk songs, wrestling (Dangal) heritage, and rich rural dishes like Bajra Khichdi with Ghee, Kadhi Pakora, Kachri ki Sabzi, Churma, and fresh churned White Butter.",
    latitude: 28.4595,
    longitude: 77.0266,
    featured: false,
  },
  {
    slug: "dadra-and-nagar-haveli-and-daman-and-diu",
    name: "Dadra & Nagar Haveli and Daman & Diu",
    state: "Dadra and Nagar Haveli and Daman and Diu",
    country: "India",
    region: "Islands & UTs",
    tagline: "Portuguese Coastal Bastions — Diu Fortress, Devka Beach & Daman Port",
    description:
      "A coastal union territory boasting imposing 16th-century Portuguese sea fortresses, golden beaches in Diu, tranquil palm groves in Silvassa, and vibrant coastal seafood shacks.",
    cover_image: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1600&q=80",
    popular_cities: ["Diu", "Daman", "Silvassa", "Nani Daman", "Moti Daman"],
    best_time_to_visit: "October to April",
    climate: "Refreshing sea breezes and sunny coastal weather",
    ideal_duration: "3 to 4 Days",
    popular_attractions: [
      "Diu Fort & Lighthouse Panoramic Sea Views",
      "St. Paul's Church & Naida Caves in Diu",
      "Ghoghla Beach & Water Sports",
      "Moti Daman Fort & Bom Jesus Cathedral",
      "Silvassa Tribal Cultural Museum & Dudhni Lake",
      "Devka Beach & Jampore Beach Promenades",
    ],
    culture_and_cuisine:
      "Portuguese and Gujarati coastal blend, and fresh Fried Pomfret, Lobster Butter Garlic, Crab Masala, and Portuguese Pao dishes.",
    latitude: 20.7144,
    longitude: 70.9874,
    featured: false,
  },
];

/**
 * Normalizes a query string or slug to match against destinations
 */
export function normalizeDestinationKey(val: string): string {
  return String(val || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Finds a destination by slug, state name, or city name
 */
export function getDestinationBySlug(slugOrName: string): DestinationData | undefined {
  if (!slugOrName) return undefined;
  const key = normalizeDestinationKey(slugOrName);

  // 1. Direct slug match
  const direct = DESTINATIONS_DATA.find((d) => d.slug === key);
  if (direct) return direct;

  // 2. Normalized state match
  const stateMatch = DESTINATIONS_DATA.find(
    (d) => normalizeDestinationKey(d.state) === key || normalizeDestinationKey(d.name) === key
  );
  if (stateMatch) return stateMatch;

  // 3. Normalized city match
  const cityMatch = DESTINATIONS_DATA.find((d) =>
    d.popular_cities.some((c) => normalizeDestinationKey(c) === key)
  );
  if (cityMatch) return cityMatch;

  // 4. Substring fallback
  return DESTINATIONS_DATA.find(
    (d) =>
      d.slug.includes(key) ||
      key.includes(d.slug) ||
      d.state.toLowerCase().includes(slugOrName.toLowerCase()) ||
      slugOrName.toLowerCase().includes(d.state.toLowerCase())
  );
}

/**
 * Returns all destinations grouped by regions
 */
export function getAllDestinations(): DestinationData[] {
  return DESTINATIONS_DATA;
}
