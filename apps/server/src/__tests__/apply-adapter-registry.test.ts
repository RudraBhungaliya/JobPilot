import test from "node:test";
import assert from "node:assert/strict";
import { ApplyAdapterRegistry } from "../modules/application/adapters/apply-adapter.registry.js";
import type {
  ApplyAdapter,
  ApplyAdapterInput,
  ApplyResult,
} from "../modules/application/adapters/apply-adapter.interface.js";

const BASE_INPUT: ApplyAdapterInput = {
  jobUrl: "https://example.com/job/123",
  userId: "user-1",
  applicationId: "app-1",
};

function makeRegistry(): ApplyAdapterRegistry {
  return new ApplyAdapterRegistry();
}

test("a) 0 adapters -> returns fallback with requiresBrowserFallback=true", async () => {
  const registry = makeRegistry();
  const result = await registry.tryApiApply(BASE_INPUT);

  assert.equal(result.success, false);
  assert.equal(result.requiresBrowserFallback, true);
});

test("b) 1 adapter canApply=true, apply returns success=true -> apply called once, result returned", async () => {
  const registry = makeRegistry();
  let applyCalls = 0;

  const successResult: ApplyResult = {
    success: true,
    confirmationId: "conf-42",
    requiresBrowserFallback: false,
  };

  const adapter: ApplyAdapter = {
    name: "test-adapter",
    canApply: () => true,
    apply: async (input) => {
      applyCalls++;
      return successResult;
    },
  };

  registry.register(adapter);
  const result = await registry.tryApiApply(BASE_INPUT);

  assert.equal(applyCalls, 1);
  assert.equal(result.success, true);
  assert.equal(result.confirmationId, "conf-42");
  assert.equal(result.requiresBrowserFallback, false);
});

test("c) 2 adapters: first canApply=false, second canApply=true with success -> only second's apply called", async () => {
  const registry = makeRegistry();
  let firstApplyCalls = 0;
  let secondApplyCalls = 0;
  let firstCanApplyCalls = 0;
  let secondCanApplyCalls = 0;

  const adapter1: ApplyAdapter = {
    name: "adapter-1",
    canApply: () => {
      firstCanApplyCalls++;
      return false;
    },
    apply: async () => {
      firstApplyCalls++;
      return { success: true, requiresBrowserFallback: false };
    },
  };

  const successResult: ApplyResult = {
    success: true,
    confirmationId: "ok-7",
    requiresBrowserFallback: false,
  };

  const adapter2: ApplyAdapter = {
    name: "adapter-2",
    canApply: () => {
      secondCanApplyCalls++;
      return true;
    },
    apply: async () => {
      secondApplyCalls++;
      return successResult;
    },
  };

  registry.register(adapter1);
  registry.register(adapter2);

  const result = await registry.tryApiApply(BASE_INPUT);

  assert.equal(firstCanApplyCalls, 1);
  assert.equal(firstApplyCalls, 0);
  assert.equal(secondCanApplyCalls, 1);
  assert.equal(secondApplyCalls, 1);
  assert.equal(result.success, true);
  assert.equal(result.confirmationId, "ok-7");
});

test("d) adapter apply() throws -> registry catches, continues, returns fallback (no exception)", async () => {
  const registry = makeRegistry();
  let applyCalls = 0;

  const adapter: ApplyAdapter = {
    name: "throwing-adapter",
    canApply: () => true,
    apply: async () => {
      applyCalls++;
      throw new Error("boom");
    },
  };

  registry.register(adapter);

  const result = await registry.tryApiApply(BASE_INPUT);

  assert.equal(applyCalls, 1);
  assert.equal(result.success, false);
  assert.equal(result.requiresBrowserFallback, true);
});

test("e) adapter returns success=false without throw -> tries later adapters or falls back", async () => {
  const registry = makeRegistry();
  let firstApplyCalls = 0;
  let secondApplyCalls = 0;

  const adapter1: ApplyAdapter = {
    name: "fails-silently",
    canApply: () => true,
    apply: async () => {
      firstApplyCalls++;
      return {
        success: false,
        requiresBrowserFallback: true,
        reason: "some-error",
      };
    },
  };

  const adapter2: ApplyAdapter = {
    name: "succeeds-second",
    canApply: () => true,
    apply: async () => {
      secondApplyCalls++;
      return {
        success: true,
        confirmationId: "final",
        requiresBrowserFallback: false,
      };
    },
  };

  registry.register(adapter1);
  registry.register(adapter2);

  const result = await registry.tryApiApply(BASE_INPUT);

  assert.equal(firstApplyCalls, 1);
  assert.equal(secondApplyCalls, 1);
  assert.equal(result.success, true);
  assert.equal(result.confirmationId, "final");
});

test("e2) adapter returns success=false, no later adapters -> fallback", async () => {
  const registry = makeRegistry();
  let applyCalls = 0;

  const adapter: ApplyAdapter = {
    name: "fails-silently-alone",
    canApply: () => true,
    apply: async () => {
      applyCalls++;
      return { success: false, requiresBrowserFallback: false };
    },
  };

  registry.register(adapter);

  const result = await registry.tryApiApply(BASE_INPUT);

  assert.equal(applyCalls, 1);
  assert.equal(result.success, false);
  assert.equal(result.requiresBrowserFallback, true);
});

test("unregisterAll removes adapters, list returns readonly view", () => {
  const registry = makeRegistry();
  const a1: ApplyAdapter = {
    name: "a",
    canApply: () => true,
    apply: async () => ({ success: false, requiresBrowserFallback: true }),
  };
  const a2: ApplyAdapter = {
    name: "b",
    canApply: () => true,
    apply: async () => ({ success: false, requiresBrowserFallback: true }),
  };

  registry.register(a1);
  registry.register(a2);
  assert.equal(registry.list().length, 2);

  registry.unregisterAll();
  assert.equal(registry.list().length, 0);
});
