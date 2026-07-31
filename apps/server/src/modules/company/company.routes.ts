import { Router } from "express";

import authMiddlewares from "../auth/auth.middleware.js";
import companyController from "./company.controller.js";

const router = Router();

router.use(authMiddlewares);

router.post("/", companyController.create.bind(companyController));

router.get(
    "/",
    companyController.getAll.bind(companyController)
);

router.get(
    "/:id",
    companyController.getOne.bind(companyController)
);

router.patch(
    "/:id",
    companyController.update.bind(companyController)
);

router.delete(
    "/:id",
    companyController.delete.bind(companyController)
);

export default router;