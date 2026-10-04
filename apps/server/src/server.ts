import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import queueWorker from "./modules/queue/queue.worker.js";

const PORT = Number(process.env.PORT || 8000);

app.listen(PORT, () => {
    console.log("Server is running on port", PORT);
    queueWorker.start();
});