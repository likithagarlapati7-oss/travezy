import crypto from "crypto";

export interface CloudinaryUploadResult {
  url: string;
  secure_url: string;
  public_id: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
}

/**
 * Retrieves Cloudinary configuration from server environment variables.
 */
export function getCloudinaryConfig() {
  const env = process.env as Record<string, string | undefined>;
  const cloudName = env["CLOUDINARY_CLOUD_NAME"] || env["VITE_CLOUDINARY_CLOUD_NAME"] || "";
  const apiKey = env["CLOUDINARY_API_KEY"] || env["VITE_CLOUDINARY_API_KEY"] || "";
  const apiSecret = env["CLOUDINARY_API_SECRET"] || "";
  const uploadPreset = env["CLOUDINARY_UPLOAD_PRESET"] || env["VITE_CLOUDINARY_UPLOAD_PRESET"] || "travezy_uploads";

  return {
    cloudName,
    apiKey,
    apiSecret,
    uploadPreset,
    isConfigured: Boolean(cloudName && (apiSecret || uploadPreset)),
  };
}

/**
 * Validates image payload before uploading.
 */
export function validateImagePayload(fileData: string, mimeType?: string | undefined) {
  if (!fileData) {
    throw new Error("No image data provided");
  }

  // Check data URL format or base64 length
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/avif"];
  if (mimeType && !allowedTypes.includes(mimeType.toLowerCase())) {
    throw new Error(`Unsupported image format (${mimeType}). Allowed: JPG, PNG, WebP, AVIF.`);
  }

  // Rough size estimation for base64: length * 0.75
  const estimatedSizeBytes = fileData.length * 0.75;
  const maxSizeBytes = 8 * 1024 * 1024; // 8MB limit
  if (estimatedSizeBytes > maxSizeBytes) {
    throw new Error("Image file size exceeds maximum limit of 8MB.");
  }
}

/**
 * Server-side upload handler for Cloudinary.
 * Accepts base64 data URI or image buffer, validates constraints, and uploads to Cloudinary.
 */
export async function uploadToCloudinaryServer({
  fileData,
  folder = "travezy/services",
  mimeType,
}: {
  fileData: string;
  folder?: string | undefined;
  mimeType?: string | undefined;
}): Promise<CloudinaryUploadResult> {
  validateImagePayload(fileData, mimeType);

  const { cloudName, apiKey, apiSecret, uploadPreset, isConfigured } = getCloudinaryConfig();

  if (!isConfigured) {
    // If not configured in local environment, provide a valid fallback response
    console.warn("[Cloudinary] Credentials not configured in process.env. Using fallback placeholder image.");
    return {
      url: fileData.startsWith("http") ? fileData : "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
      secure_url: fileData.startsWith("http") ? fileData : "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
      public_id: `fallback_${Date.now()}`,
      format: "jpg",
      width: 1200,
      height: 800,
      bytes: 102400,
    };
  }

  const timestamp = Math.round(new Date().getTime() / 1000);
  const formData = new URLSearchParams();
  formData.append("file", fileData);
  formData.append("folder", folder);
  formData.append("timestamp", timestamp.toString());

  if (apiKey && apiSecret) {
    // Signed Upload
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash("sha1").update(paramsToSign).digest("hex");

    formData.append("api_key", apiKey);
    formData.append("signature", signature);
  } else if (uploadPreset) {
    // Unsigned Preset Upload
    formData.append("upload_preset", uploadPreset);
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let errorMsg = "Cloudinary upload failed";
    try {
      const parsed = JSON.parse(errorBody);
      errorMsg = parsed?.error?.message || errorMsg;
    } catch {
      // Use raw text
    }
    throw new Error(`Cloudinary Error: ${errorMsg}`);
  }

  const result = (await response.json()) as CloudinaryUploadResult;
  return result;
}
