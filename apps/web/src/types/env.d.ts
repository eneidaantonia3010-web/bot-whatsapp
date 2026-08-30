// ============================================
// Glow Studio by Sofia — Web Environment Variables Typing
// ============================================

declare namespace NodeJS {
  interface ProcessEnv {
    readonly NEXT_PUBLIC_API_URL?: string;
    readonly NEXT_PUBLIC_APP_URL?: string;
    readonly DATABASE_URL?: string;
    readonly NEXTAUTH_URL?: string;
    readonly NEXTAUTH_SECRET?: string;
    readonly NODE_ENV?: 'development' | 'production' | 'test';
  }
}
