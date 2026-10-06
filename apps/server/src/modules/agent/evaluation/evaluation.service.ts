import matchingService from "./matching.service.js";
import scoringService from "./scoring.service.js";
import { inferCompanyTier } from "../../application/application.constants.js";

import type {
    AgentJob,
} from "../agent.types.js";

import type {
    EvaluationResult,
    JobEvaluation,
    JobScorecard,
    RankedJobMatch,
    LoopCriteriaInput,
} from "./evaluation.types.js";

import type { CandidateContext } from "../candidate/candidate.types.js";

class EvaluationService {
    /**
     * Legacy evaluation method for agent workflow nodes and backward compatibility.
     */
    async evaluate(
        query: string,
        jobs: AgentJob[],
        candidateSkills: string[] = [],
    ): Promise<EvaluationResult> {
        const queryTerms = query
            .toLowerCase()
            .split(/\s+/)
            .filter(Boolean);

        const evaluations: JobEvaluation[] = [];
        const selectedJobIds: string[] = [];

        for (const job of jobs) {
            const matchesTerms =
                await matchingService.match(
                    query,
                    job.title,
                    job.company,
                );

            let score =
                await scoringService.score(
                    matchesTerms.length,
                    queryTerms.length,
                );

            // Boost score if job matches candidate's extracted resume skills
            const jobText = `${job.title} ${job.company} ${job.description || ""} ${job.location || ""}`.toLowerCase();
            const matchedSkills = candidateSkills.filter((s) => {
                if (!s || s.length < 2) return false;
                const lowerSkill = s.toLowerCase();
                return jobText.includes(lowerSkill);
            });

            if (matchedSkills.length > 0) {
                score = Math.min(100, score + matchedSkills.length * 15);
            }

            const reason =
                score >= 35
                    ? `Strong match with terms: ${matchesTerms.join(", ")}${
                          matchedSkills.length
                              ? ` (Matched resume skills: ${matchedSkills.slice(0, 5).join(", ")})`
                              : ""
                      }`
                    : "Weak match with query terms.";

            evaluations.push({
                jobId: job.id,
                score,
                matchesTerms,
                reason,
            });

            if (score >= 35) {
                selectedJobIds.push(job.id);
            }
        }

        // If no job scored >= 35, select top job to ensure auto-apply pipeline proceeds
        if (selectedJobIds.length === 0 && jobs.length > 0) {
            const highest = [...evaluations].sort((a, b) => b.score - a.score)[0];
            if (highest) {
                selectedJobIds.push(highest.jobId);
            }
        }

        return {
            evaluations: evaluations,
            selectedJobIds,
        };
    }

    /**
     * Real, multi-dimensional candidate evaluation for a specific job.
     * Evaluates skills, experience, education, location, and role preferences.
     */
    evaluateCandidateForJob(
        candidateContext: CandidateContext,
        job: {
            id?: string;
            title: string;
            company: string;
            description?: string | null;
            location: string;
            workMode?: string | null;
            url?: string;
            salaryRange?: string | null;
            createdAt?: Date;
        },
        loopCriteria?: LoopCriteriaInput,
    ): JobScorecard {
        const jobText = `${job.title} ${job.company} ${job.description || ""} ${job.location || ""}`.trim();

        // 1. Extract candidate skills from context
        const candidateSkills: string[] = [];
        if (Array.isArray(candidateContext.skills)) {
            for (const s of candidateContext.skills) {
                if (typeof s === "string") {
                    candidateSkills.push(s);
                } else if (s && typeof s.name === "string") {
                    candidateSkills.push(s.name);
                }
            }
        }
        if (candidateContext.resumeText) {
            try {
                const words = candidateContext.resumeText.split(/[\n,;•·|]+/);
                for (const w of words) {
                    const trimmed = w.trim();
                    if (trimmed.length > 1 && trimmed.length < 35 && !candidateSkills.includes(trimmed)) {
                        candidateSkills.push(trimmed);
                    }
                }
            } catch {
                // Ignore
            }
        }

        // 2. Skills Match (40% weight)
        const skillRes = matchingService.matchSkills(candidateSkills, jobText);

        // 3. Experience Match (20% weight)
        const expRes = matchingService.matchExperience(
            candidateContext.yearsOfExperience,
            jobText,
            candidateContext.currentTitle,
        );

        // 4. Education Match (10% weight)
        const eduRes = matchingService.matchEducation(
            candidateContext.educations || [],
            jobText,
        );

        // 5. Location Match (15% weight)
        const locRes = matchingService.matchLocation(
            candidateContext.city || candidateContext.country,
            loopCriteria?.targetLocations || [],
            loopCriteria?.remotePreference || candidateContext.workMode,
            job.location,
            job.workMode,
        );

        // 6. Role / Title Match (15% weight)
        const targetRoles = loopCriteria?.targetJobTitles && loopCriteria.targetJobTitles.length > 0
            ? loopCriteria.targetJobTitles
            : (candidateContext.currentTitle ? [candidateContext.currentTitle] : ["Software Engineer"]);

        const roleRes = matchingService.matchRole(targetRoles, job.title);

        // 7. Calculate overall weighted score (0 - 100)
        const rawScore = (
            skillRes.score * 0.40 +
            expRes.score * 0.20 +
            locRes.score * 0.15 +
            roleRes.score * 0.15 +
            eduRes.score * 0.10
        );

        const matchScore = Math.max(0, Math.min(100, Math.round(rawScore)));

        // 8. Infer company tier
        const companyTier = inferCompanyTier(job.company);

        // 9. Collect transparent reasons
        const reasons: string[] = [];
        if (skillRes.reason) reasons.push(skillRes.reason);
        if (expRes.reason) reasons.push(expRes.reason);
        if (locRes.reason) reasons.push(locRes.reason);
        if (roleRes.reason) reasons.push(roleRes.reason);
        if (companyTier === "S" || companyTier === "A") {
            reasons.push(`High priority employer tier: ${companyTier}-Tier (${job.company})`);
        }

        return {
            matchScore,
            matchedSkills: skillRes.matchedSkills,
            missingSkills: skillRes.missingSkills,
            skillScore: skillRes.score,
            experienceScore: expRes.score,
            educationScore: eduRes.score,
            locationScore: locRes.score,
            preferenceScore: roleRes.score,
            companyTier,
            rank: 1, // Will be assigned during ranking
            reasons,
            breakdown: {
                skills: skillRes.score,
                experience: expRes.score,
                education: eduRes.score,
                location: locRes.score,
                rolePreferences: roleRes.score,
            },
        };
    }

    /**
     * Match and rank a list of jobs according to the loop's criteria.
     */
    matchAndRankJobs<T extends {
        id?: string;
        title: string;
        company: string;
        description?: string | null;
        location: string;
        workMode?: string | null;
        url?: string;
        createdAt?: Date;
    }>(
        candidateContext: CandidateContext,
        jobs: T[],
        loopCriteria?: LoopCriteriaInput,
    ): RankedJobMatch<T>[] {
        if (!jobs || jobs.length === 0) return [];

        const evaluatedList = jobs.map((job) => {
            const scorecard = this.evaluateCandidateForJob(candidateContext, job, loopCriteria);
            return {
                job,
                scorecard,
                matchScore: scorecard.matchScore,
                rank: 1,
            };
        });

        // Ranking strategy
        const strategy = (loopCriteria?.priorityStrategy || "MNC_FIRST").toUpperCase();
        const tierWeights: Record<string, number> = { S: 4, A: 3, B: 2, C: 1 };

        evaluatedList.sort((a, b) => {
            const tierA = tierWeights[a.scorecard.companyTier] || 1;
            const tierB = tierWeights[b.scorecard.companyTier] || 1;

            if (strategy === "MNC_FIRST") {
                // Tier first, then matchScore
                if (tierA !== tierB) return tierB - tierA;
                return b.matchScore - a.matchScore;
            }

            if (strategy === "RECENT_FIRST") {
                const dateA = a.job.createdAt ? new Date(a.job.createdAt).getTime() : 0;
                const dateB = b.job.createdAt ? new Date(b.job.createdAt).getTime() : 0;
                if (dateA !== dateB) return dateB - dateA;
                return b.matchScore - a.matchScore;
            }

            // Default: MATCH_SCORE_FIRST
            if (b.matchScore !== a.matchScore) {
                return b.matchScore - a.matchScore;
            }
            return tierB - tierA;
        });

        // Assign 1-based ranks
        return evaluatedList.map((item, index) => {
            const rank = index + 1;
            item.rank = rank;
            item.scorecard.rank = rank;
            return item;
        });
    }
}

export default new EvaluationService();

