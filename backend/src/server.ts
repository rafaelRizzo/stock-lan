import cron from "node-cron";
import { buildApp, connectDependencies } from "./app.js";
import { env } from "./config/env.js";
import { runExpenseRecurrenceJob } from "./jobs/expense-recurrence.job.js";

const app = await buildApp();
await connectDependencies();

await runExpenseRecurrenceJob().catch((error) => app.log.error(error, "expense-recurrence job failed"));
cron.schedule("*/10 * * * *", () => {
    runExpenseRecurrenceJob().catch((error) => app.log.error(error, "expense-recurrence job failed"));
});

await app.listen({ host: "0.0.0.0", port: env.PORT });
