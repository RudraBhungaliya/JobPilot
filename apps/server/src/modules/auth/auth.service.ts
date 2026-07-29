import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import authRepository from "./auth.repository.js";

import {
    generateAccessToken,
    generateRefreshToken,
} from "./auth.tokens.js";

class AuthService {
    async register(email: string, password: string) {
        const existing = await authRepository.findUserByEmail(email);

        if (existing) {
            throw new Error("User already exists");
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await authRepository.createUser({
            email,
            password: hashedPassword,
        });

        const payload = {
            userId: user.id,
            email: user.email,
            role: user.role,
        };

        const tokens = {
            accessToken: generateAccessToken(payload),
            refreshToken: generateRefreshToken(payload),
        };

        return {
            user,
            tokens,
        };
    }

    async login(email: string, password: string) {
        const user = await authRepository.findUserByEmail(email);

        if (!user) {
            throw new Error("Invalid credentials");
        }

        const ok = await bcrypt.compare(
            password,
            user.password
        );

        if (!ok) {
            throw new Error("Invalid credentials");
        }

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
            },
            process.env.JWT_SECRET!,
            {
                expiresIn: "7d",
            }
        );

        return {
            user,
            token,
        };
    }
}

export default new AuthService();