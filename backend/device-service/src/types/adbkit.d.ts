/**
 * Type declarations for adbkit module
 * Since @types/adbkit is not available, we declare basic types manually
 */
declare module 'adbkit' {
  export interface Client {
    createConnection(options?: any): any;
    listDevices(): Promise<Device[]>;
    connect(host: string, port: number): Promise<string>;
    disconnect(host: string, port: number): Promise<void>;
    shell(serial: string, command: string): Promise<any>;
    install(serial: string, apk: string): Promise<void>;
    uninstall(serial: string, pkg: string): Promise<void>;
    push(serial: string, src: string, dest: string): Promise<void>;
    pull(serial: string, src: string): Promise<any>;
    screencap(serial: string): Promise<any>;
    forward(serial: string, local: string, remote: string): Promise<void>;
    reverse(serial: string, remote: string, local: string): Promise<void>;
    [key: string]: any;
  }

  export interface Device {
    id: string;
    type: string;
    [key: string]: any;
  }

  export const util: {
    readAll(stream: any): Promise<Buffer>;
    [key: string]: any;
  };

  export function createClient(options?: any): Client;

  export default createClient;
}
