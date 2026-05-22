import Iyzipay from "iyzipay"

let iyzicoInstance: Iyzipay | null = null

export const getIyzipay = () => {
  if (!iyzicoInstance) {
    const apiKey = process.env.IYZIPAY_API_KEY
    const secretKey = process.env.IYZIPAY_SECRET_KEY
    
    if (!apiKey || !secretKey) {
      throw new Error("iyzico API credentials not configured")
    }
    
    iyzicoInstance = new Iyzipay({
      apiKey,
      secretKey,
      uri: process.env.IYZIPAY_URI || "https://sandbox-api.iyzipay.com",
    })
  }
  return iyzicoInstance
}

export const iyzico = {
  get checkoutFormInitialize() {
    return getIyzipay().checkoutFormInitialize
  },
  get checkoutForm() {
    return getIyzipay().checkoutForm
  },
}
