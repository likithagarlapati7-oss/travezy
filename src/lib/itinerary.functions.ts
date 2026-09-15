import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  itineraryInputSchema,
  saveTripPlanSchema,
} from "./ai.schema";
import {
  addItineraryItemServer,
  deleteItineraryItemServer,
  deleteTripPlanServer,
  generateGroundedItinerary,
  getTripPlanByIdServer,
  getUserTripPlansServer,
  saveTripPlanServer,
  updateItineraryItemServer,
} from "./itinerary.server";

function getSupabaseServerClient() {
  const env = process.env as Record<string, string | undefined>;
  const url = env["SUPABASE_URL"] || env["VITE_SUPABASE_URL"] || "";
  const key =
    env["SUPABASE_PUBLISHABLE_KEY"] ||
    env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
    "";

  return createClient<Database>(url, key, {
    auth: { persistSession: false },
  });
}

/**
 * Server function to generate an AI-grounded itinerary with real database records.
 * Accessible to both authenticated users and guests.
 */
export const generateGroundedItineraryFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => itineraryInputSchema.parse(data))
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    return await generateGroundedItinerary(supabase, data);
  });

/**
 * Server function to save a trip plan to Supabase.
 */
export const saveTripPlanFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => saveTripPlanSchema.parse(data))
  .handler(async ({ data, context }) => {
    return await saveTripPlanServer(
      context.supabase,
      context.userId,
      data
    );
  });

/**
 * Server function to fetch all saved itineraries for the current user.
 */
export const getUserTripPlansFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    return await getUserTripPlansServer(
      context.supabase,
      context.userId
    );
  });

/**
 * Server function to fetch a single trip plan with its items.
 */
export const getTripPlanByIdFn = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z.object({
      id: z.string().uuid(),
    }).parse(data)
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    return await getTripPlanByIdServer(
      supabase,
      data.id
    );
  });

/**
 * Server function to update a single itinerary item.
 */
export const updateItineraryItemFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({
      itemId: z.string().uuid(),
      updates: z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        timeSlot: z.string().optional(),
        dayNumber: z.number().int().optional(),
        estimatedCost: z.number().optional(),
        notes: z.string().optional(),
        isBooked: z.boolean().optional(),
        orderIndex: z.number().int().optional(),
      }),
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    return await updateItineraryItemServer(
      context.supabase,
      context.userId,
      data.itemId,
      data.updates
    );
  });

/**
 * Server function to add an item to an itinerary.
 */
export const addItineraryItemFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({
      tripPlanId: z.string().uuid(),
      item: z.object({
        dayNumber: z.number().int(),
        timeSlot: z.string(),
        itemType: z.string(),
        title: z.string(),
        description: z.string().optional(),
        location: z.string().optional(),
        estimatedCost: z.number().default(0),
        serviceId: z.string().uuid().optional().nullable(),
        externalReferenceId: z.string().optional().nullable(),
        imageUrl: z.string().optional().nullable(),
        rating: z.number().optional().nullable(),
        bookingUrl: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
      }),
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    return await addItineraryItemServer(
      context.supabase,
      context.userId,
      data.tripPlanId,
      data.item
    );
  });

/**
 * Server function to delete an item from an itinerary.
 */
export const deleteItineraryItemFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({
      itemId: z.string().uuid(),
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    return await deleteItineraryItemServer(
      context.supabase,
      context.userId,
      data.itemId
    );
  });

/**
 * Server function to delete a whole trip plan.
 */
export const deleteTripPlanFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({
      tripPlanId: z.string().uuid(),
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    return await deleteTripPlanServer(
      context.supabase,
      context.userId,
      data.tripPlanId
    );
  });
