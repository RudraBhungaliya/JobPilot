import pino, {
  type Logger as PinoLogger,
  type SerializedError,
} from "pino";

import { getEnv } from "../../config/env.js";

const SECRET_KEY_PATTERN =
  /(API_KEY|SECRET|TOKEN|api[_-]?key|secret|token|password|passwd|pwd|authorization|cookie|auth|jwt|private[_-]?key|session)/i;

function redactValue(value: unknown): unknown {
  if (typeof value === "string") {
    return "<redacted>";
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return "<redacted>";
  }
  if (value === null || value === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(redactValue);
  }
  if (typeof value === "object") {
    return redactObject(value as Record<string, unknown>);
  }
  return String(value);
}

function redactObject(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SECRET_KEY_PATTERN.test(key)) {
      result[key] = redactValue(value);
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      result[key] = redactObject(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        item && typeof item === "object"
          ? redactObject(item as Record<string, unknown>)
          : item
      );
    } else {
      result[key] = value;
    }
  }
  return result;
}

const env = getEnv();

const isProduction = env.NODE_ENV === "production";

const loggerInstance: PinoLogger = pino({
  level: isProduction ? "info" : "debug",
  formatters: {
    level: (label) => ({ level: label }),
    log: (object) => redactObject(object as Record<string, unknown>),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: undefined,
  serializers: {
    err: (err: Error | SerializedError) => {
      if (!err || typeof err !== "object") return err as SerializedError;
      const message =
        typeof (err as Error).message === "string"
          ? (err as Error).message
          : String(err);
      const stack =
        typeof (err as Error).stack === "string"
          ? (err as Error).stack
          : undefined;
      return redactObject({
        type: (err as Error).name || "Error",
        message,
        stack,
      }) as SerializedError;
    },
    req: (req) => {
      if (!req || typeof req !== "object") return req;
      const headers = (req as { headers?: Record<string, unknown> }).headers;
      return {
        method: (req as { method?: string }).method,
        url: (req as { url?: string }).url,
        headers: headers ? redactObject(headers) : headers,
      };
    },
    res: (res) => {
      if (!res || typeof res !== "object") return res;
      return {
        statusCode: (res as { statusCode?: number }).statusCode,
      };
    },
  },
});

export type LogLevel = "debug" | "info" | "warn" | "error";

class Logger {
  private inner: PinoLogger = loggerInstance;

  debug(messageOrMeta: string | Record<string, unknown> | unknown, metaOrMessage?: unknown): void {
    if (typeof messageOrMeta === "string") {
      if (metaOrMessage === undefined) this.inner.debug(messageOrMeta);
      else this.inner.debug(metaOrMessage as object, messageOrMeta);
    } else {
      const msg = typeof metaOrMessage === "string" ? metaOrMessage : "";
      this.inner.debug(messageOrMeta as object, msg);
    }
  }

  info(messageOrMeta: string | Record<string, unknown> | unknown, metaOrMessage?: unknown): void {
    if (typeof messageOrMeta === "string") {
      if (metaOrMessage === undefined) this.inner.info(messageOrMeta);
      else this.inner.info(metaOrMessage as object, messageOrMeta);
    } else {
      const msg = typeof metaOrMessage === "string" ? metaOrMessage : "";
      this.inner.info(messageOrMeta as object, msg);
    }
  }

  warn(messageOrMeta: string | Record<string, unknown> | unknown, metaOrMessage?: unknown): void {
    if (typeof messageOrMeta === "string") {
      if (metaOrMessage === undefined) this.inner.warn(messageOrMeta);
      else this.inner.warn(metaOrMessage as object, messageOrMeta);
    } else {
      const msg = typeof metaOrMessage === "string" ? metaOrMessage : "";
      this.inner.warn(messageOrMeta as object, msg);
    }
  }

  error(messageOrMeta: string | Record<string, unknown> | unknown, metaOrMessage?: unknown): void {
    if (typeof messageOrMeta === "string") {
      if (metaOrMessage === undefined) this.inner.error(messageOrMeta);
      else this.inner.error(metaOrMessage as object, messageOrMeta);
    } else {
      const msg = typeof metaOrMessage === "string" ? metaOrMessage : "";
      this.inner.error(messageOrMeta as object, msg);
    }
  }

  child(bindings: Record<string, unknown>): Logger {
    const child = new Logger();
    child.inner = this.inner.child(redactObject(bindings));
    return child;
  }
}

export default new Logger();

export { redactObject, redactValue, SECRET_KEY_PATTERN };
