import { s3Service } from "./s3Service";

export const imageService = {
  async optimizeAndUpload(file: File, path: string): Promise<string> {
    return await s3Service.uploadImage(file, path);
  },

  async generateThumbnail(file: File): Promise<Blob> {
    return await s3Service.generateThumbnail(file);
  },
};
