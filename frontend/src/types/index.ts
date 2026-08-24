export type AdminRole = 'super_admin' | 'admin' | 'moderator' | 'support_agent' | 'verification_officer' | 'content_manager' | 'finance_manager';

export interface Admin {
  uid: string;
  email: string;
  displayName: string;
  role: AdminRole;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface NikkahUser {
  uid: string;
  email?: string;
  displayName?: string;
  phoneNumber?: string;
  gender?: string;
  profileImage?: string;
  pendingProfileImage?: string;
  city?: string;
  country?: string;
  profession?: string;
  profileCompleted: boolean;
  profileStatus: 'pending' | 'approved' | 'rejected';
  photoStatus: 'none' | 'pending' | 'approved' | 'rejected';
  pendingGalleryImages?: string[]; // Gallery images awaiting moderation (uploaded via edit_profile_screen)
  photoRejectionReason?: string;
  verificationStatus: 'none' | 'pending' | 'approved' | 'rejected';
  verificationDocType?: 'cnic' | 'passport' | 'video';
  verificationDocUrl?: string;
  verificationVideoUrl?: string;
  isPremium: boolean;
  isVerified: boolean;
  isBanned: boolean;
  isSuspended: boolean;
  banReason?: string;
  createdAt?: string;
  lastLoginAt?: string;
}

export interface Report {
  id: string;
  userId: string;
  reporterId?: string;
  reportedUserId?: string;
  reason?: string;
  userEmail?: string;
  userDisplayName?: string;
  category: string;
  description?: string;
  status: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetId: string;
  targetType: 'user' | 'photo' | 'verification' | 'report' | 'setting';
  details: Record<string, any>;
  timestamp: string;
  ip: string;
}

export interface AppSettings {
  maintenanceMode: boolean;
  premiumMonthlyPrice: number;
  premiumYearlyPrice: number;
  maxPhotosPerUser: number;
  allowRegistration: boolean;
  requireEmailVerification: boolean;
  matchingEnabled: boolean;
  chatEnabled: boolean;
  maxMatchDistanceKm?: number;
  enforceGenderMatching?: boolean;
  featureFlags: Record<string, boolean>;
}

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  todaySignups: number;
  premiumUsers: number;
  pendingVerifications: number;
  pendingPhotos: number;
  pendingReports: number;
  bannedUsers: number;
}



