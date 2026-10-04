import { prisma } from "@jobpilot/database";

import type {
    CreateProfileDTO,
    UpdateProfileDTO,
} from "./profile.validators.js";

class ProfileRepository {
    async create(
        userId: string,
        data: CreateProfileDTO,
    ) {
        return prisma.profile.create({
            data: {
                ...data,
                userId,
            },
        });
    }

    async findByUserId(
        userId: string,
    ) {
        return prisma.profile.findUnique({
            where: {
                userId,
            },
            include: {
                skills: true,
                experiences: true,
                educations: true,
                languages: true,
                certifications: true,
                profileProjects: true,
                profileLinks: true,
                resumes: true,
            },
        });
    }

    async update(
        userId: string,
        data: UpdateProfileDTO,
    ) {
        return prisma.profile.upsert({
            where: {
                userId,
            },
            create: {
                ...data,
                firstName: data.firstName || "Applicant",
                lastName: data.lastName || "User",
                phone: data.phone || "+91 9876543210",
                userId,
            },
            update: data,
        });
    }

    async delete(
        userId: string,
    ) {
        return prisma.profile.delete({
            where: {
                userId,
            },
        });
    }
}

export default new ProfileRepository();