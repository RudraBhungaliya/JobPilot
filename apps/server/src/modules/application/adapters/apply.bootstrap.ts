import applyAdapterRegistry from "./apply-adapter.registry.js";
import type { ApplyAdapter } from "./apply-adapter.interface.js";
import greenhouseApiAdapter from "./greenhouse.api-adapter.js";
import leverApiAdapter from "./lever.api-adapter.js";
import ashbyApiAdapter from "./ashby.api-adapter.js";

const ADAPTERS: ApplyAdapter[] = [greenhouseApiAdapter, leverApiAdapter, ashbyApiAdapter];

export function initialize(): void {
  for (const adapter of ADAPTERS) {
    applyAdapterRegistry.register(adapter);
  }
}

export default { initialize };
