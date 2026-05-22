import {iyzico} from "@/lib/iyzico"
import {NextResponse} from "next/server"

export async function POST(): Promise<NextResponse> {
  return new Promise((resolve) => {
    const request = {
      locale: "tr",
      conversationId: `credit-${Date.now()}`,
      price: "149",
      paidPrice: "149",
      currency: "TRY",
      basketId: "SANALPARSEL_VIDEO_1",
      paymentGroup: "PRODUCT",
      callbackUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/api/payment/callback`,
      buyer: {
        id: "guest",
        name: "Sanal",
        surname: "Parsel",
        email: "demo@sanalparsel.com",
        identityNumber: "11111111111",
        registrationAddress: "İzmir",
        ip: "85.34.78.112",
        city: "İzmir",
        country: "Türkiye",
      },
      shippingAddress: {
        contactName: "Sanal Parsel",
        city: "İzmir",
        country: "Türkiye",
        address: "Dijital ürün",
      },
      billingAddress: {
        contactName: "Sanal Parsel",
        city: "İzmir",
        country: "Türkiye",
        address: "Dijital ürün",
      },
      basketItems: [
        {
          id: "video-credit",
          name: "1 Drone Video Kredisi",
          category1: "Video",
          itemType: "VIRTUAL",
          price: "149",
        },
      ],
    }

    iyzico.checkoutFormInitialize.create(request as any, (err: any, result: any) => {
      if (err) {
        resolve(NextResponse.json({error: err}, {status: 500}))
      } else {
        resolve(NextResponse.json({html: result.checkoutFormContent, token: result.token}))
      }
    })
  })
}
