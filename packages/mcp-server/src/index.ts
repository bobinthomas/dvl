import { join } from "node:path";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createSpecServer } from "./server.js";

export { createSpecServer } from "./server.js";

export async function runStdioServer(cwd: string = process.cwd()): Promise<void> {
  const server = createSpecServer(join(cwd, "components"));
  await server.connect(new StdioServerTransport());
}
