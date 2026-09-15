import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Image as ImageIcon, Link as LinkIcon, Loader2, Trash2, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadCloudinaryImage } from "@/lib/cloudinary.functions";
import { cn } from "@/lib/utils";

export interface CloudinaryImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  className?: string;
  label?: string;
}

export function CloudinaryImageUpload({
  value,
  onChange,
  folder = "travezy/services",
  className,
  label = "Service Image",
}: CloudinaryImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [showUrlInput, setShowUrlInput] = useState<boolean>(false);
  const [urlDraft, setUrlDraft] = useState("");

  const uploadFn = useServerFn(uploadCloudinaryImage);

  const uploadMutation = useMutation({
    mutationFn: async ({ fileData, mimeType }: { fileData: string; mimeType: string }) => {
      return await uploadFn({
        data: {
          fileData,
          folder,
          mimeType,
        },
      });
    },
    onSuccess: (res) => {
      onChange(res.secure_url || res.url);
      toast.success("Image uploaded successfully!");
    },
    onError: (err: any) => {
      console.error("[Image Upload Error]", err);
      toast.error(err.message || "Failed to upload image. Please try again.");
    },
  });

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (JPG, PNG, WebP, AVIF).");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      toast.error("File size exceeds 8MB limit.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      uploadMutation.mutate({ fileData: base64, mimeType: file.type });
    };
    reader.onerror = () => {
      toast.error("Failed to read file.");
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0 && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </label>
        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
        >
          {showUrlInput ? (
            <>
              <UploadCloud className="size-3.5" /> Upload File
            </>
          ) : (
            <>
              <LinkIcon className="size-3.5" /> Enter Image URL
            </>
          )}
        </button>
      </div>

      {showUrlInput ? (
        <div className="flex gap-2">
          <Input
            value={urlDraft || value}
            onChange={(e) => {
              setUrlDraft(e.target.value);
              onChange(e.target.value);
            }}
            placeholder="https://images.unsplash.com/photo-..."
            className="h-11 rounded-xl text-sm"
          />
          {value && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Clear image URL"
              onClick={() => {
                setUrlDraft("");
                onChange("");
              }}
              className="rounded-xl shrink-0"
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          )}
        </div>
      ) : value ? (
        /* Image Preview Box */
        <div className="relative group overflow-hidden rounded-2xl border border-border bg-muted/30 aspect-16/9 max-h-56">
          <img
            src={value}
            alt="Uploaded listing preview"
            className="size-full object-cover rounded-2xl transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80";
            }}
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-xs">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="rounded-full shadow-lg gap-1.5"
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadCloud className="size-4" /> Replace
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              className="rounded-full shadow-lg gap-1.5"
              onClick={() => onChange("")}
            >
              <Trash2 className="size-4" /> Remove
            </Button>
          </div>
        </div>
      ) : (
        /* Drag and drop upload zone */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-2",
            isDragging
              ? "border-primary bg-primary/5 scale-[0.99]"
              : "border-border hover:border-primary/50 hover:bg-muted/30",
            uploadMutation.isPending && "pointer-events-none opacity-70",
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileSelect(e.target.files[0]);
              }
            }}
          />

          {uploadMutation.isPending ? (
            <div className="flex flex-col items-center gap-2 py-4">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-xs font-semibold text-foreground">Uploading to Cloudinary…</p>
              <p className="text-[11px] text-muted-foreground">Optimizing and securing asset</p>
            </div>
          ) : (
            <>
              <div className="grid size-12 place-items-center rounded-2xl bg-secondary text-primary shadow-xs">
                <UploadCloud className="size-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  JPG, PNG, WebP or AVIF (Max 5MB)
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
