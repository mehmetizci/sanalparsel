import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const token = formData.get("token") as string;
    const status = formData.get("paymentStatus") as string;
    const conversationId = formData.get("conversationId") as string;

    if (!token || !status) {
      return NextResponse.redirect(
        new URL("/payment/failed?error=missing_params", request.url)
      );
    }

    // Create Supabase client
    const supabase = createServerClient();

    // Find the payment order
    const { data: order, error: orderError } = await supabase
      .from("payment_orders")
      .select("*")
      .eq("id", conversationId)
      .single();

    if (orderError || !order) {
      console.error("Order not found:", orderError);
      return NextResponse.redirect(
        new URL("/payment/failed?error=order_not_found", request.url)
      );
    }

    // Check if already processed (idempotency)
    if (order.status === "paid") {
      console.log("Order already processed, skipping:", order.id);
      return NextResponse.redirect(
        new URL("/payment/success?order_id=" + order.id, request.url)
      );
    }

    // Verify payment with iyzico (retrieve checkout form result)
    const paymentVerified = await verifyIyzicoPayment(token, conversationId);

    if (status === "SUCCESS" && paymentVerified) {
      // Update order status to paid
      await supabase
        .from("payment_orders")
        .update({
          status: "paid",
          iyzico_payment_id: token,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      // Add credits to user profile
      const { error: creditsError } = await supabase.rpc("add_user_credits", {
        user_uuid: order.user_id,
        amount: order.credit_amount,
      });

      if (creditsError) {
        console.error("Error adding credits:", creditsError);
        // Still mark as paid but log the error
      }

      // Also log in credits table for history
      await supabase.from("credits").insert({
        user_id: order.user_id,
        amount: order.credit_amount,
        source: "purchase",
        payment_id: order.id,
      });

      return NextResponse.redirect(
        new URL("/payment/success?order_id=" + order.id, request.url)
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
        new URL("/payment/failed?error=payment_declined", request.url)
      );
    }
  } catch (error) {
    console.error("Callback error:", error);
    return NextResponse.redirect(
      new URL("/payment/failed?error=server_error", request.url)
    );
  }
}

async function verifyIyzicoPayment(
  token: string,
  conversationId: string
): Promise<boolean> {
  const apiKey = process.env.IYZICO_API_KEY;
  const secretKey = process.env.IYZICO_SECRET_KEY;
  const baseUrl = process.env.IYZICO_BASE_URL || "https://sandbox-api.iyzipay.com";

  if (!apiKey || !secretKey) {
    console.error("Missing iyzico credentials");
    return false;
  }

  try {
    const request = {
      locale: "tr",
      conversationId: conversationId,
      token: token,
    };

    const auth = Buffer.from(`${apiKey}:${secretKey}`).toString("base64");

    const response = await fetch(`${baseUrl}/payment/iyzipos/checkoutform/auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify(request),
    });

    const data = await response.json();

    return data.status === "success";
  } catch (error) {
    console.error("iyzico verification error:", error);
    return false;
  }
}
