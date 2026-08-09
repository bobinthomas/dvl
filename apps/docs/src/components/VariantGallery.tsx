import * as React from "react";
import type { ComponentType } from "react";
import type { ComponentSpec } from "@ds-platform/core/schema";

export function VariantGallery({
  spec,
  Component,
}: {
  spec: ComponentSpec;
  Component: ComponentType<Record<string, unknown>>;
}) {
  const functionProps = spec.props.filter((p) => p.type === "function");
  const hasLabel = spec.anatomy.parts.some((p) => p.name === "label");

  return (
    <div className="gallery">
      {spec.examples.map((example) => {
        const props: Record<string, unknown> = { ...example.props };
        for (const fp of functionProps) {
          if (!(fp.name in props)) props[fp.name] = () => {};
        }
        return (
          <figure key={example.name} style={{ margin: 0 }}>
            <div className="swatch">
              <Component {...props}>{hasLabel ? spec.name : undefined}</Component>
            </div>
            <figcaption className="swatch-caption">{example.name}</figcaption>
          </figure>
        );
      })}
    </div>
  );
}
