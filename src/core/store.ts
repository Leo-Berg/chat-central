import * as fs from "node:fs";
import * as path from "node:path";
import { randomUUID } from "node:crypto";
import type { Account, Contact } from "./types";

interface Data {
  accounts: Account[];
  contacts: Contact[];
}

/** Small JSON-file store. Secrets are kept separately (see SecretStore). */
export class Store {
  private data: Data = { accounts: [], contacts: [] };
  constructor(private file: string) {
    if (fs.existsSync(file)) this.data = JSON.parse(fs.readFileSync(file, "utf8"));
  }
  private save() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2));
  }
  accounts() { return this.data.accounts; }
  addAccount(a: Omit<Account, "id">): Account {
    const acc = { ...a, id: randomUUID() };
    this.data.accounts.push(acc);
    this.save();
    return acc;
  }
  removeAccount(id: string) {
    this.data.accounts = this.data.accounts.filter((a) => a.id !== id);
    this.save();
  }
  contacts() { return this.data.contacts; }
  upsertContact(c: Omit<Contact, "id"> & { id?: string }): Contact {
    const existing = c.id ? this.data.contacts.find((x) => x.id === c.id) : undefined;
    if (existing) {
      Object.assign(existing, c);
      this.save();
      return existing;
    }
    const created = { ...c, id: randomUUID() } as Contact;
    this.data.contacts.push(created);
    this.save();
    return created;
  }
  deleteContact(id: string) {
    this.data.contacts = this.data.contacts.filter((c) => c.id !== id);
    this.save();
  }
}
