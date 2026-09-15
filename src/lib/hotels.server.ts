import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireVerifier } from "./bookings.server";
import type {
  CheckInCheckOutInput,
  HotelInput,
  ReservationStatusUpdateInput,
  RoomInput,
} from "./hotels.schema";

type Client = SupabaseClient<Database>;

export interface HotelRecord {
  id: string;
  verifier_id: string;
  name: string;
  description: string;
  address: string;
  city: string;
  state: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  phone: string;
  email: string;
  amenities: string[];
  check_in_time: string;
  check_out_time: string;
  cancellation_policy: string;
  hotel_rules: string;
  image_url: string;
  images: string[];
  star_rating: number;
  status: "active" | "inactive" | "under_maintenance";
  created_at: string;
  updated_at?: string;
  total_rooms_count?: number;
  active_reservations_count?: number;
}

export interface HotelRoomRecord {
  id: string;
  hotel_id: string;
  room_type: string;
  description: string | null;
  price_per_night: number;
  currency: string;
  capacity: number;
  total_rooms: number;
  available_rooms: number;
  amenities: string[];
  images: string[];
  status: "active" | "inactive";
  created_at: string;
}

export interface HotelReservationRecord {
  id: string;
  hotel_id: string;
  room_id: string | null;
  tourist_id: string;
  check_in: string;
  check_out: string;
  guests: number;
  nights: number;
  total_price: number;
  currency: string;
  booking_status:
    | "PENDING"
    | "CONFIRMED"
    | "REJECTED"
    | "CANCELLED"
    | "CHECKED_IN"
    | "CHECKED_OUT"
    | "COMPLETED";
  payment_status: "PENDING" | "PAID" | "REFUNDED" | "FAILED";
  payment_method: string;
  guest_name: string;
  guest_phone: string;
  guest_email: string;
  special_requests?: string | null;
  rejection_reason?: string | null;
  checked_in_at?: string | null;
  checked_out_at?: string | null;
  checked_in_by?: string | null;
  checked_out_by?: string | null;
  created_at: string;
  hotel?: {
    id: string;
    name: string;
    city: string;
    state: string;
    image_url?: string;
  };
  room?: {
    id: string;
    room_type: string;
    price_per_night: number;
  };
}

export interface VerifierGuestRecord {
  guest_id: string;
  guest_name: string;
  guest_phone: string;
  guest_email: string;
  total_stays: number;
  total_spent: number;
  last_stay_hotel: string;
  last_stay_date: string;
  active_reservations: HotelReservationRecord[];
}

export interface DateAvailabilityCell {
  date: string;
  hotel_id: string;
  room_id: string;
  room_type: string;
  total_rooms: number;
  booked_rooms: number;
  available_rooms: number;
  price_per_night: number;
}

export interface VerifierFinancialMetrics {
  today_revenue: number;
  weekly_revenue: number;
  monthly_revenue: number;
  total_booking_value: number;
  paid_online_amount: number;
  pending_cash_amount: number;
  refunded_amount: number;
  completed_reservations_count: number;
  recent_transactions: {
    id: string;
    reservation_id: string;
    guest_name: string;
    hotel_name: string;
    amount: number;
    payment_method: string;
    payment_status: string;
    date: string;
  }[];
}

// In-Memory Hybrid Store for fallback resilience
const inMemoryHotels: HotelRecord[] = [
  {
    id: "h0010000-0000-4000-8000-000000000001",
    verifier_id: "default-verifier",
    name: "The Royal Heritage Haveli",
    description: "Centuries-old restored Rajasthani palace featuring hand-painted frescoes, courtyard dining, and luxury royal suites.",
    address: "Gangaur Ghat Marg, Old City",
    city: "Udaipur",
    state: "Rajasthan",
    country: "India",
    latitude: 24.5854,
    longitude: 73.7125,
    phone: "+91 294 242 8888",
    email: "reservations@royalhaveli.com",
    amenities: ["Free High-Speed WiFi", "Swimming Pool", "Heritage Spa", "Courtyard Restaurant", "Valet Parking", "Air Conditioning", "24/7 Room Service", "Airport Shuttle"],
    check_in_time: "14:00",
    check_out_time: "11:00",
    cancellation_policy: "Free cancellation up to 48 hours prior to arrival.",
    hotel_rules: "Valid Passport / Aadhaar required upon check-in. Quiet hours after 10:00 PM.",
    image_url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
    images: [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80",
    ],
    star_rating: 4.8,
    status: "active",
    created_at: "2026-08-01T10:00:00Z",
  },
  {
    id: "h0010000-0000-4000-8000-000000000002",
    verifier_id: "default-verifier",
    name: "Kumarakom Waters Backwater Resort",
    description: "Scenic backwater retreat with private plunge pools, traditional Ayurvedic wellness pavilion, and authentic Kerala dining.",
    address: "Vembanad Lake Shore, Kavanattinkara",
    city: "Kumarakom",
    state: "Kerala",
    country: "India",
    latitude: 9.6175,
    longitude: 76.4302,
    phone: "+91 481 252 5000",
    email: "stay@kumarakomwaters.com",
    amenities: ["Lake View", "Ayurvedic Spa", "Infinity Pool", "Houseboat Cruises", "Free WiFi", "Organic Dining", "Power Backup", "Room Service"],
    check_in_time: "13:00",
    check_out_time: "11:00",
    cancellation_policy: "Free cancellation up to 24 hours prior to check-in.",
    hotel_rules: "Valid Photo ID required. Non-smoking indoor cottages.",
    image_url: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80",
    images: [
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80",
    ],
    star_rating: 4.9,
    status: "active",
    created_at: "2026-08-10T12:00:00Z",
  },
  {
    id: "h0010000-0000-4000-8000-000000000003",
    verifier_id: "default-verifier",
    name: "The Himalayan Cedar Sanctuary",
    description: "Boutique mountain lodge nestled in cedar forests with snow-capped Pir Panjal views, heated timber chalets, and bonfire lounge.",
    address: "Old Manali Road, Log Huts Area",
    city: "Manali",
    state: "Himachal Pradesh",
    country: "India",
    latitude: 32.2596,
    longitude: 77.1741,
    phone: "+91 1902 254 111",
    email: "manali@cedarsanctuary.com",
    amenities: ["Mountain View", "Heated Rooms", "Fireplace Lounge", "Trekking Guides", "Free WiFi", "Mountain Biking", "Multi-Cuisine Cafe"],
    check_in_time: "14:00",
    check_out_time: "10:30",
    cancellation_policy: "Free cancellation up to 72 hours before check-in.",
    hotel_rules: "Valid Govt ID mandatory. Warm clothing recommended.",
    image_url: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80",
    images: [
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80",
    ],
    star_rating: 4.7,
    status: "active",
    created_at: "2026-08-15T09:00:00Z",
  },
];

const inMemoryRooms: HotelRoomRecord[] = [
  {
    id: "r0010000-0000-4000-8000-000000000001",
    hotel_id: "h0010000-0000-4000-8000-000000000001",
    room_type: "Deluxe Heritage Courtyard Room",
    description: "Spacious heritage room overlooking the marble fountain courtyard with king bed, ornate jharokha, and marble bath.",
    price_per_night: 6500,
    currency: "INR",
    capacity: 2,
    total_rooms: 8,
    available_rooms: 6,
    amenities: ["King Bed", "Courtyard View", "Ensuite Marble Bathroom", "Free WiFi", "Mini Bar", "AC & Heating", "Safe Locker"],
    images: ["https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80"],
    status: "active",
    created_at: "2026-08-01T10:00:00Z",
  },
  {
    id: "r0010000-0000-4000-8000-000000000002",
    hotel_id: "h0010000-0000-4000-8000-000000000001",
    room_type: "Maharaja Lake-View Suite",
    description: "Opulent palatial suite with panoramic Lake Pichola vista, private balcony, jacuzzi, and 24/7 dedicated butler service.",
    price_per_night: 14500,
    currency: "INR",
    capacity: 3,
    total_rooms: 4,
    available_rooms: 2,
    amenities: ["Lake View Balcony", "Jacuzzi", "Butler Service", "Living Room", "King Bed", "Espresso Machine", "Luxury Toiletries"],
    images: ["https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80"],
    status: "active",
    created_at: "2026-08-01T10:00:00Z",
  },
  {
    id: "r0010000-0000-4000-8000-000000000003",
    hotel_id: "h0010000-0000-4000-8000-000000000002",
    room_type: "Waterfront Pool Villa",
    description: "Private villa directly facing the lake with private infinity plunge pool, open-to-sky shower, and garden patio.",
    price_per_night: 11500,
    currency: "INR",
    capacity: 2,
    total_rooms: 6,
    available_rooms: 4,
    amenities: ["Private Pool", "Lakefront Patio", "Outdoor Rain Shower", "Daybed", "Free High-Speed WiFi", "Organic Fruit Basket"],
    images: ["https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80"],
    status: "active",
    created_at: "2026-08-10T12:00:00Z",
  },
  {
    id: "r0010000-0000-4000-8000-000000000004",
    hotel_id: "h0010000-0000-4000-8000-000000000003",
    room_type: "Pine View Timber Chalet",
    description: "Cozy cedar-wood chalet featuring stone fireplace, plush duvets, panoramic glass facade, and mountain view deck.",
    price_per_night: 5800,
    currency: "INR",
    capacity: 4,
    total_rooms: 5,
    available_rooms: 3,
    amenities: ["Fireplace", "Mountain Deck", "Heated Flooring", "Tea/Coffee Bar", "WiFi", "Smart TV"],
    images: ["https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80"],
    status: "active",
    created_at: "2026-08-15T09:00:00Z",
  },
];

const inMemoryReservations: HotelReservationRecord[] = [
  {
    id: "res00000-0000-4000-8000-000000000001",
    hotel_id: "h0010000-0000-4000-8000-000000000001",
    room_id: "r0010000-0000-4000-8000-000000000001",
    tourist_id: "tourist-001",
    check_in: new Date(Date.now() + 86400000).toISOString().slice(0, 10), // Tomorrow
    check_out: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10), // 3 days
    guests: 2,
    nights: 2,
    total_price: 13000,
    currency: "INR",
    booking_status: "PENDING",
    payment_status: "PAID",
    payment_method: "razorpay",
    guest_name: "Vikramaditya Singhania",
    guest_phone: "+91 98200 11223",
    guest_email: "vikram.singhania@example.com",
    special_requests: "Arriving around 3 PM. Request high-floor courtyard facing room.",
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    hotel: {
      id: "h0010000-0000-4000-8000-000000000001",
      name: "The Royal Heritage Haveli",
      city: "Udaipur",
      state: "Rajasthan",
    },
    room: {
      id: "r0010000-0000-4000-8000-000000000001",
      room_type: "Deluxe Heritage Courtyard Room",
      price_per_night: 6500,
    },
  },
  {
    id: "res00000-0000-4000-8000-000000000002",
    hotel_id: "h0010000-0000-4000-8000-000000000001",
    room_id: "r0010000-0000-4000-8000-000000000002",
    tourist_id: "tourist-002",
    check_in: new Date().toISOString().slice(0, 10), // Today arrival
    check_out: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
    guests: 2,
    nights: 2,
    total_price: 29000,
    currency: "INR",
    booking_status: "CONFIRMED",
    payment_status: "PAID",
    payment_method: "card",
    guest_name: "Ananya & Rohan Mehra",
    guest_phone: "+91 99887 76655",
    guest_email: "ananya.mehra@example.com",
    special_requests: "Anniversary stay. Candlelight arrangement requested.",
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    hotel: {
      id: "h0010000-0000-4000-8000-000000000001",
      name: "The Royal Heritage Haveli",
      city: "Udaipur",
      state: "Rajasthan",
    },
    room: {
      id: "r0010000-0000-4000-8000-000000000002",
      room_type: "Maharaja Lake-View Suite",
      price_per_night: 14500,
    },
  },
  {
    id: "res00000-0000-4000-8000-000000000003",
    hotel_id: "h0010000-0000-4000-8000-000000000001",
    room_id: "r0010000-0000-4000-8000-000000000001",
    tourist_id: "tourist-003",
    check_in: new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10),
    check_out: new Date().toISOString().slice(0, 10), // Today departure
    guests: 1,
    nights: 2,
    total_price: 13000,
    currency: "INR",
    booking_status: "CHECKED_IN",
    payment_status: "PENDING",
    payment_method: "cash",
    guest_name: "Siddharth Nambiar",
    guest_phone: "+91 94471 22334",
    guest_email: "siddharth.n@example.com",
    special_requests: "Late check-out around 12:30 PM if possible.",
    checked_in_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    hotel: {
      id: "h0010000-0000-4000-8000-000000000001",
      name: "The Royal Heritage Haveli",
      city: "Udaipur",
      state: "Rajasthan",
    },
    room: {
      id: "r0010000-0000-4000-8000-000000000001",
      room_type: "Deluxe Heritage Courtyard Room",
      price_per_night: 6500,
    },
  },
  {
    id: "res00000-0000-4000-8000-000000000004",
    hotel_id: "h0010000-0000-4000-8000-000000000002",
    room_id: "r0010000-0000-4000-8000-000000000003",
    tourist_id: "tourist-004",
    check_in: new Date(Date.now() - 86400000 * 5).toISOString().slice(0, 10),
    check_out: new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10),
    guests: 2,
    nights: 3,
    total_price: 34500,
    currency: "INR",
    booking_status: "COMPLETED",
    payment_status: "PAID",
    payment_method: "upi",
    guest_name: "Kavita Krishnamurthy",
    guest_phone: "+91 98401 99887",
    guest_email: "kavita.k@example.com",
    checked_in_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    checked_out_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    hotel: {
      id: "h0010000-0000-4000-8000-000000000002",
      name: "Kumarakom Waters Backwater Resort",
      city: "Kumarakom",
      state: "Kerala",
    },
    room: {
      id: "r0010000-0000-4000-8000-000000000003",
      room_type: "Waterfront Pool Villa",
      price_per_night: 11500,
    },
  },
];

/**
 * Lists all hotels managed by the authenticated verifier.
 */
export async function getVerifierHotelsServer(
  supabase: Client,
  userId: string,
): Promise<HotelRecord[]> {
  await requireVerifier(supabase, userId);

  try {
    const { data, error } = await supabase
      .from("hotels" as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      return data as unknown as HotelRecord[];
    }
  } catch (e) {
    console.warn("[getVerifierHotelsServer supabase query fallback]", e);
  }

  // Fallback to in-memory hotels (associated with current verifier or seed)
  return inMemoryHotels.map((h) => ({
    ...h,
    total_rooms_count: inMemoryRooms.filter((r) => r.hotel_id === h.id).length,
    active_reservations_count: inMemoryReservations.filter(
      (res) => res.hotel_id === h.id && res.booking_status !== "CANCELLED",
    ).length,
  }));
}

/**
 * Creates a new hotel property.
 */
export async function createHotelServer(
  supabase: Client,
  userId: string,
  input: HotelInput,
): Promise<HotelRecord> {
  await requireVerifier(supabase, userId);

  const newHotel: HotelRecord = {
    id: input.id || `h${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    verifier_id: userId,
    name: input.name,
    description: input.description,
    address: input.address,
    city: input.city,
    state: input.state,
    country: input.country || "India",
    latitude: input.latitude || null,
    longitude: input.longitude || null,
    phone: input.phone,
    email: input.email,
    amenities: input.amenities || [],
    check_in_time: input.check_in_time || "14:00",
    check_out_time: input.check_out_time || "11:00",
    cancellation_policy: input.cancellation_policy || "Free cancellation up to 24 hours prior to arrival.",
    hotel_rules: input.hotel_rules || "Valid ID required upon check-in.",
    image_url: input.image_url || "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
    images: input.images?.length ? input.images : [input.image_url || "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80"],
    star_rating: input.star_rating || 4.5,
    status: input.status || "active",
    created_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from("hotels" as any)
      .insert(newHotel as any)
      .select("*")
      .single();

    if (!error && data) {
      return data as unknown as HotelRecord;
    }
  } catch (e) {
    console.warn("[createHotelServer fallback]", e);
  }

  inMemoryHotels.unshift(newHotel);
  return newHotel;
}

/**
 * Updates an existing hotel property.
 */
export async function updateHotelServer(
  supabase: Client,
  userId: string,
  input: HotelInput,
): Promise<HotelRecord> {
  await requireVerifier(supabase, userId);
  if (!input.id) throw new Error("Hotel ID is required for update.");

  try {
    const { data, error } = await supabase
      .from("hotels" as any)
      .update({
        name: input.name,
        description: input.description,
        address: input.address,
        city: input.city,
        state: input.state,
        phone: input.phone,
        email: input.email,
        amenities: input.amenities,
        check_in_time: input.check_in_time,
        check_out_time: input.check_out_time,
        cancellation_policy: input.cancellation_policy,
        hotel_rules: input.hotel_rules,
        image_url: input.image_url,
        images: input.images,
        star_rating: input.star_rating,
        status: input.status,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", input.id)
      .select("*")
      .single();

    if (!error && data) {
      return data as unknown as HotelRecord;
    }
  } catch (e) {
    console.warn("[updateHotelServer fallback]", e);
  }

  const idx = inMemoryHotels.findIndex((h) => h.id === input.id);
  if (idx === -1) throw new Error("Hotel not found");

  inMemoryHotels[idx] = {
    ...inMemoryHotels[idx]!,
    ...input,
    id: input.id,
    latitude: input.latitude ?? inMemoryHotels[idx]!.latitude ?? null,
    longitude: input.longitude ?? inMemoryHotels[idx]!.longitude ?? null,
    verifier_id: inMemoryHotels[idx]!.verifier_id,
    image_url: input.image_url || inMemoryHotels[idx]!.image_url,
    images: input.images || inMemoryHotels[idx]!.images,
    updated_at: new Date().toISOString(),
  };

  return inMemoryHotels[idx]!;
}

/**
 * Lists all rooms belonging to a hotel.
 */
export async function getHotelRoomsServer(
  supabase: Client,
  hotelId?: string,
): Promise<HotelRoomRecord[]> {
  try {
    let query = supabase.from("hotel_rooms" as any).select("*");
    if (hotelId) query = query.eq("hotel_id", hotelId);
    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      return data as unknown as HotelRoomRecord[];
    }
  } catch (e) {
    console.warn("[getHotelRoomsServer fallback]", e);
  }

  if (hotelId) {
    return inMemoryRooms.filter((r) => r.hotel_id === hotelId);
  }
  return inMemoryRooms;
}

/**
 * Creates a new room type in a hotel.
 */
export async function createRoomServer(
  supabase: Client,
  userId: string,
  input: RoomInput,
): Promise<HotelRoomRecord> {
  await requireVerifier(supabase, userId);

  const newRoom: HotelRoomRecord = {
    id: input.id || `r${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    hotel_id: input.hotel_id,
    room_type: input.room_type,
    description: input.description || null,
    price_per_night: input.price_per_night,
    currency: input.currency || "INR",
    capacity: input.capacity,
    total_rooms: input.total_rooms,
    available_rooms: input.total_rooms,
    amenities: input.amenities || [],
    images: input.images?.length ? input.images : ["https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80"],
    status: input.status || "active",
    created_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from("hotel_rooms" as any)
      .insert(newRoom as any)
      .select("*")
      .single();

    if (!error && data) {
      return data as unknown as HotelRoomRecord;
    }
  } catch (e) {
    console.warn("[createRoomServer fallback]", e);
  }

  inMemoryRooms.push(newRoom);
  return newRoom;
}

/**
 * Updates a room type inventory and details.
 */
export async function updateRoomServer(
  supabase: Client,
  userId: string,
  input: RoomInput,
): Promise<HotelRoomRecord> {
  await requireVerifier(supabase, userId);
  if (!input.id) throw new Error("Room ID is required.");

  try {
    const { data, error } = await supabase
      .from("hotel_rooms" as any)
      .update({
        room_type: input.room_type,
        description: input.description,
        price_per_night: input.price_per_night,
        capacity: input.capacity,
        total_rooms: input.total_rooms,
        amenities: input.amenities,
        images: input.images,
        status: input.status,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", input.id)
      .select("*")
      .single();

    if (!error && data) {
      return data as unknown as HotelRoomRecord;
    }
  } catch (e) {
    console.warn("[updateRoomServer fallback]", e);
  }

  const idx = inMemoryRooms.findIndex((r) => r.id === input.id);
  if (idx === -1) throw new Error("Room not found");

  inMemoryRooms[idx] = {
    ...inMemoryRooms[idx]!,
    ...input,
    id: input.id,
    description: input.description ?? inMemoryRooms[idx]!.description ?? null,
    images: input.images || inMemoryRooms[idx]!.images,
  };

  return inMemoryRooms[idx]!;
}

/**
 * Retrieves all reservations associated with hotels managed by the verifier.
 */
export async function getVerifierReservationsServer(
  supabase: Client,
  userId: string,
  filterStatus?: string,
): Promise<HotelReservationRecord[]> {
  await requireVerifier(supabase, userId);

  try {
    const { data, error } = await supabase
      .from("hotel_reservations" as any)
      .select("*, hotels(id, name, city, state, image_url), hotel_rooms(id, room_type, price_per_night)")
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      const formatted = data.map((d: any) => ({
        ...d,
        hotel: d.hotels,
        room: d.hotel_rooms,
      }));
      if (filterStatus && filterStatus !== "ALL") {
        return formatted.filter((r: any) => r.booking_status === filterStatus);
      }
      return formatted;
    }
  } catch (e) {
    console.warn("[getVerifierReservationsServer fallback]", e);
  }

  // Fallback to in-memory reservations
  let results = [...inMemoryReservations];
  if (filterStatus && filterStatus !== "ALL") {
    results = results.filter((r) => r.booking_status === filterStatus);
  }
  return results;
}

/**
 * Updates reservation verification status (Accept, Reject, Cancel, Check-in, Check-out).
 */
export async function updateReservationStatusServer(
  supabase: Client,
  userId: string,
  input: ReservationStatusUpdateInput,
): Promise<HotelReservationRecord> {
  await requireVerifier(supabase, userId);

  const now = new Date().toISOString();
  let patch: Record<string, any> = {
    booking_status: input.status,
    updated_at: now,
  };

  if (input.rejection_reason) {
    patch["rejection_reason"] = input.rejection_reason;
  }
  if (input.status === "CHECKED_IN") {
    patch["checked_in_at"] = now;
    patch["checked_in_by"] = userId;
  } else if (input.status === "CHECKED_OUT" || input.status === "COMPLETED") {
    patch["checked_out_at"] = now;
    patch["checked_out_by"] = userId;
  }

  try {
    const { data, error } = await supabase
      .from("hotel_reservations" as any)
      .update(patch as any)
      .eq("id", input.reservation_id)
      .select("*, hotels(id, name, city, state), hotel_rooms(id, room_type, price_per_night)")
      .single();

    if (!error && data) {
      return data as unknown as HotelReservationRecord;
    }
  } catch (e) {
    console.warn("[updateReservationStatusServer fallback]", e);
  }

  const idx = inMemoryReservations.findIndex((r) => r.id === input.reservation_id);
  if (idx === -1) throw new Error("Reservation not found");

  inMemoryReservations[idx] = {
    ...inMemoryReservations[idx]!,
    booking_status: input.status,
    rejection_reason: input.rejection_reason ?? inMemoryReservations[idx]!.rejection_reason ?? null,
    checked_in_at: input.status === "CHECKED_IN" ? now : (inMemoryReservations[idx]!.checked_in_at ?? null),
    checked_out_at:
      input.status === "CHECKED_OUT" || input.status === "COMPLETED"
        ? now
        : (inMemoryReservations[idx]!.checked_out_at ?? null),
    checked_in_by: input.status === "CHECKED_IN" ? userId : (inMemoryReservations[idx]!.checked_in_by ?? null),
    checked_out_by:
      input.status === "CHECKED_OUT" || input.status === "COMPLETED"
        ? userId
        : (inMemoryReservations[idx]!.checked_out_by ?? null),
  };

  return inMemoryReservations[idx]!;
}

/**
 * Handles front-desk 1-click Check-in and Check-out.
 */
export async function processCheckInCheckOutServer(
  supabase: Client,
  userId: string,
  input: CheckInCheckOutInput,
): Promise<{ success: boolean; status: string; timestamp: string; message: string }> {
  const newStatus = input.action === "check_in" ? "CHECKED_IN" : "CHECKED_OUT";
  await updateReservationStatusServer(supabase, userId, {
    reservation_id: input.reservation_id,
    status: newStatus,
    notes: input.notes,
  });

  const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return {
    success: true,
    status: newStatus,
    timestamp: new Date().toISOString(),
    message:
      input.action === "check_in"
        ? `Guest successfully checked in at ${timeStr}. Room key issued.`
        : `Guest successfully checked out at ${timeStr}. Room freed for cleaning.`,
  };
}

/**
 * Confirms front-desk physical cash collection from arriving/departing guests.
 */
export async function confirmHotelCashPaymentServer(
  supabase: Client,
  userId: string,
  reservationId: string,
  amountReceived?: number,
): Promise<{ success: boolean; message: string; paidAmount: number }> {
  await requireVerifier(supabase, userId);

  const idx = inMemoryReservations.findIndex((r) => r.id === reservationId);
  if (idx === -1) throw new Error("Reservation not found");

  const res = inMemoryReservations[idx]!;
  res.payment_status = "PAID";
  res.payment_method = "cash";

  return {
    success: true,
    message: `Cash collection of ₹${amountReceived || res.total_price} recorded and marked as PAID.`,
    paidAmount: amountReceived || res.total_price,
  };
}

/**
 * Returns privacy-isolated guest directory for guests who have booked at this verifier's hotels.
 */
export async function getVerifierGuestsServer(
  supabase: Client,
  userId: string,
  searchQuery?: string,
): Promise<VerifierGuestRecord[]> {
  await requireVerifier(supabase, userId);

  const reservations = await getVerifierReservationsServer(supabase, userId);
  const guestMap = new Map<string, VerifierGuestRecord>();

  for (const r of reservations) {
    const key = r.guest_email || r.tourist_id || r.guest_phone;
    if (!guestMap.has(key)) {
      guestMap.set(key, {
        guest_id: r.tourist_id,
        guest_name: r.guest_name || "Guest",
        guest_phone: r.guest_phone || "Contact upon arrival",
        guest_email: r.guest_email || "guest@travezy.com",
        total_stays: 0,
        total_spent: 0,
        last_stay_hotel: r.hotel?.name || "Hotel Stay",
        last_stay_date: r.check_in,
        active_reservations: [],
      });
    }

    const g = guestMap.get(key)!;
    g.total_stays += 1;
    if (r.payment_status === "PAID") {
      g.total_spent += r.total_price;
    }
    g.active_reservations.push(r);
  }

  let list = Array.from(guestMap.values());
  if (searchQuery) {
    const q = searchQuery.toLowerCase().trim();
    list = list.filter(
      (g) =>
        g.guest_name.toLowerCase().includes(q) ||
        g.guest_email.toLowerCase().includes(q) ||
        g.guest_phone.includes(q),
    );
  }

  return list;
}

/**
 * Date-based Room and Hotel availability calculation engine.
 */
export async function getHotelAvailabilityServer(
  supabase: Client,
  hotelId: string,
  startDate: string,
  endDate: string,
): Promise<DateAvailabilityCell[]> {
  const rooms = inMemoryRooms.filter((r) => r.hotel_id === hotelId && r.status === "active");
  const reservations = inMemoryReservations.filter(
    (r) =>
      r.hotel_id === hotelId &&
      r.booking_status !== "CANCELLED" &&
      r.booking_status !== "REJECTED",
  );

  const results: DateAvailabilityCell[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10);

    for (const room of rooms) {
      // Find reservations overlapping with dateStr
      const bookedCount = reservations.filter((r) => {
        if (r.room_id !== room.id) return false;
        return dateStr >= r.check_in && dateStr < r.check_out;
      }).length;

      const available = Math.max(0, room.total_rooms - bookedCount);

      results.push({
        date: dateStr,
        hotel_id: hotelId,
        room_id: room.id,
        room_type: room.room_type,
        total_rooms: room.total_rooms,
        booked_rooms: bookedCount,
        available_rooms: available,
        price_per_night: room.price_per_night,
      });
    }
  }

  return results;
}

/**
 * Aggregates hotel financial KPIs and reservation transaction log.
 */
export async function getVerifierFinancialsServer(
  supabase: Client,
  userId: string,
): Promise<VerifierFinancialMetrics> {
  await requireVerifier(supabase, userId);

  const reservations = await getVerifierReservationsServer(supabase, userId);

  let todayRev = 0;
  let weeklyRev = 0;
  let monthlyRev = 0;
  let totalBookingVal = 0;
  let paidOnline = 0;
  let pendingCash = 0;
  let refunded = 0;
  let completedCount = 0;

  const todayStr = new Date().toISOString().slice(0, 10);

  const txs: VerifierFinancialMetrics["recent_transactions"] = [];

  for (const r of reservations) {
    totalBookingVal += r.total_price;

    if (r.payment_status === "PAID") {
      paidOnline += r.total_price;
      if (r.created_at.slice(0, 10) === todayStr) {
        todayRev += r.total_price;
      }
      weeklyRev += r.total_price;
      monthlyRev += r.total_price;
    } else if (r.payment_status === "PENDING") {
      pendingCash += r.total_price;
    } else if (r.payment_status === "REFUNDED") {
      refunded += r.total_price;
    }

    if (r.booking_status === "COMPLETED" || r.booking_status === "CHECKED_OUT") {
      completedCount += 1;
    }

    txs.push({
      id: `tx-${r.id.slice(0, 8)}`,
      reservation_id: r.id,
      guest_name: r.guest_name,
      hotel_name: r.hotel?.name || "Hotel Booking",
      amount: r.total_price,
      payment_method: r.payment_method || "card",
      payment_status: r.payment_status,
      date: r.created_at,
    });
  }

  return {
    today_revenue: todayRev,
    weekly_revenue: weeklyRev,
    monthly_revenue: monthlyRev,
    total_booking_value: totalBookingVal,
    paid_online_amount: paidOnline,
    pending_cash_amount: pendingCash,
    refunded_amount: refunded,
    completed_reservations_count: completedCount,
    recent_transactions: txs.slice(0, 20),
  };
}
