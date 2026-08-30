// ============================================
// Glow Studio by Sofia — API Environment Variables Typing
// ============================================

declare namespace NodeJS {
  interface ProcessEnv {
    readonly PORT?: string;
    readonly NODE_ENV?: 'development' | 'production' | 'test';
    readonly DATABASE_URL?: string;
    readonly BOT_URL?: string;
    readonly BOT_API_KEY?: string;
    readonly API_SECRET_KEY?: string;
    readonly SESSION_SECRET?: string;
    readonly SALON_WHATSAPP?: string;
    readonly FRONTEND_URL?: string;
    readonly META_WEBHOOK_VERIFY_TOKEN?: string;
    readonly META_APP_SECRET?: string;
    readonly INSTAGRAM_ACCESS_TOKEN?: string;
    readonly GOOGLE_CLIENT_ID?: string;
    readonly GOOGLE_CLIENT_SECRET?: string;
    readonly GOOGLE_REDIRECT_URI?: string;
    readonly GOOGLE_REFRESH_TOKEN?: string;
  }
}
