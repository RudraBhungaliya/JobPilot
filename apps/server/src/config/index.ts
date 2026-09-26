export { getEnv, resetEnvCacheForTesting } from "./env.js";
export type { EnvConfig } from "./env.js";

import { getEnv } from "./env.js";

export const env = getEnv();
