import * as fs from "node:fs";

export interface Crypto {
  encrypt(s: string): Buffer;
  decrypt(b: Buffer): string;
}

/** Credentials encrypted with an injected cipher (Electron safeStorage → Windows DPAPI). */
export class SecretStore {
  private data: Record<string, string> = {};
  constructor(private file: string, private crypto: Crypto) {
    if (fs.existsSync(file)) this.data = JSON.parse(fs.readFileSync(file, "utf8"));
  }
  set(key: string, value: Record<string, string>) {
    this.data[key] = this.crypto.encrypt(JSON.stringify(value)).toString("base64");
    fs.writeFileSync(this.file, JSON.stringify(this.data));
  }
  get(key: string): Record<string, string> | undefined {
    const v = this.data[key];
    return v ? JSON.parse(this.crypto.decrypt(Buffer.from(v, "base64"))) : undefined;
  }
  delete(key: string) {
    delete this.data[key];
    fs.writeFileSync(this.file, JSON.stringify(this.data));
  }
}
