import type { Request, Response } from "express";
import liveAtsService from "../sources/live-ats.service.js";
import profileRepository from "../profile/profile.repository.js";

class JobLiveController {
    async getLiveOpenings(req: Request, res: Response) {
        try {
            const { category, department, city, keyword, minSalaryLPA, remoteOnly } = req.query;

            const jobs = await liveAtsService.getRealtimeIndianOpenings({
                category: category as string | undefined,
                department: department as string | undefined,
                city: city as string | undefined,
                keyword: keyword as string | undefined,
                minSalaryLPA: minSalaryLPA ? Number(minSalaryLPA) : undefined,
                remoteOnly: remoteOnly === "true",
            });

            // If user is authenticated, compute personalized resume match score
            let userSkills: string[] = [];
            if (req.user?.id) {
                const profile = await profileRepository.findByUserId(req.user.id);
                if (profile?.skills) {
                    userSkills = profile.skills.map((s) => s.name.toLowerCase());
                }
            }

            const enrichedJobs = jobs.map((job) => {
                let matchScore = 80;
                if (userSkills.length > 0) {
                    const matchedTags = job.tags.filter((t) =>
                        userSkills.some((us) => us.includes(t.toLowerCase()) || t.toLowerCase().includes(us))
                    );
                    matchScore = Math.min(99, Math.max(65, 65 + Math.round((matchedTags.length / Math.max(1, job.tags.length)) * 34)));
                }

                return {
                    ...job,
                    matchScore,
                };
            });

            // Group jobs by department (Greenhouse standard)
            const departmentsMap = new Map<string, typeof enrichedJobs>();
            for (const job of enrichedJobs) {
                const dept = job.department || "Engineering";
                if (!departmentsMap.has(dept)) {
                    departmentsMap.set(dept, []);
                }
                departmentsMap.get(dept)!.push(job);
            }

            const groupedByDepartment = Array.from(departmentsMap.entries()).map(([name, openings]) => ({
                name,
                openings,
            }));

            return res.status(200).json({
                success: true,
                count: enrichedJobs.length,
                data: enrichedJobs,
                grouped: groupedByDepartment,
            });
        } catch (error) {
            console.error("[JobLiveController] Error fetching live openings:", error);
            return res.status(500).json({
                success: false,
                message: "Failed to fetch live job openings",
            });
        }
    }
}

export default new JobLiveController();
