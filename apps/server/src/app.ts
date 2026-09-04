import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";

import routes from "./routes/index.js";
import errorMiddleware from "./middleware/error.middleware.js";
import { authRoutes } from "./modules/auth/index.js";
import userRoutes from "./modules/user/index.js";
import jobRoutes from "./modules/job/index.js";
import companyRoutes from "./modules/company/index.js";
import resumeRoutes from "./modules/resume/index.js";
import profileRoutes from "./modules/profile/index.js";
import applicationRoutes from "./modules/application/index.js";
import { agentRoutes } from "./modules/agent/index.js";
import { notificationRouter } from "./modules/notification/index.js";
import { auditRouter } from "./modules/audit/index.js";
import eventsRouter from "./modules/events/events.routes.js";


const app = express();

app.use(cors());
app.use(helmet());
app.use(compression());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/v1", routes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/jobs", jobRoutes);
app.use("/api/v1/companies", companyRoutes);
app.use("/api/v1/resumes", resumeRoutes);
app.use("/api/v1/profile", profileRoutes);
app.use("/api/v1/profiles", profileRoutes);
app.use("/api/v1/applications", applicationRoutes);
app.use("/api/v1/agent", agentRoutes);
app.use("/api/v1/notifications", notificationRouter);
app.use("/api/v1/audit", auditRouter);
app.use("/api/v1/events", eventsRouter);


app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Server is running",
    });
});

app.use(errorMiddleware);

export default app;
