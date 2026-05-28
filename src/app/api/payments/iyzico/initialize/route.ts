import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-admin";
import Iyzipay from "iyzipay";

// Package definitions
const PACKAGES = {
  starter: { credits: 1, price: 149, name: "SanalParsel 1 Video Kredisi" },
  standard: { credits: 5, price: 599, name: "SanalParsel 5 Video Kredisi" },
  pro: { credits: 10, price: 999, name: "SanalParsel 10 Video Kredisi" },
} as const;

type PackageId = keyof typeof PACKAGES;

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
      callbackUrl: `${process.env.PUBLIC_APP_URL}/api/payments/iyzico/callback`,
      clientIp: clientIp,
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
  });

  if (!apiKey || !secretKey) {
    console.error("Missing iyzico credentials");
    return { success: false, error: "Ödeme sistemi yapılandırılmamış" };
  }

  try {
    // Format price as string with 2 decimal places
    const formattedPrice = params.price.toFixed(2);
    
    // Split user name into first name and surname
    const nameParts = params.userFullName.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : nameParts[0];

    // Initialize iyzico SDK
    const iyzipay = new Iyzipay({
      apiKey: apiKey,
      secretKey: secretKey,
      uri: baseUrl,
    });

    const requestPayload = {
      locale: Iyzipay.LOCALE.TR,
      conversationId: params.orderId,
      price: formattedPrice,
      paidPrice: formattedPrice,
      currency: Iyzipay.CURRENCY.TRY,
      basketId: params.orderId,
      paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
      callbackUrl: params.callbackUrl,
      enabledInstallments: [1],
      buyer: {
        id: params.userId,
        name: firstName,
        surname: lastName,
        email: params.userEmail,
        gsmNumber: params.userPhone.startsWith("+") ? params.userPhone : `+90${params.userPhone}`,
        identityNumber: "11111111111",
        registrationAddress: `${params.userDistrict}, ${params.userCity}, Turkey`,
        city: params.userCity,
        country: "Turkey",
        zipCode: "34000",
        ip: params.clientIp,
      },
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
          itemType: Iyzipay.BASKET_ITEM_TYPE.VIRTUAL,
          price: formattedPrice,
        },
      ],
    };

    console.log("iyzico initialize payload:", JSON.stringify(requestPayload, null, 2));

    return new Promise((resolve) => {
      iyzipay.checkoutFormInitialize.create(
        {
          ...requestPayload,
          paymentSource: Iyzipay.PAYMENT_SOURCE.GROW,
        },
        (err: Error | null, result: Record<string, unknown>) => {
          console.log("iyzico initialize response:", {
            status: result?.status,
            errorCode: result?.errorCode,
            errorMessage: result?.errorMessage,
            checkoutFormToken: result?.checkoutFormToken ? "[TOKEN_HIDDEN]" : undefined,
          } as Record<string, unknown>);

          if (err) {
            console.error("iyzico API error:", err);
            resolve({ success: false, error: "Ödeme sistemi hatası" });
            return;
          }

          if (result.status === "success" && result.checkoutFormToken) {
            resolve({
              success: true,
              token: String(result.checkoutFormToken),
              paymentPageUrl: `${baseUrl}/payment/iyzipos/checkoutform/auth/${result.checkoutFormToken}`,
            });
          } else {
            resolve({
              success: false,
              error: String(result.errorMessage || result.message || "Ödeme başlatılamadı"),
            });
          }
        }
      );
    });
  } catch (error) {
    console.error("iyzico API error:", error);
    return { success: false, error: "Ödeme sistemi hatası" };
  }
}
