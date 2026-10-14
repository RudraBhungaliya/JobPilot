import path from "node:path";
import fs from "node:fs";
import dotenv from "dotenv";

dotenv.config();
const envCandidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "../../.env"),
    path.resolve(process.cwd(), "../.env"),
];
for (const cand of envCandidates) {
    if (fs.existsSync(cand)) {
        dotenv.config({ path: cand });
    }
}


import app from "./app.js";
import queueWorker from "./modules/queue/queue.worker.js";
import shutdownService from "./modules/workflow/shutdown.service.js";

const PORT = Number(process.env.PORT || 8000);
const HOST = process.env.HOST || "0.0.0.0";

shutdownService.installSignalHandlers();

const server = app.listen(PORT, HOST, () => {
    console.log(`Server is running on port ${PORT} (http://127.0.0.1:${PORT})`);
    queueWorker.start();
});

export default server;