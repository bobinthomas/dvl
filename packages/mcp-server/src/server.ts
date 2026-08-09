import { existsSync, readFileSync } from "node:fs";
import { basename, dirname } from "node:path";
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ComponentSpecSchema, findSpecFiles, specPathForId } from "@ds-platform/core";

function listIds(componentsDir: string): string[] {
  return findSpecFiles(componentsDir).map((specPath) => basename(dirname(specPath)));
}

/**
 * Re-parses and re-validates the spec against ComponentSpecSchema before
 * serving it — an editor pulling this contract into another repo should
 * never receive something that wouldn't itself pass `ds validate`. Returns
 * the canonical, schema-conformant JSON, not a byte-for-byte passthrough of
 * whatever happens to be on disk.
 */
function readSpecJson(componentsDir: string, id: string): string | undefined {
  const specPath = specPathForId(componentsDir, id);
  if (!existsSync(specPath)) return undefined;
  const spec = ComponentSpecSchema.parse(JSON.parse(readFileSync(specPath, "utf-8")));
  return JSON.stringify(spec, null, 2);
}

/**
 * Exposes every component spec in `componentsDir` as an MCP resource under
 * `ds-spec://<id>`, so a product team's editor can pull the governed
 * contract straight from this repo instead of copying it by hand. Pure
 * factory — no transport wiring here — so tests can connect it to an
 * in-memory transport instead of stdio.
 */
export function createSpecServer(componentsDir: string): McpServer {
  const server = new McpServer({ name: "ds-platform-specs", version: "0.1.0" });

  server.registerResource(
    "component-spec",
    new ResourceTemplate("ds-spec://{id}", {
      list: async () => ({
        resources: listIds(componentsDir).map((id) => ({
          uri: `ds-spec://${id}`,
          name: id,
          description: `Design system component spec for "${id}"`,
          mimeType: "application/json",
        })),
      }),
    }),
    {
      title: "Design system component spec",
      description: "A single component's governed spec — the same contract `ds validate` and every generator read.",
      mimeType: "application/json",
    },
    async (uri, variables) => {
      const id = String(variables.id);
      const text = readSpecJson(componentsDir, id);
      if (text === undefined) {
        const available = listIds(componentsDir);
        throw new Error(
          `no component spec found for "${id}". Available: ${available.length > 0 ? available.join(", ") : "(none)"}`
        );
      }
      return { contents: [{ uri: uri.href, mimeType: "application/json", text }] };
    }
  );

  return server;
}
