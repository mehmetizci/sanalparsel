declare module 'iyzipay' {
  type Callback = (err: Error | null, result: Record<string, unknown>) => void;

  interface Buyer {
    id: string;
    name: string;
    surname: string;
    email: string;
    gsmNumber: string;
    identityNumber: string;
    registrationAddress: string;
    city: string;
    country: string;
    zipCode: string;
    ip: string;
  }

  interface Address {
    contactName: string;
    city: string;
    country: string;
    address: string;
    zipCode: string;
  }

  interface BasketItem {
    id: string;
    name: string;
    category1: string;
    itemType: string;
    price: string;
  }

  interface CheckoutFormInitializeRequest {
    locale: string;
    conversationId: string;
    price: string;
    paidPrice: string;
    currency: string;
    basketId: string;
    paymentGroup: string;
    callbackUrl: string;
    enabledInstallments: number[];
    buyer: Buyer;
    shippingAddress: Address;
    billingAddress: Address;
    basketItems: BasketItem[];
    paymentSource?: string;
  }

  interface CheckoutFormInitialize {
    create(request: CheckoutFormInitializeRequest, callback: Callback): void;
  }

  interface IyzipayOptions {
    apiKey: string;
    secretKey: string;
    uri: string;
  }

  const Iyzipay: {
    LOCALE: {
      TR: string;
    };
    CURRENCY: {
      TRY: string;
    };
    PAYMENT_GROUP: {
      PRODUCT: string;
    };
    BASKET_ITEM_TYPE: {
      VIRTUAL: string;
    };
    PAYMENT_SOURCE: {
      GROW: string;
    };
    new (options: IyzipayOptions): {
      checkoutFormInitialize: CheckoutFormInitialize;
    };
  };

  export default Iyzipay;
}
