import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  checkInCheckOutSchema,
  hotelAvailabilityQuerySchema,
  hotelCashConfirmSchema,
  hotelInputSchema,
  reservationStatusUpdateSchema,
  roomInputSchema,
} from "./hotels.schema";
import {
  confirmHotelCashPaymentServer,
  createHotelServer,
  createRoomServer,
  getHotelAvailabilityServer,
  getHotelRoomsServer,
  getVerifierFinancialsServer,
  getVerifierGuestsServer,
  getVerifierHotelsServer,
  getVerifierReservationsServer,
  processCheckInCheckOutServer,
  updateHotelServer,
  updateReservationStatusServer,
  updateRoomServer,
} from "./hotels.server";

export const getVerifierHotels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    return await getVerifierHotelsServer(context.supabase, context.userId);
  });

export const createHotel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => hotelInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    return await createHotelServer(context.supabase, context.userId, data);
  });

export const updateHotel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => hotelInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    return await updateHotelServer(context.supabase, context.userId, data);
  });

export const getHotelRooms = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ hotel_id: z.string().uuid().optional() }).optional().parse(data)
  )
  .handler(async ({ data, context }) => {
    return await getHotelRoomsServer(context.supabase, data?.hotel_id);
  });

export const createHotelRoom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => roomInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    return await createRoomServer(context.supabase, context.userId, data);
  });

export const updateHotelRoom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => roomInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    return await updateRoomServer(context.supabase, context.userId, data);
  });

export const getVerifierReservations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ status: z.string().optional() }).optional().parse(data)
  )
  .handler(async ({ data, context }) => {
    return await getVerifierReservationsServer(context.supabase, context.userId, data?.status);
  });

export const updateReservationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => reservationStatusUpdateSchema.parse(data))
  .handler(async ({ data, context }) => {
    return await updateReservationStatusServer(context.supabase, context.userId, data);
  });

export const processCheckInCheckOut = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => checkInCheckOutSchema.parse(data))
  .handler(async ({ data, context }) => {
    return await processCheckInCheckOutServer(context.supabase, context.userId, data);
  });

export const getVerifierGuests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ query: z.string().optional() }).optional().parse(data)
  )
  .handler(async ({ data, context }) => {
    return await getVerifierGuestsServer(context.supabase, context.userId, data?.query);
  });

export const getHotelAvailability = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => hotelAvailabilityQuerySchema.parse(data))
  .handler(async ({ data, context }) => {
    return await getHotelAvailabilityServer(
      context.supabase,
      data.hotel_id,
      data.start_date,
      data.end_date,
    );
  });

export const getVerifierFinancials = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    return await getVerifierFinancialsServer(context.supabase, context.userId);
  });

export const confirmHotelCashPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => hotelCashConfirmSchema.parse(data))
  .handler(async ({ data, context }) => {
    return await confirmHotelCashPaymentServer(
      context.supabase,
      context.userId,
      data.reservation_id,
      data.amount_received,
    );
  });
