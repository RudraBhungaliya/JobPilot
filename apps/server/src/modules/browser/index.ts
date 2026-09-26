import browserRoutes from "./browser.routes.js";

export type { DomAtsAdapter, DomAtsDetectorName } from "./dom-adapter.interface.js";
export { DomAtsDetector, domAtsDetector } from "./dom-adapter.detector.js";
export { default as domAtsBootstrap } from "./dom-adapter.bootstrap.js";

export default browserRoutes;