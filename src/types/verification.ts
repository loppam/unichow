export interface VerificationDocument {
  id: string;
  type: 'business_license' | 'food_permit' | 'identity' | 'other';
  status: 'pending' | 'approved' | 'rejected';
  fileUrl: string;
  fileName: string;
  uploadedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  expiryDate?: string;
}

export interface VerificationStatus {
  isVerified: boolean;
  pendingDocuments?: string[];
  state: 'approved' | 'rejected' | 'pending';
} 