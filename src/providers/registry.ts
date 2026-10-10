import type { Provider, ProviderId } from "../core/types";
import { MatrixProvider } from "./matrix";
import { DiscordProvider } from "./discord";
import { TelegramProvider } from "./telegram";

const factories: Partial<Record<ProviderId, () => Provider>> = {
  matrix: () => new MatrixProvider(),
  telegram: () => new TelegramProvider(),
  discord: () => new DiscordProvider(),
};

export function createProvider(id: ProviderId): Provider {
  const f = factories[id];
  if (!f) throw new Error(`Provider "${id}" is not implemented yet`);
  return f();
}
