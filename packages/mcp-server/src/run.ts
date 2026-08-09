import { runStdioServer } from "./index.js";

runStdioServer().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
