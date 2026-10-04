import type { Response } from "express";

import type { AppEvent } from "./event.types.js";

// In-process SSE event emitter.
// Each connected client gets its own Response object stored here.
// When an event is emitted the payload is pushed to all matching clients.
class EventEmitter {
    // userId -> set of SSE response objects
    private readonly clients = new Map<string, Set<Response>>();

    subscribe(userId: string, res: Response): void {
        if (!this.clients.has(userId)) {
            this.clients.set(userId, new Set());
        }

        this.clients.get(userId)!.add(res);
    }

    unsubscribe(userId: string, res: Response): void {
        const set = this.clients.get(userId);
        if (!set) return;

        set.delete(res);

        if (set.size === 0) {
            this.clients.delete(userId);
        }
    }

    emit(event: AppEvent): void {
        const set = this.clients.get(event.userId);
        if (!set || set.size === 0) return;

        const payload = `data: ${JSON.stringify(event)}\n\n`;

        for (const res of set) {
            try {
                res.write(payload);
            } catch {
                // Client disconnected mid-write — clean up silently
                set.delete(res);
            }
        }
    }

    connectedCount(userId: string): number {
        return this.clients.get(userId)?.size ?? 0;
    }
}

export default new EventEmitter();
