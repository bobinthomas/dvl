import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { ComponentSpecSchema } from "@ds-platform/core";
import { createSpecServer } from "./server.js";

function textOf(content: { text?: string; blob?: string }): string {
  if (content.text === undefined) throw new Error("expected a text resource content, got blob");
  return content.text;
}

const repoRoot = join(__dirname, "..", "..", "..");
const componentsDir = join(repoRoot, "components");

/**
 * Connects a real MCP Client to a real McpServer over an in-memory transport
 * pair — actual protocol messages (initialize handshake, resources/list,
 * resources/read) flow between them, just without a subprocess boundary.
 * This is genuine live verification of the server, not a mock of the SDK.
 */
async function connectedClient(): Promise<Client> {
  const server = createSpecServer(componentsDir);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test-client", version: "0.0.0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

describe("createSpecServer (MCP)", () => {
  it("lists the real button component as a resource", async () => {
    const client = await connectedClient();
    const { resources } = await client.listResources();

    expect(resources.map((r) => r.uri)).toContain("ds-spec://button");
    const button = resources.find((r) => r.uri === "ds-spec://button")!;
    expect(button.mimeType).toBe("application/json");
    expect(button.name).toBe("button");
  });

  it("reads the real button spec, schema-equivalent to the spec on disk", async () => {
    const client = await connectedClient();
    const { contents } = await client.readResource({ uri: "ds-spec://button" });

    expect(contents).toHaveLength(1);
    const served = JSON.parse(textOf(contents[0]));

    const onDisk = ComponentSpecSchema.parse(
      JSON.parse(readFileSync(join(componentsDir, "button", "spec.json"), "utf-8"))
    );
    expect(served).toEqual(onDisk);
    expect(contents[0].mimeType).toBe("application/json");
  });

  it("rejects an unknown component id with a clear error, not a crash", async () => {
    const client = await connectedClient();
    await expect(client.readResource({ uri: "ds-spec://does-not-exist" })).rejects.toThrow(/does-not-exist/);
  });

  it("serves a spec that itself passes ComponentSpecSchema validation", async () => {
    const client = await connectedClient();
    const { contents } = await client.readResource({ uri: "ds-spec://button" });
    const served = JSON.parse(textOf(contents[0]));
    expect(() => ComponentSpecSchema.parse(served)).not.toThrow();
  });
});
