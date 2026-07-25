import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
const PORT = Number(process.env.PORT || 8000);

app.listen(PORT, () => {
    console.log("Server is running on port", PORT);
})