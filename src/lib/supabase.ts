import { createBrowserClient } from "@supabase/ssr";

const PLACEHOLDER_URL = "https://placeholder.supabase.co";
const PLACEHOLDER_KEY = "placeholder";

export function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || PLACEHOLDER_URL;
}

export function getSupabaseAnonKey(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || PLACEHOLDER_KEY;
}

/**
 * Supabase'in geçerli bir URL ve key ile yapılandırılıp yapılandırılmadığını
 * döner. Build sırasında env eksik olduğunda placeholder'lar bundle'a
 * gömüldüğü için bu kontrol UI'da config uyarısı göstermek için kullanılır.
 */
export function isSupabaseConfigured(): boolean {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  return (
    url !== PLACEHOLDER_URL &&
    key !== PLACEHOLDER_KEY &&
    /^https?:\/\//.test(url) &&
    key.length > 20
  );
}

export function createClient() {
  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
}
