import * as React from "react";
import type { ComponentSpec } from "@ds-platform/core/schema";
import { resolveToken } from "@ds-platform/core/tokens";
import { contrastRatio } from "@ds-platform/core/contrast";
import { tokens } from "../tokens.js";

export function AccessibilityContract({ spec }: { spec: ComponentSpec }) {
  const { accessibility } = spec;
  const keyboardEntries = Object.entries(accessibility.keyboard);

  return (
    <div className="prose">
      <dl className="kv-list">
        <dt>Role</dt>
        <dd>
          <code>{accessibility.role}</code>
        </dd>
      </dl>

      {keyboardEntries.length > 0 && (
        <>
          <h3 style={{ marginTop: "1.5rem" }}>Keyboard</h3>
          <dl className="kv-list">
            {keyboardEntries.map(([key, action]) => (
              <React.Fragment key={key}>
                <dt>
                  <code>{key}</code>
                </dt>
                <dd>{action}</dd>
              </React.Fragment>
            ))}
          </dl>
        </>
      )}

      {accessibility.aria.length > 0 && (
        <>
          <h3 style={{ marginTop: "1.5rem" }}>ARIA</h3>
          <dl className="kv-list">
            {accessibility.aria.map((a) => (
              <React.Fragment key={a.attribute}>
                <dt>
                  <code>{a.attribute}</code>
                </dt>
                <dd>{a.condition}</dd>
              </React.Fragment>
            ))}
          </dl>
        </>
      )}

      {accessibility.contrast.length > 0 && (
        <>
          <h3 style={{ marginTop: "1.5rem" }}>Contrast</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Part</th>
                <th>Foreground</th>
                <th>Background</th>
                <th>Ratio</th>
              </tr>
            </thead>
            <tbody>
              {accessibility.contrast.map((pair, i) => {
                const fg = resolveToken(pair.foreground, tokens);
                const bg = resolveToken(pair.background, tokens);
                const ratio = contrastRatio(String(fg.value), String(bg.value));
                const passes = ratio >= pair.minRatio;
                return (
                  <tr key={i}>
                    <td>
                      <code>{pair.part}</code>
                    </td>
                    <td>
                      <code>{pair.foreground}</code>
                    </td>
                    <td>
                      <code>{pair.background}</code>
                    </td>
                    <td className={passes ? "contrast-pass" : "contrast-fail"}>
                      {ratio.toFixed(2)}:1 {passes ? "AA pass" : `below ${pair.minRatio}:1`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}

      {accessibility.requirements.length > 0 && (
        <>
          <h3 style={{ marginTop: "1.5rem" }}>Requirements</h3>
          <ul className="requirement-list">
            {accessibility.requirements.map((req, i) => (
              <li key={i}>{req}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
