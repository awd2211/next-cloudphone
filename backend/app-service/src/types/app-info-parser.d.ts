declare module 'app-info-parser' {
  export class AppInfoParser {
    constructor(filePath: string);
    parse(): Promise<any>;
  }
}
