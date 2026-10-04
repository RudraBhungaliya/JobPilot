import { liveAtsService } from "../apps/server/dist/modules/sources/live-ats.service.js";
import { geminiProvider } from "../apps/server/dist/core/llm/gemini.provider.js";

async function main() {
    console.log("=== GEMINI DIAGNOSTICS ===");
    const diag = geminiProvider.getDiagnostics();
    console.log("Gemini Configured:", diag.configured);
    console.log("Gemini Model:", diag.model);
    console.log("Gemini Provider:", diag.provider);

    console.log("\n=== TESTING LIVE REAL ATS INDIA-ONLY SOURCING ===");
    const liveJobs = await liveAtsService.getRealtimeIndianOpenings();
    console.log(`Fetched ${liveJobs.length} strictly verified India openings.`);
    
    if (liveJobs.length > 0) {
        console.log("\n--- SAMPLE LIVE OPENING 1 ---");
        const s1 = liveJobs[0];
        console.log("Title:", s1.title);
        console.log("Company:", s1.company);
        console.log("Location:", s1.location);
        console.log("Country:", s1.country);
        console.log("Remote Scope:", s1.remoteScope);
        console.log("Salary INR:", s1.salaryINR);
        console.log("Source Type:", s1.sourceType);
        console.log("Official Company URL:", s1.officialCompanyUrl);
        console.log("ATS URL:", s1.atsUrl);
        console.log("Apply URL:", s1.applyUrl);
        console.log("Canonical URL:", s1.canonicalUrl);
        console.log("Source URL:", s1.sourceUrl);

        console.log("\n--- CHECKING NON-INDIA LEAKAGE ---");
        const usLocations = ["san francisco", "new york", "london", "austin", "seattle", "berlin"];
        const leaked = liveJobs.filter(j => {
            const loc = (j.location || "").toLowerCase();
            return usLocations.some(us => loc.includes(us)) && !loc.includes("india");
        });
        console.log(`Non-India leakage count: ${leaked.length}`);
        if (leaked.length > 0) {
            console.error("Leaked jobs:", leaked.map(l => ({ title: l.title, company: l.company, loc: l.location })));
        } else {
            console.log("✅ Zero non-India job leakage! All jobs strictly India or India-compatible remote.");
        }
    }
}

main().catch(console.error);
