import browserService from "../browser/browser.service.js";
import type {
    ParsedJob,
    RawJob,
    JobPlatform,
} from "./crawler.types.js";

interface PlatformSelectors {
    title: string[];
    company: string[];
    location: string[];
    description: string[];
}

const SELECTOR_REGISTRY: Record<JobPlatform, PlatformSelectors> = {
    GREENHOUSE: {
        title: ["h1.app-title", ".app-title", "h1"],
        company: ["span.company-name", ".company-name", ".logo-container img"],
        location: [".location", ".job-location"],
        description: ["#content", ".content", "#main-content"]
    },
    LEVER: {
        title: [".posting-header h2", "h2"],
        company: [".posting-header", "title"],
        location: [".location", ".posting-categories .location"],
        description: [".section.page-centered", ".posting-description", "body"]
    },
    WORKDAY: {
        title: ["[data-automation-id='jobPostingHeader']", "h1"],
        company: ["[data-automation-id='companyName']", ".companyName"],
        location: ["[data-automation-id='location']", ".location"],
        description: ["[data-automation-id='jobDescription']", ".job-description", "body"]
    },
    ASHBY: {
        title: ["h1", "h2"],
        company: [".company", "[class*='company']"],
        location: [".location", "[class*='location']"],
        description: [".description", "[class*='description']", ".job-description"]
    },
    SMARTRECRUITERS: {
        title: ["h1.job-title", "#job-title", "h1"],
        company: [".company-name", ".company"],
        location: [".job-location", ".location"],
        description: [".job-sections", ".description"]
    },
    ICIMS: {
        title: ["h1#iCIMS_Header", ".iCIMS_JobHeader", "h1"],
        company: [".iCIMS_JobHeader company", "title"],
        location: ["[class*='location']", ".location"],
        description: [".iCIMS_JobDescription", "body"]
    },
    JOBVITE: {
        title: [".jv-job-detail-title", "h2", "h1"],
        company: [".jv-job-detail-company", "title"],
        location: [".jv-job-detail-location", ".location"],
        description: [".jv-job-detail-description", "body"]
    },
    BAMBOOHR: {
        title: ["h2", "h1"],
        company: [".company-name", "title"],
        location: [".location"],
        description: [".job-description", "body"]
    },
    TALEO: {
        title: ["h1", "h2"],
        company: [".company", "title"],
        location: [".location"],
        description: [".description", "body"]
    },
    UNKNOWN: {
        title: ["h1", "h2", "title"],
        company: ["meta[property='og:site_name']", ".company", ".brand", "title"],
        location: [".location", "[class*='location']", "[class*='address']"],
        description: ["article", "main", "body"]
    }
};

class ParserService {
    async parse(
        job: RawJob,
    ): Promise<ParsedJob> {
        if (!job.html) {
            throw new Error("The job page has no readable HTML content.");
        }

        const page = await browserService.newPage();
        try {
            await page.setContent(job.html);

            const selectors = SELECTOR_REGISTRY[job.platform] || SELECTOR_REGISTRY.UNKNOWN;

            const extract = async (selectorList: string[]): Promise<string> => {
                for (const sel of selectorList) {
                    try {
                        const content = await page.evaluate((selector) => {
                            if (selector.startsWith("meta[")) {
                                const meta = document.querySelector(selector);
                                return meta ? meta.getAttribute("content") || "" : "";
                            }
                            const el = document.querySelector(selector);
                            return el ? (el as HTMLElement).innerText || el.textContent || "" : "";
                        }, sel);

                        if (content && content.trim()) {
                            return content.trim();
                        }
                    } catch {
                        // ignore error and try next selector
                    }
                }
                return "";
            };

            const title = await extract(selectors.title);
            let company = await extract(selectors.company);
            const location = await extract(selectors.location);
            const description = await extract(selectors.description) || "";

            if (company.includes("|") || company.includes("-")) {
                const parts = company.split(/[-|]/);
                if (parts.length > 1) {
                    company = parts[parts.length - 1].trim();
                }
            }

            if (!title || !company) throw new Error("The job page did not expose a title and company.");
            return {
                title,
                company,
                location,
                description,
                url: job.url,
                platform: job.platform,
            };
        } catch (error) {
            throw error;
        } finally {
            await page.close();
        }
    }
}

export default new ParserService();
