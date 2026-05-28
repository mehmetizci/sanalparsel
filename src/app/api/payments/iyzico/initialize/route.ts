import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-admin";
import { createHmac, randomBytes } from "crypto";

// Package definitions
const PACKAGES = {
  starter: { credits: 1, price: 149, name: "SanalParsel 1 Video Kredisi" },
  standard: { credits: 5, price: 599, name: "SanalParsel 5 Video Kredisi" },
  pro: { credits: 10, price: 999, name: "SanalParsel 10 Video Kredisi" },
} as const;

type PackageId = keyof typeof PACKAGES;

// Helper function to normalize Turkish phone numbers
function normalizeTurkishPhone(phone: string): string | undefined {
  if (!phone) return undefined;
  
  // Extract only digits
  const digits = phone.replace(/\D/g, "");
  
  // Already correct format: +905XXXXXXXXX (12 digits starting with 90)
  if (digits.startsWith("90") && digits.length === 12) {
    return `+${digits}`;
  }
  
  // Starts with 0: 05XXXXXXXXX (11 digits)
  if (digits.startsWith("0") && digits.length === 11) {
    return `+9${digits}`;
  }
  
  // No leading 0: 5XXXXXXXXX (10 digits)
  if (digits.length === 10 && digits.startsWith("5")) {
    return `+90${digits}`;
  }
  
  return undefined;
}

// Get app URL with fallback
function getAppUrl(): string {
  return (
    process.env.PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://sanalparsel.onrender.com"
  );
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check user profile completeness
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("full_name, phone, city, district")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profil bilgileriniz eksik. Lütfen önce profilinizi tamamlayın.", redirectTo: "/profile" },
        { status: 400 }
      );
    }

    const missingFields: string[] = [];
    if (!profile.full_name || profile.full_name.trim() === "") missingFields.push("Ad Soyad");
    if (!profile.phone || profile.phone.trim() === "") missingFields.push("Telefon");
    if (!profile.city || profile.city.trim() === "") missingFields.push("Şehir");
    if (!profile.district || profile.district.trim() === "") missingFields.push("İlçe");

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Profil bilgileriniz eksik: ${missingFields.join(", ")}. Lütfen önce profilinizi tamamlayın.`, redirectTo: "/profile" },
        { status: 400 }
      );
    }

    // Validate callback URL
    const appUrl = getAppUrl();
    const callbackUrl = `${appUrl}/api/payments/iyzico/callback`;
    
    if (!callbackUrl.startsWith("https://")) {
      return NextResponse.json(
        { error: "PUBLIC_APP_URL tanımlı değil veya geçersiz" },
        { status: 500 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { packageId } = body as { packageId: PackageId };

    if (!packageId || !PACKAGES[packageId]) {
      return NextResponse.json(
        { error: "Geçersiz paket seçimi" },
        { status: 400 }
      );
    }

    const pkg = PACKAGES[packageId];

    // Create pending payment order in Supabase
    const { data: order, error: orderError } = await supabase
      .from("payment_orders")
      .insert({
        user_id: user.id,
        package_id: packageId,
        credit_amount: pkg.credits,
        price: pkg.price,
        currency: "TRY",
        status: "pending",
      })
      .select()
      .single();

    if (orderError) {
      console.error("Error creating payment order:", orderError);
      return NextResponse.json(
        { error: "Sipariş oluşturulamadı" },
        { status: 500 }
      );
    }

    // Get client IP from headers
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() 
      || request.headers.get("x-real-ip") 
      || "85.34.78.112";

    // Initialize iyzico Checkout Form
    const iyzicoResponse = await initializeIyzicoCheckout({
      orderId: order.id,
      userId: user.id,
      userEmail: user.email || "",
      userFullName: profile.full_name,
      userPhone: profile.phone,
      userCity: profile.city,
      userDistrict: profile.district,
      packageName: pkg.name,
      packageId: packageId,
      price: pkg.price,
      callbackUrl,
      clientIp,
    });

    if (!iyzicoResponse.success || !iyzicoResponse.paymentPageUrl) {
      await supabase
        .from("payment_orders")
        .update({ status: "failed" })
        .eq("id", order.id);

      return NextResponse.json(
        { error: iyzicoResponse.error || "Ödeme başlatılamadı" },
        { status: 500 }
      );
    }

    await supabase
      .from("payment_orders")
      .update({ iyzico_token: iyzicoResponse.token })
      .eq("id", order.id);

    return NextResponse.json({
      success: true,
      paymentPageUrl: iyzicoResponse.paymentPageUrl,
      orderId: order.id,
    });
  } catch (error) {
    console.error("Initialize payment error:", error);
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}

interface IyzicoInitResponse {
  success: boolean;
  token?: string;
  paymentPageUrl?: string;
  error?: string;
}

async function initializeIyzicoCheckout(params: {
  orderId: string;
  userId: string;
  userEmail: string;
  userFullName: string;
  userPhone: string;
  userCity: string;
  userDistrict: string;
  packageName: string;
  packageId: string;
  price: number;
  callbackUrl: string;
  clientIp: string;
}): Promise<IyzicoInitResponse> {
  const apiKey = process.env.IYZICO_API_KEY;
  const secretKey = process.env.IYZICO_SECRET_KEY;
  const baseUrl = process.env.IYZICO_BASE_URL || "https://sandbox-api.iyzipay.com";

  const hasApiKey = !!apiKey;
  const hasSecretKey = !!secretKey;
  const isSandbox = baseUrl.includes("sandbox");

  console.log("iyzico initialize:", {
    endpoint: `${baseUrl}/payment/iyzipos/checkoutform/initialize/auth/ecom`,
    hasApiKey,
    hasSecretKey,
    keyMode: isSandbox ? "sandbox" : "production",
    callbackUrl: params.callbackUrl,
  });

  if (!apiKey || !secretKey) {
    console.error("Missing iyzico credentials");
    return { success: false, error: "Ödeme sistemi yapılandırılmamış" };
  }

  try {
    // Generate random string for x-iyzi-rnd
    const randomString = randomBytes(16).toString("hex");
    
    // Format price as string with 2 decimal places
    const formattedPrice = params.price.toFixed(2);
    
    // Split user name into first name and surname
    const nameParts = params.userFullName.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : nameParts[0];

    // Normalize phone number
    const normalizedPhone = normalizeTurkishPhone(params.userPhone);
    console.log("iyzico phone:", {
      original: params.userPhone,
      normalized: normalizedPhone || "[NOT_VALID]",
    });

    // Build buyer object - only include gsmNumber if phone is valid
    const buyer: Record<string, string> = {
      id: params.userId,
      name: firstName,
      surname: lastName,
      email: params.userEmail,
      identityNumber: "11111111111",
      registrationAddress: `${params.userDistrict}, ${params.userCity}, Turkey`,
      city: params.userCity,
      country: "Turkey",
      zipCode: "34000",
      ip: params.clientIp,
    };
    
    if (normalizedPhone) {
      buyer.gsmNumber = normalizedPhone;
    }

    // Build request body
    const requestBody = {
      locale: "tr",
      conversationId: params.orderId,
      price: formattedPrice,
      paidPrice: formattedPrice,
      currency: "TRY",
      basketId: params.orderId,
      paymentGroup: "PRODUCT",
      callbackUrl: params.callbackUrl,
      enabledInstallments: [1],
      paymentSource: "GROW",
      buyer,
      shippingAddress: {
        contactName: `${firstName} ${lastName}`,
        city: params.userCity,
        country: "Turkey",
        address: `${params.userDistrict}, ${params.userCity}, Turkey`,
        zipCode: "34000",
      },
      billingAddress: {
        contactName: `${firstName} ${lastName}`,
        city: params.userCity,
        country: "Turkey",
        address: `${params.userDistrict}, ${params.userCity}, Turkey`,
        zipCode: "34000",
      },
      basketItems: [
        {
          id: params.packageId,
          name: params.packageName,
          category1: "Video Kredisi",
          itemType: "VIRTUAL",
          price: formattedPrice,
        },
      ],
    };

    console.log("iyzico initialize payload:", JSON.stringify(requestBody, null, 2));

    // Create IYZWSv2 authorization header
    // Format: Base64(SHA1(apiKey + secretKey + randomString + conversationId))
    const hashInput = `${apiKey}${secretKey}${randomString}${params.orderId}`;
    const hash = createHmac("sha1", secretKey).update(hashInput).digest("base64");
    const authorization = `IYZWSv2 ${apiKey}:${hash}`;

    const endpoint = `${baseUrl}/payment/iyzipos/checkoutform/initialize/auth/ecom`;
    
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authorization,
        "x-iyzi-rnd": randomString,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    
    console.log("iyzico initialize response:", {
      status: data.status,
      errorCode: data.errorCode,
      errorMessage: data.errorMessage,
      checkoutFormToken: data.checkoutFormToken ? "[TOKEN_HIDDEN]" : undefined,
    });

    if (data.status === "success" && data.checkoutFormToken) {
      return {
        success: true,
        token: String(data.checkoutFormToken),
        paymentPageUrl: `${baseUrl}/payment/iyzipos/checkoutform/auth/${data.checkoutFormToken}`,
      };
    } else {
      return {
        success: false,
        error: String(data.errorMessage || data.message || "Ödeme başlatılamadı"),
      };
    }
  } catch (error) {
    console.error("iyzico API error:", error);
    return { success: false, error: "Ödeme sistemi hatası" };
  }
}
