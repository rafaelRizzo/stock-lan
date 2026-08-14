import cron from "node-cron";
import { buildApp, connectDependencies } from "./app.js";
import { env } from "./config/env.js";
import { runExpenseRecurrenceJob, runExpenseUpcomingNotificationJob } from "./jobs/expense-recurrence.job.js";

const app = await buildApp();
await connectDependencies();

async function runExpenseJobs() {
    await runExpenseRecurrenceJob().catch((error) => app.log.error(error, "expense-recurrence job failed"));
    await runExpenseUpcomingNotificationJob().catch((error) =>
        app.log.error(error, "expense-upcoming-notification job failed"),
    );
}

await runExpenseJobs();
cron.schedule("*/10 * * * *", () => {
    runExpenseJobs();
});

await app.listen({ host: "0.0.0.0", port: env.PORT });
