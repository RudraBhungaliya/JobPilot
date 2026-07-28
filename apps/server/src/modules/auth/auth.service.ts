import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import repository from "./auth.repository.js";

import {
    LoginDTO,
    RegisterDTO,
    LoginResponse,
    RegisterResponse,    
} from"./auth.types.js";

import {
    InvalidCredentialsError,
    EmailAlreadyExistsError,
} from "./auth.errors.js";

export class AuthService {
    async register(
        dto : RegisterDTO
    ) : Promise<RegisterResponse>{
        const existingUser = await repository.findByEmail(dto.email);

        if(existingUser){
            throw new EmailAlreadyExistsError();
        }

        const hashedPassword = await bcrypt.hash(dto.password, 12);

        const user = await repository.create({
            ...dto,
            password : hashedPassword,
        });

        return {
            user,
        };
    }

    async login (
        dto : LoginDTO
    ) : Promise<LoginResponse> {
        const user = await repository.findByEmail(dto.email);

        if(!user){
            throw new InvalidCredentialsError();
        }

        const accessToken = jwt.sign(
            {
                userId : user.id,
                email : user.email,
            },
            process.env.JWT_ACCESS_SECRET!,
            {
                expiresIn : "15m",    
            }
        );

        const refreshToken = jwt.sign(
            {
                userId: user.id,
            },
            process.env.JWT_REFRESH_SECRET!,
            {
                expiresIn : "30d",
            }
        );

        await repository.saveRefreshToken(
            user.id, 
            refreshToken,
        );

        return {
            user,
            tokens : {
                accessToken,
                refreshToken,
            },
        };
    }

    async logout (
        userId : string,
    ) : Promise<void> {
        await repository.revokeRefreshToken(
            userId
        );
    }
}

export default new AuthService();


