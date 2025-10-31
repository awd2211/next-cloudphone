declare module 'speakeasy' {
  export function generateSecret(options?: any): any;

  export namespace totp {
    function verify(options: any): boolean;
  }

  export function totp(options: any): string;
}
