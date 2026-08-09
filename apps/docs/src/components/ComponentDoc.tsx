import * as React from "react";
import type { ComponentEntry } from "../registry.js";
import { sectionEnabled } from "../config.js";
import { Anatomy } from "./Anatomy.js";
import { PropsTable } from "./PropsTable.js";
import { VariantGallery } from "./VariantGallery.js";
import { States } from "./States.js";
import { UsageGuidelines } from "./UsageGuidelines.js";
import { AccessibilityContract } from "./AccessibilityContract.js";
import { TokenMap } from "./TokenMap.js";
import { CodeTabs } from "./CodeTabs.js";
import { Changelog } from "./Changelog.js";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  if (!sectionEnabled(id)) return null;
  return (
    <section className="doc-section" aria-labelledby={`section-${id}`}>
      <h2 id={`section-${id}`}>{title}</h2>
      {children}
    </section>
  );
}

export function ComponentDoc({ entry }: { entry: ComponentEntry }) {
  const { spec, Component } = entry;

  return (
    <article>
      <header className="component-header">
        <span className="kicker">{spec.category}</span>
        <h1 className="display">{spec.name}</h1>
        {sectionEnabled("overview") && <p className="lede">{spec.description}</p>}
        <div style={{ marginTop: "0.75rem" }}>
          <span className="status-pill">{spec.status}</span>
        </div>
      </header>

      <Section id="anatomy" title="Anatomy">
        <Anatomy spec={spec} />
      </Section>

      <Section id="props_table" title="Props">
        <PropsTable spec={spec} />
      </Section>

      <Section id="variants" title="Variant gallery">
        <VariantGallery spec={spec} Component={Component} />
      </Section>

      <Section id="states" title="States">
        <States spec={spec} />
      </Section>

      <Section id="usage_guidelines" title="Usage">
        <UsageGuidelines spec={spec} />
      </Section>

      <Section id="accessibility" title="Accessibility contract">
        <AccessibilityContract spec={spec} />
      </Section>

      <Section id="token_map" title="Token map">
        <TokenMap spec={spec} />
      </Section>

      <Section id="code_examples" title="Code">
        <CodeTabs spec={spec} />
      </Section>

      <Section id="changelog" title="Changelog">
        <Changelog entry={entry} />
      </Section>
    </article>
  );
}
