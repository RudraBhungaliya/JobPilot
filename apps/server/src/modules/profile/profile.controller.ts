import type {
    Request,
    Response,
} from "express";

import profileService from "./profile.service.js";

import {
    createProfileSchema,
    updateProfileSchema,
} from "./profile.validators.js";

class ProfileController {
    async create(
        req: Request,
        res: Response,
    ) {
        const body =
            createProfileSchema.parse(
                req.body,
            );

        const profile =
            await profileService.createProfile(
                req.user.id,
                body,
            );

        return res.status(201).json({
            success: true,
            data: profile,
        });
    }

    async get(
        req: Request,
        res: Response,
    ) {
        const profile =
            await profileService.getProfile(
                req.user.id,
            );

        return res.status(200).json({
            success: true,
            data: profile,
        });
    }

    async update(
        req: Request,
        res: Response,
    ) {
        const body =
            updateProfileSchema.parse(
                req.body,
            );

        const profile =
            await profileService.updateProfile(
                req.user.id,
                body,
            );

        return res.status(200).json({
            success: true,
            data: profile,
        });
    }

    async delete(
        req: Request,
        res: Response,
    ) {
        await profileService.deleteProfile(
            req.user.id,
        );

        return res.sendStatus(204);
    }
}

export default new ProfileController();