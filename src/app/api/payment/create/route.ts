import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { package: pkg } = body;

    if (!pkg || !pkg.price_id) {
      return NextResponse.json({ error: "Invalid package" }, { status: 400 });
    }

    const apiKey = process.env.IYZIPAY_API_KEY;
    const secretKey = process.env.IYZIPAY_SECRET_KEY;

    if (!apiKey || !secretKey) {
      // Return a mock payment URL for demo
      return NextResponse.json({
        payment_url: "/demo-payment",
        conversation_id: `demo-${Date.now()}`,
        message: "Payment is in demo mode. Set IYZIPAY credentials for production.",
      });
    }

    // In production, this would create an iyzico payment form
    const conversationId = `sp-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const paymentForm = {
      locale: "tr",
      conversationId,
      price: pkg.price.toString(),
      paidPrice: pkg.price.toString(),
      currency: "TRY",
      basketId: pkg.id,
      paymentChannel: "WEB",
      paymentGroup: "PRODUCT",
      callbackUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/payment/callback`,
      enabledInstallments: [1, 2, 3, 4, 5, 6],
      items: [
        {
          id: pkg.id,
          name: `${pkg.name} Paket - ${pkg.videos} Video`,
          category1: "Credits",
          itemType: "VIRTUAL",
          price: pkg.price.toString(),
        },
      ],
    };

    // In production, you would call iyzico API here
    // For now, return mock data
    return NextResponse.json({
      payment_url: `/demo-payment?package=${pkg.id}`,
      conversation_id: conversationId,
      payment_form: paymentForm,
    });
  } catch (error) {
    console.error("Payment creation error:", error);
    return NextResponse.json({ error: "Failed to create payment" }, { status: 500 });
  }
}