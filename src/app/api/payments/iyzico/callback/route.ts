import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-admin";
import { createHmac } from "crypto";

// Get app URL with fallback
function getAppUrl(): string {
  return (
    process.env.PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://sanalparsel.onrender.com"
  );
}

export async function POST(request: NextRequest) {
  const appUrl = getAppUrl();

  try {
    // iyzico callback is typically form-urlencoded
    const formData = await request.formData();
    const token = formData.get("token")?.toString();

    if (!token) {
      console.error("No token in callback");
      return NextResponse.redirect(
        new URL(`${appUrl}/payment/failed?error=missing_token`)
      );
    }

    console.log("iyzico callback token:", token.substring(0, 20) + "...");

    // Create Supabase client
    const supabase = createServerClient();

    // Find the payment order by token
    const { data: order, error: orderError } = await supabase
      .from("payment_orders")
      .select("*")
      .eq("iyzico_token", token)
      .single();

    if (orderError || !order) {
      console.error("Order not found for token:", orderError);
      return NextResponse.redirect(
        new URL(`${appUrl}/payment/failed?error=order_not_found`)
      );
    }

    // Check if already processed (idempotency)
    if (order.status === "paid") {
      console.log("Order already processed:", order.id);
      return NextResponse.redirect(
        new URL(`${appUrl}/payment/success?order_id=${order.id}`)
      );
    }

    // Retrieve checkout form result to verify payment
    const retrieveResult = await retrieveCheckoutForm(token);

    console.log("iyzico retrieve result:", {
      status: retrieveResult.status,
      paymentStatus: retrieveResult.paymentStatus,
    });

    if (retrieveResult.status === "success" && retrieveResult.paymentStatus === "SUCCESS") {
      // Update order status to paid
      await supabase
        .from("payment_orders")
        .update({
          status: "paid",
          iyzico_payment_id: retrieveResult.paymentId || token,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      // Add credits to user profile
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("credits")
        .eq("user_id", order.user_id)
        .single();

      const currentCredits = profile?.credits ?? 0;
      const newCredits = currentCredits + order.credit_amount;

      await supabase
        .from("user_profiles")
        .update({ credits: newCredits, updated_at: new Date().toISOString() })
        .eq("user_id", order.user_id);

      // Log in credits table for history
      await supabase.from("credits").insert({
        user_id: order.user_id,
        amount: order.credit_amount,
        source: "purchase",
        payment_id: order.id,
      });

      console.log("Payment successful, credits added:", newCredits);

      return NextResponse.redirect(
        new URL(`${appUrl}/payment/success?order_id=${order.id}`)
      );
    } else {
      // Payment failed
      await supabase
        .from("payment_orders")
        .update({
          status: "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      return NextResponse.redirect(
        new URL(`${appUrl}/payment/failed?order_id=${order.id}`)
      );
    }
  } catch (error) {
    console.error("Callback error:", error);
    return NextResponse.redirect(
      new URL(`${appUrl}/payment/failed?error=server_error`)
    );
  }
}

interface RetrieveResult {
  status: string;
  paymentStatus: string;
  paymentId?: string;
  errorMessage?: string;
}

async function retrieveCheckoutForm(token: string): Promise<RetrieveResult> {
  const apiKey = process.env.IYZICO_API_KEY;
  const secretKey = process.env.IYZICO_SECRET_KEY;
  const baseUrl = process.env.IYZICO_BASE_URL || "https://sandbox-api.iyzipay.com";

  if (!apiKey || !secretKey) {
    console.error("Missing iyzico credentials");
    return { status: "error", paymentStatus: "UNKNOWN", errorMessage: "Missing credentials" };
  }

  try {
    // Generate random key for authorization
    const randomKey = Date.now().toString();
    const endpointPath = "/payment/iyzipos/checkoutform/auth/ecom/detail";

    // Create request body
    const requestBody = {
      locale: "tr",
      token: token,
    };
    const bodyString = JSON.stringify(requestBody);

    // Create IYZWSv2 authorization
    const payload = randomKey + endpointPath + bodyString;
    const encryptedData = createHmac("sha256", secretKey).update(payload).digest("hex");
    const authorizationString = `apiKey:${apiKey}&randomKey:${randomKey}&signature:${encryptedData}`;
    const authorization = `IYZWSv2 ${Buffer.from(authorizationString).toString("base64")}`;

    const endpoint = `${baseUrl}${endpointPath}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authorization,
        "x-iyzi-rnd": randomKey,
      },
      body: bodyString,
    });

    const data = await response.json();

    console.log("iyzico retrieve response:", {
      status: data.status,
      paymentStatus: data.paymentStatus,
      paymentId: data.paymentId,
    });

    return {
      status: data.status,
      paymentStatus: data.paymentStatus,
      paymentId: data.paymentId,
      errorMessage: data.errorMessage,
    };
  } catch (error) {
    console.error("iyzico retrieve error:", error);
    return { status: "error", paymentStatus: "UNKNOWN", errorMessage: String(error) };
  }
}
