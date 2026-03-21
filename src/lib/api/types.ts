export type AdminRol = 'superadmin' | 'editor' | 'viewer';

export interface AdminUser {
  id: string;
  username: string;
  rol: AdminRol;
  nombre: string | null;
}

export interface ParticipantUser {
  id: string;
  email: string;
  fullName: string;
  occupation: string | null;
  organization: string | null;
  projectUrl: string | null;
  educationLevel: string | null;
  age: number | null;
  bio: string | null;
  avatarUrl: string | null;
  workshopCompleted: boolean;
  profileEnabled: boolean;
  recognitionEnabled: boolean;
  recognitionFolio: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AppBindings {
  DB: D1Database;
  MEDIA: R2Bucket;
  APP_SESSION: KVNamespace;
  PUBLIC_SITE_URL?: string;
  PUBLIC_SANITY_PROJECT_ID?: string;
  PUBLIC_SANITY_DATASET?: string;
  SANITY_API_VERSION?: string;
  SITE_NAME?: string;
  SITE_TAGLINE?: string;
}

export interface AppVariables {
  requestId: string;
  user?: AdminUser;
  participant?: ParticipantUser;
}

export interface SubmissionPayload {
  type: 'registration' | 'contact' | 'proposal';
  name: string;
  email: string;
  organization?: string;
  message?: string;
  metadata?: Record<string, unknown>;
}

export interface ParticipantSignupPayload {
  fullName: string;
  email: string;
  password: string;
  occupation?: string;
  organization?: string;
  projectUrl?: string;
  educationLevel?: string;
  age?: number | null;
}
