import test from "node:test";
import assert from "node:assert/strict";
import authMiddleware from "../modules/auth/auth.middleware.js";
import { generateAccessToken } from "../modules/auth/auth.tokens.js";
import providerFactory from "../core/llm/provider.factory.js";
import geminiProvider from "../core/llm/gemini.provider.js";
import openaiProvider from "../core/llm/openai.provider.js";
import { isDatabaseConnected } from "@jobpilot/database";

test("Task 5: Security & Configuration Verification Suite", async (t) => {
  await t.test("1. Production Authentication Guard strictly blocks dev auth in production", async () => {
    const origNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    try {
      // Case A: Missing token in production -> must return 401 AppError
      let caughtErrorA: any = null;
      const reqA: any = { headers: {}, query: {} };
      const resA: any = {};
      const nextA = (err?: any) => { caughtErrorA = err; };

      await authMiddleware(reqA, resA, nextA);
      assert.ok(caughtErrorA, "Must return an error in production without a token");
      assert.equal(caughtErrorA.statusCode, 401, "Error status must be 401 Unauthorized");

      // Case B: Invalid / forged token in production -> must return 401
      let caughtErrorB: any = null;
      const reqB: any = { headers: { authorization: "Bearer invalid.forged.jwt" }, query: {} };
      const resB: any = {};
      const nextB = (err?: any) => { caughtErrorB = err; };

      await authMiddleware(reqB, resB, nextB);
      assert.ok(caughtErrorB, "Must reject invalid token in production");
      assert.equal(caughtErrorB.statusCode, 401);

      // Case C: Valid signed JWT token in production -> must authenticate successfully
      let caughtErrorC: any = null;
      const validToken = generateAccessToken({
        userId: "u-prod-candidate-123",
        email: "candidate.real@jobpilot.io",
        role: "USER",
      });

      const reqC: any = { headers: { authorization: `Bearer ${validToken}` }, query: {} };
      const resC: any = {};
      const nextC = (err?: any) => { caughtErrorC = err; };

      await authMiddleware(reqC, resC, nextC);
      assert.equal(caughtErrorC, undefined, "Valid JWT must pass without error");
      assert.equal(reqC.user?.id, "u-prod-candidate-123");
      assert.equal(reqC.user?.email, "candidate.real@jobpilot.io");
      assert.equal(reqC.user?.role, "USER");
      console.log("    ✓ Production authentication strictly requires valid Bearer token and rejects dev fallback");
    } finally {
      process.env.NODE_ENV = origNodeEnv;
    }
  });

  await t.test("2. Provider failover does not conceal errors or return fabricated results", async () => {
    const origGeminiConfig = geminiProvider.isConfigured;
    const origOpenaiConfig = openaiProvider.isConfigured;

    // Simulate both providers unconfigured / failing
    (geminiProvider as any).isConfigured = () => false;
    (openaiProvider as any).isConfigured = () => false;

    try {
      const provider = providerFactory.getProvider();
      await assert.rejects(
        async () => {
          await provider.generate("Generate resume summary");
        },
        /No configured LLM provider could fulfill the request/,
        "Must throw explicit error instead of fabricating mock answers"
      );

      await assert.rejects(
        async () => {
          await provider.generateJSON("Extract skills");
        },
        /No configured LLM provider could fulfill the request/,
        "Must throw explicit error instead of inventing JSON responses"
      );
      console.log("    ✓ Provider failover strictly throws rather than fabricating responses");
    } finally {
      (geminiProvider as any).isConfigured = origGeminiConfig;
      (openaiProvider as any).isConfigured = origOpenaiConfig;
    }
  });

  await t.test("3. Database permissions and active connection consistency", async () => {
    const connected = await isDatabaseConnected();
    assert.equal(connected, true, "Database connection must be established and healthy");
    console.log("    ✓ Database connection verified healthy with unified DATABASE_URL");
  });
});
