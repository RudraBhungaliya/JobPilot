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
        const { skills, experiences, educations, languages, certifications, projects, ...profileData } = data;
        return prisma.profile.create({
            data: {
                ...profileData,
                userId,
                ...(skills ? { skills: { create: skills } } : {}),
                ...(experiences ? { experiences: { create: experiences } } : {}),
                ...(educations ? { educations: { create: educations } } : {}),
                ...(languages ? { languages: { create: languages } } : {}),
                ...(certifications ? { certifications: { create: certifications } } : {}),
                ...(projects ? { profileProjects: { create: projects } } : {}),
            },
            include: { skills: true, experiences: true, educations: true, languages: true, certifications: true, profileProjects: true },
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
        if (!data.firstName?.trim() || !data.lastName?.trim() || !data.phone?.trim()) {
            const existing = await prisma.profile.findUnique({ where: { userId }, select: { id: true } });
            if (!existing) {
                throw new Error("First name, last name, and phone are required to create a candidate profile.");
            }
        }
        const { skills, experiences, educations, languages, certifications, projects, ...profileData } = data;
        return prisma.$transaction(async (tx) => {
            const profile = await tx.profile.upsert({
                where: { userId },
                create: { ...profileData, firstName: data.firstName!, lastName: data.lastName!, phone: data.phone!, userId },
                update: profileData,
            });
            const replacements = [
                ["skills", skills], ["experiences", experiences], ["educations", educations], ["languages", languages], ["certifications", certifications], ["profileProjects", projects],
            ] as const;
            for (const [relation, rows] of replacements) {
                if (rows === undefined) continue;
                // The relationship names are fixed here; request data only supplies row values.
                if (relation === "skills") { await tx.profileSkill.deleteMany({ where: { profileId: profile.id } }); if (skills?.length) await tx.profileSkill.createMany({ data: skills.map((row) => ({ ...row, profileId: profile.id })) }); }
                if (relation === "experiences") { await tx.profileExperience.deleteMany({ where: { profileId: profile.id } }); if (experiences?.length) await tx.profileExperience.createMany({ data: experiences.map((row) => ({ ...row, profileId: profile.id })) }); }
                if (relation === "educations") { await tx.profileEducation.deleteMany({ where: { profileId: profile.id } }); if (educations?.length) await tx.profileEducation.createMany({ data: educations.map((row) => ({ ...row, profileId: profile.id })) }); }
                if (relation === "languages") { await tx.profileLanguage.deleteMany({ where: { profileId: profile.id } }); if (languages?.length) await tx.profileLanguage.createMany({ data: languages.map((row) => ({ ...row, profileId: profile.id })) }); }
                if (relation === "certifications") { await tx.profileCertification.deleteMany({ where: { profileId: profile.id } }); if (certifications?.length) await tx.profileCertification.createMany({ data: certifications.map((row) => ({ ...row, profileId: profile.id })) }); }
                if (relation === "profileProjects") { await tx.profileProject.deleteMany({ where: { profileId: profile.id } }); if (projects?.length) await tx.profileProject.createMany({ data: projects.map((row) => ({ ...row, profileId: profile.id })) }); }
            }
            return tx.profile.findUnique({ where: { id: profile.id }, include: { skills: true, experiences: true, educations: true, languages: true, certifications: true, profileProjects: true, profileLinks: true, resumes: true } });
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
