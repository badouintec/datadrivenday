export type AdminRol = 'superadmin' | 'editor' | 'viewer';

export interface AdminUser {
  id: string;
  username: string;
  rol: AdminRol;
  nombre: string | null;
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
  ADMIN_USER?: string;
  ADMIN_PASS_HASH?: string;
}

export interface AppVariables {
  requestId: string;
  user?: AdminUser;
}

export interface SubmissionPayload {
  type: 'registration' | 'contact' | 'proposal';
  name: string;
  email: string;
  organization?: string;
  message?: string;
  metadata?: Record<string, unknown>;
}
