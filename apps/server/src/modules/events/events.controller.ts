import type { Request, Response } from "express";

import eventEmitter from "../../core/events/event.emitter.js";

// SSE endpoint — keeps the connection open and pushes typed events to the client.
// Connect once; the stream stays alive until the client disconnects.
class EventsController {
    stream(req: Request, res: Response) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Accel-Buffering", "no");
        res.flushHeaders();

        const userId = req.user.id;

        eventEmitter.subscribe(userId, res);

        // Send a heartbeat every 25 s to keep proxies from dropping the connection
        const heartbeat = setInterval(() => {
            try {
                res.write(": heartbeat\n\n");
            } catch {
                clearInterval(heartbeat);
            }
        }, 25_000);

        // Initial confirmation so the client knows the stream is live
        res.write(
            `data: ${JSON.stringify({ type: "connected", userId, timestamp: new Date().toISOString() })}\n\n`,
        );

        req.on("close", () => {
            clearInterval(heartbeat);
            eventEmitter.unsubscribe(userId, res);
        });
    }
}

export default new EventsController();
