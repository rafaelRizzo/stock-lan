import { buildApp, connectDependencies } from "./app.js";
import { env } from "./config/env.js";

const app = await buildApp();
await connectDependencies();
await app.listen({ host: "0.0.0.0", port: env.PORT });
