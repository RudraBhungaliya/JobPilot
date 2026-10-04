export interface NormalizedLocation {
    isIndiaCompatible: boolean;
    city: string;
    state?: string;
    country: string;
    region?: string;
    workMode: "Remote" | "Hybrid" | "Onsite";
    isRemote: boolean;
    remoteScope?: "India" | "Worldwide" | "APAC" | "US" | "Europe" | "Other";
    displayLocation: string;
    rawLocation: string;
}

const INDIAN_CITIES: Record<string, { city: string; state: string }> = {
    bengaluru: { city: "Bengaluru", state: "Karnataka" },
    bangalore: { city: "Bengaluru", state: "Karnataka" },
    hyderabad: { city: "Hyderabad", state: "Telangana" },
    secunderabad: { city: "Hyderabad", state: "Telangana" },
    pune: { city: "Pune", state: "Maharashtra" },
    mumbai: { city: "Mumbai", state: "Maharashtra" },
    delhi: { city: "Delhi", state: "Delhi" },
    "new delhi": { city: "New Delhi", state: "Delhi" },
    gurgaon: { city: "Gurgaon", state: "Haryana" },
    gurugram: { city: "Gurgaon", state: "Haryana" },
    noida: { city: "Noida", state: "Uttar Pradesh" },
    "greater noida": { city: "Noida", state: "Uttar Pradesh" },
    chennai: { city: "Chennai", state: "Tamil Nadu" },
    madras: { city: "Chennai", state: "Tamil Nadu" },
    kolkata: { city: "Kolkata", state: "West Bengal" },
    ahmedabad: { city: "Ahmedabad", state: "Gujarat" },
    gandhinagar: { city: "Gandhinagar", state: "Gujarat" },
    jaipur: { city: "Jaipur", state: "Rajasthan" },
    indore: { city: "Indore", state: "Madhya Pradesh" },
    vadodara: { city: "Vadodara", state: "Gujarat" },
    kochi: { city: "Kochi", state: "Kerala" },
    cochin: { city: "Kochi", state: "Kerala" },
    thiruvananthapuram: { city: "Thiruvananthapuram", state: "Kerala" },
    trivandrum: { city: "Thiruvananthapuram", state: "Kerala" },
    chandigarh: { city: "Chandigarh", state: "Punjab / Haryana" },
    mohali: { city: "Mohali", state: "Punjab" },
    coimbatore: { city: "Coimbatore", state: "Tamil Nadu" },
    bhubaneswar: { city: "Bhubaneswar", state: "Odisha" },
    surat: { city: "Surat", state: "Gujarat" },
    nagpur: { city: "Nagpur", state: "Maharashtra" },
    visakhapatnam: { city: "Visakhapatnam", state: "Andhra Pradesh" },
    mysore: { city: "Mysuru", state: "Karnataka" },
    mysuru: { city: "Mysuru", state: "Karnataka" },
    calicut: { city: "Kozhikode", state: "Kerala" },
    kozhikode: { city: "Kozhikode", state: "Kerala" },
};

const EXPLICIT_NON_INDIA_REGIONS = [
    "united states",
    "usa",
    "u.s.",
    "us only",
    "san francisco",
    "new york",
    "seattle",
    "austin",
    "california",
    "texas",
    "washington",
    "united kingdom",
    "uk",
    "london",
    "europe",
    "emea",
    "germany",
    "berlin",
    "canada",
    "toronto",
    "vancouver",
    "australia",
    "sydney",
    "latin america",
    "latam",
    "brazil",
    "mexico",
    "france",
    "paris",
    "japan",
    "tokyo",
    "singapore only",
];

class LocationPolicyService {
    /**
     * Parse, normalize, and evaluate if a job opening is India or India-compatible
     */
    evaluateLocation(rawLoc: string | undefined | null, title?: string, companyCityDefault?: string): NormalizedLocation {
        const raw = (rawLoc || "").trim();
        const lowerRaw = raw.toLowerCase();
        const lowerTitle = (title || "").toLowerCase();
        const combined = `${lowerRaw} ${lowerTitle}`;

        const isExplicitRemote =
            lowerRaw.includes("remote") ||
            lowerRaw.includes("anywhere") ||
            lowerRaw.includes("worldwide") ||
            lowerRaw.includes("global") ||
            lowerTitle.includes("remote");

        // 1. Check for explicit Non-India location constraints
        const hasNonIndiaConstraint = EXPLICIT_NON_INDIA_REGIONS.some((region) => {
            const regex = new RegExp(`\\b${region}\\b`, "i");
            return regex.test(lowerRaw);
        });

        // 2. Check for explicit India mentions
        const hasExplicitIndia =
            /\bindia\b/i.test(lowerRaw) ||
            /\b(?:,\s*in|\(in\))\b/i.test(lowerRaw) ||
            /\bindia\b/i.test(lowerTitle);

        // 3. Match against known Indian Cities
        let matchedCityMeta: { city: string; state: string } | null = null;
        for (const [key, meta] of Object.entries(INDIAN_CITIES)) {
            const regex = new RegExp(`\\b${key}\\b`, "i");
            if (regex.test(lowerRaw)) {
                matchedCityMeta = meta;
                break;
            }
        }

        // Check if company has an India hub default provided
        if (!matchedCityMeta && companyCityDefault) {
            const lowerDefault = companyCityDefault.toLowerCase();
            for (const [key, meta] of Object.entries(INDIAN_CITIES)) {
                if (lowerDefault.includes(key)) {
                    matchedCityMeta = meta;
                    break;
                }
            }
        }

        // 4. Remote Scope Evaluation
        let remoteScope: NormalizedLocation["remoteScope"] = undefined;
        let isIndiaCompatible = false;

        if (isExplicitRemote) {
            if (hasExplicitIndia || (matchedCityMeta && !hasNonIndiaConstraint)) {
                remoteScope = "India";
                isIndiaCompatible = true;
            } else if (
                lowerRaw.includes("worldwide") ||
                lowerRaw.includes("global") ||
                lowerRaw.includes("anywhere") ||
                lowerRaw.includes("apac") ||
                lowerRaw.includes("all locations")
            ) {
                if (!hasNonIndiaConstraint) {
                    remoteScope = lowerRaw.includes("apac") ? "APAC" : "Worldwide";
                    isIndiaCompatible = true;
                } else {
                    remoteScope = "Other";
                    isIndiaCompatible = false;
                }
            } else if (hasNonIndiaConstraint) {
                remoteScope = lowerRaw.includes("us") || lowerRaw.includes("united states") ? "US" : "Other";
                isIndiaCompatible = false;
            } else {
                // Remote without geography qualifier: default to incompatible unless India is stated
                remoteScope = "Other";
                isIndiaCompatible = false;
            }
        } else {
            // Physical / Hybrid / Onsite job
            if (matchedCityMeta && !hasNonIndiaConstraint) {
                isIndiaCompatible = true;
            } else if (hasExplicitIndia && !hasNonIndiaConstraint) {
                isIndiaCompatible = true;
            } else {
                isIndiaCompatible = false;
            }
        }

        // 5. Final normalization fields
        const city = matchedCityMeta?.city || (isExplicitRemote ? "Remote India" : raw || "India");
        const state = matchedCityMeta?.state || undefined;
        const workMode: "Remote" | "Hybrid" | "Onsite" = isExplicitRemote
            ? "Remote"
            : lowerRaw.includes("hybrid")
            ? "Hybrid"
            : "Onsite";

        const displayLocation = isExplicitRemote
            ? `Remote (${remoteScope === "Worldwide" ? "Global" : matchedCityMeta?.city || "India"})`
            : matchedCityMeta
            ? `${matchedCityMeta.city}, India`
            : raw || "India";

        return {
            isIndiaCompatible,
            city,
            state,
            country: "India",
            region: state,
            workMode,
            isRemote: isExplicitRemote,
            remoteScope,
            displayLocation,
            rawLocation: raw,
        };
    }
}

export const locationPolicyService = new LocationPolicyService();
export default locationPolicyService;
