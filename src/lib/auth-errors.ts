/**
 * Tek noktadan Supabase auth hatalarını Türkçeleştirir ve config
 * sorunlarını teşhis eder. UI tarafında doğrudan kullanıcıya
 * gösterilebilecek metinler döner.
 */
export function translateAuthError(error: unknown): string {
  if (!error) return "Bilinmeyen bir hata oluştu.";

  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : (error as { message?: string })?.message || "";
  const code = (error as { code?: string })?.code || "";
  const status = (error as { status?: number })?.status;

  // Network / yapılandırma hataları
  if (
    message.includes("Failed to fetch") ||
    message.includes("NetworkError") ||
    message.includes("fetch failed") ||
    message.includes("placeholder.supabase.co")
  ) {
    return "Supabase sunucusuna ulaşılamadı. Vercel ortam değişkenleri (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY) eksik veya hatalı olabilir.";
  }

  if (status === 401 && message.toLowerCase().includes("invalid api key")) {
    return "Supabase API anahtarı geçersiz. Vercel ortam değişkenlerini kontrol edin.";
  }

  // Supabase auth hata kodları
  switch (code) {
    case "invalid_credentials":
      return "E-posta veya şifre hatalı. Lütfen tekrar deneyin.";
    case "email_not_confirmed":
      return "E-posta adresiniz henüz doğrulanmadı. Gelen kutunuzu kontrol edin.";
    case "user_already_exists":
    case "email_exists":
      return "Bu e-posta adresi zaten kayıtlı. Giriş yapmayı deneyin.";
    case "weak_password":
      return "Şifre çok zayıf. En az 6 karakter, harf ve rakam içermelidir.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar deneyin.";
    case "signup_disabled":
      return "Yeni kayıtlar şu anda kapalı.";
  }

  // Mesaj bazlı eşleşmeler (kod yoksa)
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "E-posta veya şifre hatalı. Lütfen tekrar deneyin.";
  }
  if (lower.includes("email not confirmed")) {
    return "E-posta adresiniz henüz doğrulanmadı. Gelen kutunuzu kontrol edin.";
  }
  if (lower.includes("user already registered")) {
    return "Bu e-posta adresi zaten kayıtlı. Giriş yapmayı deneyin.";
  }

  return message || "Beklenmeyen bir hata oluştu.";
}
