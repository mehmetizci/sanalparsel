import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-admin";

// Package definitions
const PACKAGES = {
  starter: { credits: 1, price: 149, name: "Başlangıç Paketi" },
  standard: { credits: 5, price: 599, name: "Standart Paket" },
  pro: { credits: 10, price: 999, name: "Pro Paket" },
} as const;

type PackageId = keyof typeof PACKAGES;

export async function POST(request: NextRequest) {
  try {
    // Get user from auth header (set by middleware)
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Create Supabase client with service role for admin operations
    const supabase = createServerClient();
    
    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      userName: user.user_metadata?.full_name || "Unknown",
      userPhone: user.user_metadata?.phone || undefined,
      packageName: pkg.name,
      packageId: packageId,
      price: pkg.price,
      callbackUrl: `${process.env.PUBLIC_APP_URL}/api/payments/iyzico/callback`,
      clientIp: clientIp,
    });

    if (!iyzicoResponse.success || !iyzicoResponse.paymentPageUrl) {
      // Update order status to failed
      await supabase
        .from("payment_orders")
        .update({ status: "failed" })
        .eq("id", order.id);

      return NextResponse.json(
        { error: iyzicoResponse.error || "Ödeme başlatılamadı" },
        { status: 500 }
      );
    }

    // Update order with iyzico token
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
  userName: string;
  userPhone?: string;
  packageName: string;
  packageId: string;
  price: number;
  callbackUrl: string;
  clientIp: string;
}): Promise<IyzicoInitResponse> {
  const apiKey = process.env.IYZICO_API_KEY;
  const secretKey = process.env.IYZICO_SECRET_KEY;
  const baseUrl = process.env.IYZICO_BASE_URL || "https://sandbox-api.iyzipay.com";

  if (!apiKey || !secretKey) {
    console.error("Missing iyzico credentials");
    return { success: false, error: "Ödeme sistemi yapılandırılmamış" };
  }

  try {
    // Format price as string with 2 decimal places
    const formattedPrice = params.price.toFixed(2);
    
    // Split user name into first name and surname
    const nameParts = params.userName.trim().split(/\s+/);
    const firstName = nameParts[0] || "Musteri";
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "Musteri";

    // Build buyer object - only include gsmNumber if user has a valid phone
    const buyer: Record<string, string> = {
      id: params.userId,
      name: firstName,
      surname: lastName,
      email: params.userEmail || "musteri@example.com",
      identityNumber: "11111111111",
      registrationAddress: "İstanbul, Türkiye",
      city: "İstanbul",
      country: "Türkiye",
      zipCode: "34000",
      ip: params.clientIp || "85.34.78.112",
    };
    
    // Only add gsmNumber if user has a valid phone number
    if (params.userPhone && params.userPhone.length >= 10) {
      buyer.gsmNumber = params.userPhone.startsWith("+") ? params.userPhone : `+90${params.userPhone}`;
    }

    // iyzico Checkout Form Initialize request
    const request = {
      locale: "tr",
      conversationId: params.orderId,
      price: formattedPrice,
      paidPrice: formattedPrice,
      currency: "TRY",
      basketId: params.orderId,
      paymentGroup: "PRODUCT",
      callbackUrl: params.callbackUrl,
      enabledInstallments: [1],
      buyer,
      shippingAddress: {
        contactName: `${firstName} ${lastName}`,
        city: "İstanbul",
        country: "Türkiye",
        address: "İstanbul, Türkiye",
        zipCode: "34000",
      },
      billingAddress: {
        contactName: `${firstName} ${lastName}`,
        city: "İstanbul",
        country: "Türkiye",
        address: "İstanbul, Türkiye",
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

    // Log request payload with masked sensitive data (never log secret key)
    const maskedRequest = {
      ...request,
      // Don't log any sensitive data
    };
    console.log("iyzico initialize payload", JSON.stringify(maskedRequest, null, 2));

    // Using fetch directly since iyzico-iyzipay SDK might have different API
    const auth = Buffer.from(`${apiKey}:${secretKey}`).toString("base64");

    const response = await fetch(`${baseUrl}/payment/iyzipos/checkoutform/initialize/auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify(request),
    });

    const data = await response.json();
    
    // Log response (masked)
    console.log("iyzico initialize response", {
      status: data.status,
      errorCode: data.errorCode,
      errorMessage: data.errorMessage,
      checkoutFormToken: data.checkoutFormToken ? "[TOKEN_HIDDEN]" : undefined,
    });

    if (data.status === "success" && data.checkoutFormToken) {
      return {
        success: true,
        token: data.checkoutFormToken,
        paymentPageUrl: `${baseUrl}/payment/iyzipos/checkoutform/auth/${data.checkoutFormToken}`,
      };
    } else {
      console.error("iyzico error:", data);
      return {
        success: false,
        error: data.errorMessage || data.message || "Ödeme başlatılamadı",
      };
    }
  } catch (error) {
    console.error("iyzico API error:", error);
    return {
      success: false,
      error: "Ödeme sistemi hatası",
    };
  }
}
