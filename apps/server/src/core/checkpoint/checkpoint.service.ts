import type {
    AgentCheckpoint,
} from "./checkpoint.types.js";

class CheckpointService {

    private readonly store =
        new Map<string, AgentCheckpoint>();

    save(
        checkpoint: AgentCheckpoint,
    ) {
        this.store.set(
            checkpoint.threadId,
            checkpoint,
        );

        return checkpoint;
    }

    get(
        threadId: string,
    ) {
        return this.store.get(
            threadId,
        );
    }

    has(
        threadId: string,
    ) {
        return this.store.has(
            threadId,
        );
    }

    delete(
        threadId: string,
    ) {
        return this.store.delete(
            threadId,
        );
    }

    clear() {
        this.store.clear();
    }

    getAll() {
        return [
            ...this.store.values(),
        ];
    }
}

export default new CheckpointService();