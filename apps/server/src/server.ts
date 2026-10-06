import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import queueWorker from "./modules/queue/queue.worker.js";

const PORT = Number(process.env.PORT || 8000);
const HOST = process.env.HOST || "0.0.0.0";

app.listen(PORT, HOST, () => {
    console.log(`Server is running on port ${PORT} (http://127.0.0.1:${PORT})`);
    queueWorker.start();
});