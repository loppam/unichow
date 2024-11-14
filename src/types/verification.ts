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
  documentsSubmitted: boolean;
  pendingDocuments: string[];
  rejectedDocuments: string[];
  lastUpdated: string;
} 