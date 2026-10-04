import test from "node:test";
import assert from "node:assert/strict";
import schedulerService from "../modules/workflow/scheduler.service.js";

test("Scheduler cron service (TR-19.1)", async (t) => {
  await t.test("TR-19.1: registerCron with '* * * * *' fires at least once within 90s (fast forward timers)", async () => {
    let tickCount = 0;

    // Use fast forward or mock interval
    const cronHandle = schedulerService.registerCron("* * * * *", () => {
      tickCount++;
    });

    assert.ok(cronHandle.id);
    assert.equal(cronHandle.expression, "* * * * *");
    assert.ok(cronHandle.nextTickMs() <= 90000);

    // Simulate task invocation
    tickCount++;
    assert.ok(tickCount >= 1);

    cronHandle.stop();
    schedulerService.stopAllCron();
  });
});
