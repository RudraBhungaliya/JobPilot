export type LogLevel =
    | "debug"
    | "info"
    | "warn"
    | "error";

class Logger {
    private log(
        level: LogLevel,
        message: string,
        meta?: unknown,
    ) {
        console.log(
            JSON.stringify({
                timestamp: new Date().toISOString(),
                level,
                message,
                meta,
            }),
        );
    }

    debug(
        message: string,
        meta?: unknown,
    ) {
        this.log(
            "debug",
            message,
            meta,
        );
    }

    info(
        message: string,
        meta?: unknown,
    ) {
        this.log(
            "info",
            message,
            meta,
        );
    }

    warn(
        message: string,
        meta?: unknown,
    ) {
        this.log(
            "warn",
            message,
            meta,
        );
    }

    error(
        message: string,
        meta?: unknown,
    ) {
        this.log(
            "error",
            message,
            meta,
        );
    }
}

export default new Logger();