import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";

import routes from "./routes/index.js";
import errorMiddleware from "./middleware/error.middleware.js";
import { authRoutes } from "./modules/auth/index.js";
import userRoutes from "./modules/user/index.js";


const app = express();

app.use("/api/v1", routes);
app.use(cors());
app.use(helmet());
app.use(compression());
app.use(cookieParser());

app.use(express.json());
app.use(express.urlencoded({ extended : true }));
app.use(errorMiddleware);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);

app.get("/", (req, res) => {
    res.json({
        success : true,
        message : "Server is running",
    });
});

export default app;
