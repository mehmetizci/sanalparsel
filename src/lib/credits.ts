import { createClient } from "./supabase";

/**
 * Get current credits for a user
 */
export async function getCredits(userId: string): Promise<number> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("user_profiles")
    .select("credits")
    .eq("user_id", userId)
    .single();
  
  if (error) {
    console.error("Error fetching credits:", error);
    return 5; // Default value
  }
  
  return data?.credits ?? 5;
}

/**
 * Deduct credits when user downloads a video
 * Returns true if successful, false if insufficient credits
 */
export async function deductCredit(userId: string, amount: number = 1): Promise<{ success: boolean; remaining: number }> {
  const supabase = createClient();
  
  // First check current credits
  const currentCredits = await getCredits(userId);
  
  if (currentCredits < amount) {
    return { success: false, remaining: currentCredits };
  }
  
  // Deduct credits using RPC function
  const { data, error } = await supabase.rpc("deduct_user_credits", {
    user_uuid: userId,
    amount: amount,
  });
  
  if (error) {
    console.error("Error deducting credits:", error);
    return { success: false, remaining: currentCredits };
  }
  
  // Get updated credits
  const remainingCredits = await getCredits(userId);
  return { success: true, remaining: remainingCredits };
}

/**
 * Add credits after purchase (for iyzico integration)
 */
export async function addCredits(userId: string, amount: number): Promise<{ success: boolean; total: number }> {
  const supabase = createClient();
  
  // Get current credits first
  const currentCredits = await getCredits(userId);
  
  // Add credits using RPC function
  const { error } = await supabase.rpc("add_user_credits", {
    user_uuid: userId,
    amount: amount,
  });
  
  if (error) {
    console.error("Error adding credits:", error);
    return { success: false, total: currentCredits };
  }
  
  // Get updated credits
  const newCredits = await getCredits(userId);
  return { success: true, total: newCredits };
}

/**
 * Check if user has enough credits
 */
export async function hasEnoughCredits(userId: string, amount: number = 1): Promise<boolean> {
  const credits = await getCredits(userId);
  return credits >= amount;
}
