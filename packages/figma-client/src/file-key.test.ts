import { describe, it, expect } from "vitest";
import { extractFigmaFileKey } from "./file-key.js";

describe("extractFigmaFileKey", () => {
  it("passes a bare key through unchanged", () => {
    expect(extractFigmaFileKey("ANKNyWv3v2bP6eWjpFH3gO")).toBe("ANKNyWv3v2bP6eWjpFH3gO");
  });

  it("trims whitespace off a bare key", () => {
    expect(extractFigmaFileKey("  ANKNyWv3v2bP6eWjpFH3gO  ")).toBe("ANKNyWv3v2bP6eWjpFH3gO");
  });

  it("extracts the key from a /design/ URL with query params", () => {
    expect(
      extractFigmaFileKey(
        "https://www.figma.com/design/ANKNyWv3v2bP6eWjpFH3gO/DV-MVP?node-id=19-4&t=iJYr2vVUfEqz7h7C-4"
      )
    ).toBe("ANKNyWv3v2bP6eWjpFH3gO");
  });

  it("extracts the key from a /file/ URL", () => {
    expect(extractFigmaFileKey("https://www.figma.com/file/ANKNyWv3v2bP6eWjpFH3gO/DV-MVP")).toBe(
      "ANKNyWv3v2bP6eWjpFH3gO"
    );
  });

  it("extracts the key without the www. subdomain", () => {
    expect(extractFigmaFileKey("https://figma.com/file/ANKNyWv3v2bP6eWjpFH3gO/DV-MVP")).toBe(
      "ANKNyWv3v2bP6eWjpFH3gO"
    );
  });
});
