export interface VerificationDocument {
  id: string;
  type:
    | "business_license"
    | "food_permit"
    | "identity"
    | "drivers_license"
    | "vehicle_registration"
    | "insurance"
    | "other";
  status: "pending" | "approved" | "rejected";
  fileUrl: string;
  fileName: string;
  uploadedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  expiryDate?: string;
  s3Path?: string;
}

export interface VerificationStatus {
  isVerified: boolean;
  documentsSubmitted: boolean;
  pendingDocuments: string[];
  rejectedDocuments: string[];
  lastUpdated: string;
}

export interface RiderVerification {
  riderId: string;
  riderName: string;
  email: string;
  phone?: string;
  vehicleType: string;
  vehiclePlate: string;
  status: {
    isVerified: boolean;
    state?: "pending" | "approved" | "rejected";
  };
  documents: VerificationDocument[];
}
