// ─── Type Definitions ─────────────────────────────────────────────────────────────

export type AdminRole = 
  | 'super_admin' 
  | 'admin' 
  | 'moderator' 
  | 'verification_staff' 
  | 'support_staff' 
  | 'content_moderator' 
  | 'analyst';

export type AdminPermission =
  | '*'
  | 'users.view'
  | 'users.manage'
  | 'profiles.view'
  | 'profiles.manage'
  | 'photos.view'
  | 'photos.approve'
  | 'photos.reject'
  | 'verification.view'
  | 'verification.approve'
  | 'verification.reject'
  | 'reports.view'
  | 'reports.manage'
  | 'support.view'
  | 'support.respond'
  | 'support.manage'
  | 'chat_moderation.view'
  | 'chat_moderation.manage'
  | 'connections.view'
  | 'subscriptions.view'
  | 'subscriptions.manage'
  | 'notifications.view'
  | 'notifications.send'
  | 'analytics.view'
  | 'audit_logs.view'
  | 'admins.view'
  | 'admins.create'
  | 'admins.update'
  | 'admins.disable'
  | 'admins.delete'
  | 'roles.view'
  | 'roles.manage'
  | 'content.view'
  | 'content.create'
  | 'content.update'
  | 'content.publish'
  | 'content.delete'
  | 'settings.view'
  | 'settings.manage';

export const ALL_ADMIN_PERMISSIONS: AdminPermission[] = [
  'users.view',
  'users.manage',
  'profiles.view',
  'profiles.manage',
  'photos.view',
  'photos.approve',
  'photos.reject',
  'verification.view',
  'verification.approve',
  'verification.reject',
  'reports.view',
  'reports.manage',
  'support.view',
  'support.respond',
  'support.manage',
  'chat_moderation.view',
  'chat_moderation.manage',
  'connections.view',
  'subscriptions.view',
  'subscriptions.manage',
  'notifications.view',
  'notifications.send',
  'analytics.view',
  'audit_logs.view',
  'admins.view',
  'admins.create',
  'admins.update',
  'admins.disable',
  'admins.delete',
  'roles.view',
  'roles.manage',
  'content.view',
  'content.create',
  'content.update',
  'content.publish',
  'content.delete',
  'settings.view',
  'settings.manage',
];

export const ROLE_DEFAULT_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  super_admin: ['*'],
  admin: [
    'users.view',
    'users.manage',
    'profiles.view',
    'profiles.manage',
    'photos.view',
    'photos.approve',
    'photos.reject',
    'verification.view',
    'verification.approve',
    'verification.reject',
    'reports.view',
    'reports.manage',
    'support.view',
    'support.respond',
    'support.manage',
    'chat_moderation.view',
    'chat_moderation.manage',
    'connections.view',
    'subscriptions.view',
    'subscriptions.manage',
    'notifications.view',
    'notifications.send',
    'analytics.view',
    'audit_logs.view',
    'content.view',
    'content.create',
    'content.update',
    'content.publish',
    'content.delete',
    'settings.view',
  ],
  moderator: [
    'users.view',
    'profiles.view',
    'photos.view',
    'photos.approve',
    'photos.reject',
    'reports.view',
    'reports.manage',
    'chat_moderation.view',
    'chat_moderation.manage',
    'audit_logs.view',
  ],
  verification_staff: [
    'verification.view',
    'verification.approve',
    'verification.reject',
    'users.view',
    'profiles.view',
    'audit_logs.view',
  ],
  support_staff: [
    'support.view',
    'support.respond',
    'support.manage',
    'users.view',
    'profiles.view',
    'chat_moderation.view',
  ],
  content_moderator: [
    'content.view',
    'content.create',
    'content.update',
    'content.publish',
    'photos.view',
    'photos.approve',
    'photos.reject',
    'reports.view',
    'chat_moderation.view',
    'chat_moderation.manage',
  ],
  analyst: [
    'analytics.view',
    'users.view',
    'profiles.view',
    'photos.view',
    'verification.view',
    'reports.view',
    'connections.view',
    'subscriptions.view',
  ],
};

export interface Admin {
  uid: string;
  email: string;
  displayName: string;
  role: AdminRole;
  permissions?: AdminPermission[];
  isActive: boolean;
  createdAt: FirebaseFirestore.Timestamp;
  lastLoginAt?: FirebaseFirestore.Timestamp;
  passwordHash?: string;
}

export interface AdminJwtPayload {
  uid: string;
  email: string;
  role: AdminRole;
  permissions?: AdminPermission[];
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
  targetType: 'user' | 'photo' | 'verification' | 'report' | 'setting' | 'admin' | 'legal_document' | 'notification';
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

export interface LegalDocument {
  id: string;
  title: string;
  slug: string;
  content: string;
  publishedContent?: string;
  status: 'draft' | 'published' | 'unpublished';
  version: number;
  publishedVersion?: number;
  summary?: string;
  updatedBy: string;
  createdAt: any;
  updatedAt: any;
  publishedAt?: any;
}

export interface LegalDocumentVersion {
  id?: string;
  version: number;
  publishedVersion?: number;
  title: string;
  content: string;
  status: 'draft' | 'published' | 'unpublished';
  changeLog?: string;
  createdBy: string;
  createdAt: any;
}
