import { pinoHttp } from "pino-http";
import { getEnv } from "../config/env.js";
import logger from "../core/logger/logger.js";

const env = getEnv();

export const httpLogger = pinoHttp({
  logger: logger as any,
  autoLogging: {
    ignore: (req) => {
      const url = (req as { url?: string }).url || "";
      return url === "/health" || url === "/favicon.ico";
    },
  },
  level: env.NODE_ENV === "production" ? "info" : "debug",
});

export default httpLogger;
