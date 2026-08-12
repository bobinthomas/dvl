import { describe, it, expect, vi, afterEach } from "vitest";
import { createFigmaRestClient } from "./client.js";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

describe("createFigmaRestClient", () => {
  it("sends the X-Figma-Token header and requests the right path for getFile", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify({ name: "My File", document: { id: "0:0", name: "Document", type: "DOCUMENT" } }), { status: 200 })
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = createFigmaRestClient({ accessToken: "test-token" });
    const file = await client.getFile("abc123");

    expect(file.name).toBe("My File");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.figma.com/v1/files/abc123");
    expect(init?.headers).toMatchObject({ "X-Figma-Token": "test-token" });
  });

  it("requests the variables/local path for getLocalVariables", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify({ meta: { variables: {}, variableCollections: {} } }), { status: 200 })
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = createFigmaRestClient({ accessToken: "test-token" });
    await client.getLocalVariables("abc123");

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.figma.com/v1/files/abc123/variables/local");
  });

  it("throws a descriptive error on a non-ok response", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response("not found", { status: 404, statusText: "Not Found" })
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = createFigmaRestClient({ accessToken: "test-token" });
    await expect(client.getFile("missing")).rejects.toThrow(/404/);
  });
});
