import sharp from 'sharp';
import { storage } from '../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const imageService = {
  async optimizeAndUpload(file: File, path: string): Promise<string> {
    const buffer = await file.arrayBuffer();
    
    // Optimize image
    const optimized = await sharp(buffer)
      .resize(1200, 1200, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({
        quality: 80,
        progressive: true
      })
      .toBuffer();

    // Upload to Firebase Storage
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, optimized);
    
    return getDownloadURL(storageRef);
  },

  async generateThumbnail(file: File): Promise<Blob> {
    const buffer = await file.arrayBuffer();
    
    const thumbnail = await sharp(buffer)
      .resize(200, 200, {
        fit: 'cover'
      })
      .jpeg({
        quality: 60
      })
      .toBuffer();

    return new Blob([thumbnail], { type: 'image/jpeg' });
  }
}; 