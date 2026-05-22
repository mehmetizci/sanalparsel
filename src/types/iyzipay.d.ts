declare module "iyzipay" {
  class Iyzipay {
    constructor(options: {
      apiKey: string
      secretKey: string
      uri: string
    })
    checkoutFormInitialize: {
      create: (request: any, callback: (err: any, result: any) => void) => void
    }
    checkoutForm: {
      retrieve: (request: any, callback: (err: any, result: any) => void) => void
    }
  }
  export default Iyzipay
}
