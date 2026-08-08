import { readFileSync } from "node:fs";
import { join } from "node:path";
import StyleDictionary from "style-dictionary";

/**
 * Compiles tokens/tokens.json to CSS custom properties via Style
 * Dictionary, writing into `outDir/tokens.css` and returning its contents.
 * Style Dictionary's `css` transform group kebab-cases token paths the
 * same way naming.ts's `tokenRefToCssVar` does, so a binding's `var(--...)`
 * reference always lines up with a name defined here.
 */
export async function compileTokensToCss(tokensPath: string, outDir: string): Promise<string> {
  const sd = new StyleDictionary({
    source: [tokensPath],
    platforms: {
      css: {
        transformGroup: "css",
        buildPath: `${outDir}/`,
        files: [
          {
            destination: "tokens.css",
            format: "css/variables",
            options: {
              fileHeader: () => [
                "GENERATED FILE. Do not edit by hand.",
                "Source: tokens/tokens.json, compiled by Style Dictionary.",
                "Regenerate with `ds build`.",
              ],
            },
          },
        ],
      },
    },
  });
  await sd.buildAllPlatforms();
  return readFileSync(join(outDir, "tokens.css"), "utf-8");
}
