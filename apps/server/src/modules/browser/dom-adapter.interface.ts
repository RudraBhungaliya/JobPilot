import type { Page } from "playwright";
import type { ApplyAdapterInput, ApplyResult } from "../application/adapters/apply-adapter.interface.js";

export interface DomAtsAdapter {
  name: string;
  /** Detect if page is served by this ATS by inspecting DOM (url, meta, scripts, selectors) */
  detect(page: Page): Promise<boolean> | boolean;
  /** Fill form and submit; handles multi-step navigation internally */
  apply(page: Page, input: ApplyAdapterInput): Promise<ApplyResult>;
  /** How many distinct fields were filled (for test assertions like TR-11.2 fill ≥ 10) */
  lastFillCount?: number;
}

export type DomAtsDetectorName = "greenhouse" | "lever" | "workday" | "ashby" | "successfactors";
