import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "../config/aws";
import axios from "axios";

const BUCKET_NAME = import.meta.env.VITE_S3_BUCKET_NAME;

// Configure axios with the Vercel URL or fallback to local
const API_URL = import.meta.env.VITE_VERCEL_URL || "http://localhost:3000";
axios.defaults.baseURL = API_URL;

export const s3Service = {
  async uploadImage(file: File, path: string): Promise<string> {
    try {
      // Convert file to base64
      const base64 = await fileToBase64(file);

      // Send to API endpoint
      const response = await axios.post("/api/upload", {
        file: base64,
        path: path,
      });

      // Store just the path instead of the full signed URL
      return path;
    } catch (error) {
      console.error("Upload error:", error);
      throw new Error("Failed to upload image");
    }
  },

  async generateThumbnail(file: File): Promise<Blob> {
    // For thumbnails, you might want to create a separate endpoint
    // or handle it differently
    return file;
  },

  async deleteImage(path: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: path,
    });
    await s3Client.send(command);
  },

  async getSignedUrl(path: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: path,
    });
    return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  },
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
  });
}
