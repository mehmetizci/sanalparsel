import { createClient } from "@supabase/supabase-js";

/**
 * Get Supabase credentials for server-side operations
 */
export function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || "";
}

export function getSupabaseServiceRoleKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

/**
 * Create a Supabase client with service role key for admin operations
 * This should only be used in server-side API routes
 */
export function createServerClient() {
  const url = getSupabaseUrl();
  const serviceKey = getSupabaseServiceRoleKey();
  
  if (!url || !serviceKey) {
    throw new Error("Supabase environment variables are not configured");
  }
  
  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Create a Supabase client with anon key for public operations
 * Used for verifying public access
 */
export function createPublicClient() {
  const url = getSupabaseUrl();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  
  if (!url || !anonKey) {
    throw new Error("Supabase environment variables are not configured");
  }
  
  return createClient(url, anonKey);
}