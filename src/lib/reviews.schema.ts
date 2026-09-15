import { z } from "zod";

export const createReviewSchema = z.object({
  booking_id: z.string().uuid("Invalid booking ID"),
  service_id: z.string().uuid("Invalid service ID"),
  rating: z.number().int().min(1, "Rating must be at least 1 star").max(5, "Rating cannot exceed 5 stars"),
  title: z.string().trim().max(120, "Title cannot exceed 120 characters").optional(),
  comment: z.string().trim().min(3, "Comment must be at least 3 characters").max(2000, "Comment cannot exceed 2000 characters"),
  images: z.array(z.string().url("Invalid image URL")).max(5, "Maximum 5 photos allowed").optional(),
});

export const updateReviewSchema = z.object({
  id: z.string().uuid("Invalid review ID"),
  rating: z.number().int().min(1, "Rating must be at least 1 star").max(5, "Rating cannot exceed 5 stars"),
  title: z.string().trim().max(120, "Title cannot exceed 120 characters").optional(),
  comment: z.string().trim().min(3, "Comment must be at least 3 characters").max(2000, "Comment cannot exceed 2000 characters"),
  images: z.array(z.string().url("Invalid image URL")).max(5, "Maximum 5 photos allowed").optional(),
});

export const deleteReviewSchema = z.object({
  id: z.string().uuid("Invalid review ID"),
});

export const providerResponseSchema = z.object({
  review_id: z.string().uuid("Invalid review ID"),
  response: z.string().trim().min(2, "Response must be at least 2 characters").max(2000, "Response cannot exceed 2000 characters"),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
export type ProviderResponseInput = z.infer<typeof providerResponseSchema>;
