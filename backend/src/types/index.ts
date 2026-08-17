// ─── Type Definitions ─────────────────────────────────────────────────────────

export type AdminRole = 'super_admin' | 'admin' | 'moderator' | 'support_agent' | 'support' | 'verification_officer' | 'content_manager' | 'finance_manager';

export interface Admin {
  uid: string;
  email: string;
  displayName: string;
  role: AdminRole;
  isActive: boolean;
  createdAt: FirebaseFirestore.Timestamp;
  lastLoginAt?: FirebaseFirestore.Timestamp;
  passwordHash?: string;
}

export interface AdminJwtPayload {
  uid: string;
  email: string;
  role: AdminRole;
  iat?: number;
  exp?: number;
}

export interface NikkahUser {
  uid: string;
  email?: string;
  displayName?: string;
  phoneNumber?: string;
  gender?: string;
  profileImage?: string;
  city?: string;
  country?: string;
  profession?: string;
  heightCm?: number;
  familyType?: string;
  sect?: string;
  ethnicity?: string;
  caste?: string;
  profileCompleted: boolean;
  profileStatus: 'pending' | 'approved' | 'rejected';
  photoStatus: 'none' | 'pending' | 'approved' | 'rejected';
  photoRejectionReason?: string;
  verificationStatus: 'none' | 'pending' | 'approved' | 'rejected';
  verificationDocType?: 'cnic' | 'passport' | 'video';
  isPremium: boolean;
  isVerified: boolean;
  isBanned: boolean;
  isSuspended: boolean;
  banReason?: string;
  createdAt: FirebaseFirestore.Timestamp;
  lastLoginAt?: FirebaseFirestore.Timestamp;
  passwordHash?: string;
}

export interface Report {
  id?: string;
  reporterId: string;
  reportedUserId: string;
  reason: string;
  description?: string;
  status: 'pending' | 'resolved' | 'dismissed';
  resolvedBy?: string;
  resolvedAt?: FirebaseFirestore.Timestamp;
  createdAt: FirebaseFirestore.Timestamp;
}

export interface AuditLog {
  id?: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetId: string;
  targetType: 'user' | 'photo' | 'verification' | 'report' | 'setting';
  details: Record<string, unknown>;
  timestamp: FirebaseFirestore.Timestamp | Date | FirebaseFirestore.FieldValue;
  ip: string;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  filter?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
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

