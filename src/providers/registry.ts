import type { Provider, ProviderId } from "../core/types";
import { MatrixProvider } from "./matrix";

const factories: Partial<Record<ProviderId, () => Provider>> = {
  matrix: () => new MatrixProvider(),
  // telegram, discord: planned
};

export function createProvider(id: ProviderId): Provider {
  const f = factories[id];
  if (!f) throw new Error(`Provider "${id}" is not implemented yet`);
  return f();
}
