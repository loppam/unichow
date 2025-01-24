import type { VercelRequest, VercelResponse } from "@vercel/node";
import sharp from "sharp";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.VITE_AWS_REGION!,
  credentials: {
    accessKeyId: process.env.VITE_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.VITE_AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.VITE_S3_BUCKET_NAME;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { file, path } = req.body;

    if (!file || !path) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(file, "base64");

    // Process image with sharp
    const optimized = await sharp(buffer)
      .resize(1200, 1200, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({
        quality: 80,
        progressive: true,
      })
      .toBuffer();

    // Upload to S3
    const putCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: path,
      Body: optimized,
      ContentType: "image/jpeg",
    });

    await s3Client.send(putCommand);

    // Generate signed URL for immediate access
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: path,
    });

    const url = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });

    res.status(200).json({ url });
  } catch (error: unknown) {
    console.error("Upload error:", error);
    res.status(500).json({
      error: "Failed to upload image",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
