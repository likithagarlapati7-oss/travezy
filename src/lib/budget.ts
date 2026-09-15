import { HOTELS_AND_STAYS, type StaysListing } from "@/data/hotels-and-stays";
import { INDIAN_RESTAURANTS, type IndianRestaurantData } from "@/data/indian-restaurants";
import { TOURS_AND_EXPERIENCES, type ToursListing } from "@/data/tours-and-experiences";
import { HUMAN_TOUR_GUIDES, type HumanTourGuide } from "@/data/human-guides";

export type BudgetCategory = "hotels" | "food" | "experiences" | "guide" | "transport" | "other";

export interface BudgetBreakdown {
  hotels: number;
  food: number;
  experiences: number;
  guide: number;
  transport: number;
  other: number;
  total: number;
}

export interface BudgetStatus {
  totalEstimated: number;
  maxBudget: number | null;
  isWithinBudget: boolean;
  isOverBudget: boolean;
  difference: number; // positive = savings/under budget, negative = over budget
  differenceFormatted: string;
  percentageUsed: number;
  breakdown: BudgetBreakdown;
  categoryPercentages: Record<BudgetCategory, number>;
}

export interface CheaperAlternativeOption {
  category: BudgetCategory;
  currentItemTitle: string;
  currentCost: number;
  cheaperItem: {
    id: string;
    title: string;
    type: string;
    price: number;
    rating: number;
    image_url: string;
    description: string;
    city: string;
  };
  savings: number;
}

/**
 * Calculates the total cost and category breakdown from a list of itinerary items.
 */
export function calculateItineraryBudget(
  items: Array<{
    item_type?: string;
    itemType?: string;
    estimated_cost?: number | null;
    estimatedCost?: number | null;
    price?: number | null;
    title?: string;
  }>,
  maxBudget?: number | null
): BudgetStatus {
  let hotels = 0;
  let food = 0;
  let experiences = 0;
  let guide = 0;
  let transport = 0;
  let other = 0;

  for (const item of items) {
    const cost = Number(item.estimated_cost ?? item.estimatedCost ?? item.price ?? 0);
    const type = (item.item_type || item.itemType || "").toLowerCase();
    const title = (item.title || "").toLowerCase();

    if (type.includes("hotel") || type.includes("stay") || type.includes("resort") || title.includes("hotel") || title.includes("stay") || title.includes("resort")) {
      hotels += cost;
    } else if (type.includes("restaurant") || type.includes("food") || type.includes("dining") || title.includes("breakfast") || title.includes("lunch") || title.includes("dinner") || title.includes("dining")) {
      food += cost;
    } else if (type.includes("guide") || title.includes("guide")) {
      guide += cost;
    } else if (type.includes("transport") || type.includes("cab") || type.includes("taxi") || title.includes("transfer") || title.includes("drive")) {
      transport += cost;
    } else if (type.includes("experience") || type.includes("tour") || type.includes("activity") || title.includes("tour") || title.includes("cruise") || title.includes("trek")) {
      experiences += cost;
    } else {
      other += cost;
    }
  }

  const totalEstimated = hotels + food + experiences + guide + transport + other;
  const userBudget = maxBudget !== undefined && maxBudget !== null && maxBudget > 0 ? Number(maxBudget) : null;

  const isWithinBudget = userBudget ? totalEstimated <= userBudget : true;
  const isOverBudget = userBudget ? totalEstimated > userBudget : false;
  const difference = userBudget ? userBudget - totalEstimated : 0;
  const differenceFormatted =
    difference >= 0
      ? `₹${difference.toLocaleString("en-IN")} under budget`
      : `₹${Math.abs(difference).toLocaleString("en-IN")} over budget`;

  const percentageUsed = userBudget && userBudget > 0
    ? Math.min(Math.round((totalEstimated / userBudget) * 100), 200)
    : 100;

  const breakdown: BudgetBreakdown = {
    hotels,
    food,
    experiences,
    guide,
    transport,
    other,
    total: totalEstimated,
  };

  const categoryPercentages: Record<BudgetCategory, number> = {
    hotels: totalEstimated > 0 ? Math.round((hotels / totalEstimated) * 100) : 0,
    food: totalEstimated > 0 ? Math.round((food / totalEstimated) * 100) : 0,
    experiences: totalEstimated > 0 ? Math.round((experiences / totalEstimated) * 100) : 0,
    guide: totalEstimated > 0 ? Math.round((guide / totalEstimated) * 100) : 0,
    transport: totalEstimated > 0 ? Math.round((transport / totalEstimated) * 100) : 0,
    other: totalEstimated > 0 ? Math.round((other / totalEstimated) * 100) : 0,
  };

  return {
    totalEstimated,
    maxBudget: userBudget,
    isWithinBudget,
    isOverBudget,
    difference,
    differenceFormatted,
    percentageUsed,
    breakdown,
    categoryPercentages,
  };
}

/**
 * Searches the actual Travezy database for cheaper alternative items in the same destination.
 * Never invents fake prices.
 */
export function findCheaperAlternatives(
  destinationName: string,
  currentItems: Array<{
    id?: string;
    item_type?: string;
    itemType?: string;
    title: string;
    estimated_cost?: number | null;
    estimatedCost?: number | null;
  }>
): CheaperAlternativeOption[] {
  const destLower = destinationName.toLowerCase();
  const alternatives: CheaperAlternativeOption[] = [];

  const isDestMatch = (item: { destination?: string; city?: string; state?: string }) => {
    return (
      (item.destination && item.destination.toLowerCase().includes(destLower)) ||
      (item.state && item.state.toLowerCase().includes(destLower)) ||
      (item.city && item.city.toLowerCase().includes(destLower))
    );
  };

  const candidateHotels = HOTELS_AND_STAYS.filter(isDestMatch);
  const candidateRestaurants = INDIAN_RESTAURANTS.filter(isDestMatch);
  const candidateTours = TOURS_AND_EXPERIENCES.filter(isDestMatch);
  const candidateGuides = HUMAN_TOUR_GUIDES.filter((g) => g.state.toLowerCase() === destLower || g.city.toLowerCase().includes(destLower));

  for (const current of currentItems) {
    const cost = Number(current.estimated_cost ?? current.estimatedCost ?? 0);
    if (cost <= 500) continue; // Already very low cost

    const type = (current.item_type || current.itemType || "").toLowerCase();

    if (type.includes("hotel") || type.includes("stay")) {
      const cheaper = candidateHotels
        .filter((h) => h.price < cost && h.title !== current.title)
        .sort((a, b) => a.price - b.price)[0];

      if (cheaper) {
        alternatives.push({
          category: "hotels",
          currentItemTitle: current.title,
          currentCost: cost,
          cheaperItem: {
            id: cheaper.id,
            title: cheaper.title,
            type: cheaper.hotel_type,
            price: cheaper.price,
            rating: cheaper.rating,
            image_url: cheaper.image_url,
            description: cheaper.description,
            city: cheaper.city,
          },
          savings: cost - cheaper.price,
        });
      }
    } else if (type.includes("restaurant") || type.includes("food") || type.includes("dining")) {
      const cheaper = candidateRestaurants
        .filter((r) => r.price < cost && r.title !== current.title)
        .sort((a, b) => a.price - b.price)[0];

      if (cheaper) {
        alternatives.push({
          category: "food",
          currentItemTitle: current.title,
          currentCost: cost,
          cheaperItem: {
            id: cheaper.id,
            title: cheaper.title,
            type: `${cheaper.cuisine_type} Cuisine`,
            price: cheaper.price,
            rating: cheaper.rating,
            image_url: cheaper.image_url,
            description: cheaper.description,
            city: cheaper.city,
          },
          savings: cost - cheaper.price,
        });
      }
    } else if (type.includes("experience") || type.includes("tour")) {
      const cheaper = candidateTours
        .filter((t) => t.price < cost && t.title !== current.title)
        .sort((a, b) => a.price - b.price)[0];

      if (cheaper) {
        alternatives.push({
          category: "experiences",
          currentItemTitle: current.title,
          currentCost: cost,
          cheaperItem: {
            id: cheaper.id,
            title: cheaper.title,
            type: cheaper.tour_type,
            price: cheaper.price,
            rating: cheaper.rating,
            image_url: cheaper.image_url,
            description: cheaper.description,
            city: cheaper.city,
          },
          savings: cost - cheaper.price,
        });
      }
    } else if (type.includes("guide")) {
      const cheaper = candidateGuides
        .filter((g) => g.hourly_rate < cost && g.name !== current.title)
        .sort((a, b) => a.hourly_rate - b.hourly_rate)[0];

      if (cheaper) {
        alternatives.push({
          category: "guide",
          currentItemTitle: current.title,
          currentCost: cost,
          cheaperItem: {
            id: cheaper.id,
            title: cheaper.name,
            type: `Tour Guide • ${cheaper.experience_years}y Exp`,
            price: cheaper.hourly_rate,
            rating: cheaper.rating,
            image_url: cheaper.profile_image,
            description: cheaper.bio,
            city: cheaper.city,
          },
          savings: cost - cheaper.hourly_rate,
        });
      }
    }
  }

  return alternatives;
}
