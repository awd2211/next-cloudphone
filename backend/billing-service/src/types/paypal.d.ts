declare module '@paypal/checkout-server-sdk' {
  export = paypal;

  namespace paypal {
    namespace core {
      class PayPalHttpClient {
        constructor(environment: any);
        execute(request: any): Promise<any>;
      }

      class SandboxEnvironment {
        constructor(clientId: string, clientSecret: string);
      }

      class LiveEnvironment {
        constructor(clientId: string, clientSecret: string);
      }
    }

    namespace orders {
      class OrdersCreateRequest {
        constructor();
        prefer(value: string): void;
        requestBody(body: any): void;
      }

      class OrdersCaptureRequest {
        constructor(orderId: string);
        requestBody(body: any): void;
      }

      class OrdersGetRequest {
        constructor(orderId: string);
      }
    }
  }
}
