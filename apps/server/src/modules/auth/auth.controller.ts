import type { Request, Response } from "express";
import authService from "./auth.service.js";

class AuthController {
    async register (req : Request, res : Response) {
        const { email, password} = req.body;
        const result = await authService.register(email, password);
        return res.status(201).json(result);
    }

    async login (req : Request, res : Response){
        const { email, password } = req.body;
        const result = await authService.login(email, password);
        return res.status(200).json(result);
    }
}

export default new AuthController();