import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { uploadToCloudinaryServer } from "./cloudinary.server";

export const uploadCloudinaryImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z.object({
      fileData: z.string().min(1, "File data is required"),
      folder: z.string().optional().default("travezy/services"),
      mimeType: z.string().optional(),
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    // User must be authenticated to upload assets
    if (!context.userId) {
      throw new Error("Unauthorized: Please sign in to upload images.");
    }

    const result = await uploadToCloudinaryServer({
      fileData: data.fileData,
      folder: data.folder,
      mimeType: data.mimeType,
    });

    return result;
  });
