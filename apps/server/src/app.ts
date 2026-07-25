import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";

import routes from "./routes/index";

app.use

const app = express();

app.use(cors());
app.use(helmet());
app.use(compression());
app.use(cookieParser());

app.use(express.json());
app.use(express.urlencoded({ extended : true }));

app.get("/", (req, res) => {
    res.json({
        success : true,
        message : "Server is running",
    });
});

export default app;
