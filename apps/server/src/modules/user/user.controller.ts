import type { Request, Response } from "express";
import { updateProfileSchema } from "./user.validators.js";
import userService from "./user.service.js";

class UserController {
    async profile(req: Request, res: Response) {
        const body = updateProfileSchema.parse(req.body);

    const user = await userService.updateProfile(
        req.user.id,
        body
    );

        res.json(user);
    }

    async update(req: Request, res: Response) {
        const user = await userService.updateProfile(
            (req as any).user.id,
            req.body
        );

        res.json(user);
    }

    async delete(req: Request, res: Response) {
        await userService.deleteProfile(
            (req as any).user.id
        );

        res.sendStatus(204);
    }
}

export default new UserController();