import React, { useState } from "react";
import { Upload, X } from "lucide-react";

interface ImageUploadProps {
  currentImage?: string;
  onImageSelect: (file: File) => void;
  onImageRemove?: () => void;
  label: string;
  className?: string;
}

export default function ImageUpload({
  currentImage,
  onImageSelect,
  onImageRemove,
  label,
  className = "",
}: ImageUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageSelect(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">{label}</label>

      {currentImage || previewUrl ? (
        <div className="relative w-full h-32">
          <img
            src={previewUrl || currentImage}
            alt={label}
            className="w-full h-full object-cover rounded-lg"
          />
          {onImageRemove && (
            <button
              onClick={onImageRemove}
              className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-md hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
          <div className="flex flex-col items-center justify-center pt-4 pb-4">
            <Upload className="w-6 h-6 text-gray-400" />
            <p className="mt-1 text-sm text-gray-500">
              Click to upload or drag and drop
            </p>
            <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
          </div>
          <input
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleFileSelect}
          />
        </label>
      )}
    </div>
  );
}
