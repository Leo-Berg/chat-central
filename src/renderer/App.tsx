import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import type { Account, Contact, Conversation, Message } from "../core/types";

export function App() {
  const [tab, setTab] = useState<"chats" | "contacts" | "accounts">("chats");
  return (
    <div className="app">
      <nav>
        {(["chats", "contacts", "accounts"] as const).map((t) => (
          <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>{t}</button>
        ))}
      </nav>
      <main>
        {tab === "chats" && <Chats />}
        {tab === "contacts" && <Contacts />}
        {tab === "accounts" && <Accounts />}
      </main>
    </div>
  );
}

function Chats() {
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [sel, setSel] = useState<string>();
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [text, setText] = useState("");
  useEffect(() => { api.conversations().then(setConvs); }, []);
  const load = useCallback((id: string) => api.messages(id).then(setMsgs), []);
  useEffect(() => {
    if (!sel) return;
    load(sel);
    const t = setInterval(() => load(sel), 5000);
    return () => clearInterval(t);
  }, [sel, load]);
  const send = async () => {
    if (!sel || !text.trim()) return;
    await api.send(sel, text);
    setText("");
    load(sel);
  };
  return (
    <div className="split">
      <ul className="list">
        {convs.map((c) => (
          <li key={c.id} className={c.id === sel ? "active" : ""} onClick={() => setSel(c.id)}>{c.title}</li>
        ))}
        {!convs.length && <li className="muted">No chats. Add an account.</li>}
      </ul>
      <section className="conv">
        <div className="msgs">
          {msgs.map((m) => (
            <div key={m.id} className={m.outgoing ? "msg out" : "msg"}>
              <small>{m.sender}</small>
              <div>{m.text}</div>
            </div>
          ))}
        </div>
        {sel && (
          <form onSubmit={(e) => { e.preventDefault(); send(); }}>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message" />
            <button>Send</button>
          </form>
        )}
      </section>
    </div>
  );
}

function Contacts() {
  const [list, setList] = useState<Contact[]>([]);
  const [accts, setAccts] = useState<Account[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const refresh = () => api.contacts().then(setList);
  useEffect(() => { refresh(); api.accounts().then(setAccts); }, []);
  const add = async () => {
    if (!name.trim()) return;
    await api.saveContact({ accountId: null, name, phone, email });
    setName(""); setPhone(""); setEmail("");
    refresh();
  };
  return (
    <div className="page">
      <h2>Contacts</h2>
      <div className="row">
        {accts.map((a) => (
          <button key={a.id} onClick={() => api.syncContacts(a.id).then(refresh)}>Sync {a.label}</button>
        ))}
      </div>
      <form className="row" onSubmit={(e) => { e.preventDefault(); add(); }}>
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button>Add</button>
      </form>
      <ul className="list">
        {list.map((c) => (
          <li key={c.id}>
            <b>{c.name}</b> <span className="muted">{c.phone ?? c.externalId ?? ""} {c.email ?? ""}</span>
            <button onClick={() => api.deleteContact(c.id).then(refresh)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Accounts() {
  const [list, setList] = useState<Account[]>([]);
  const [homeserver, setHs] = useState("https://matrix.org");
  const [accessToken, setTok] = useState("");
  const [err, setErr] = useState("");
  const refresh = () => api.accounts().then(setList);
  useEffect(() => { refresh(); }, []);
  const add = async () => {
    setErr("");
    try {
      await api.addAccount("matrix", { homeserver, accessToken });
      setTok("");
      refresh();
    } catch (e) { setErr(String(e)); }
  };
  return (
    <div className="page">
      <h2>Accounts</h2>
      <ul className="list">
        {list.map((a) => (
          <li key={a.id}>{a.provider}: {a.label}
            <button onClick={() => api.removeAccount(a.id).then(refresh)}>Remove</button>
          </li>
        ))}
      </ul>
      <h3>Add Matrix account</h3>
      <form className="row" onSubmit={(e) => { e.preventDefault(); add(); }}>
        <input value={homeserver} onChange={(e) => setHs(e.target.value)} placeholder="Homeserver URL" />
        <input type="password" value={accessToken} onChange={(e) => setTok(e.target.value)} placeholder="Access token" />
        <button>Connect</button>
      </form>
      {err && <p className="err">{err}</p>}
      <p className="muted">Telegram and Discord are planned.</p>
    </div>
  );
}
