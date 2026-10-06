import domAdapterRegistry from "./dom-adapter.registry.js";
import domAtsDetector from "./dom-adapter.detector.js";
import type { DomAtsAdapter } from "./dom-adapter.interface.js";
import { greenhouseDomAdapter, leverDomAdapter, workdayDomAdapter } from "./adapters/index.js";

const ADAPTERS: DomAtsAdapter[] = [greenhouseDomAdapter, leverDomAdapter, workdayDomAdapter];

export function initialize(): void {
  for (const adapter of ADAPTERS) {
    domAdapterRegistry.register(adapter);
    domAtsDetector.register(adapter.name, adapter);
  }
}

export default { initialize };
