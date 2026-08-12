/**
 * GENERATED FILE. Do not edit by hand — your changes will be silently
 * overwritten. Source: components/status-indicator/spec.json (version 1.0.0).
 * Regenerate with `ds build status-indicator`.
 * 
 * Figma plugin code, not application code. Load this file (compiled to
 * JS) as a plugin's code.js against the sibling manifest.json, inside
 * Figma's desktop or web app. Plugins run in Figma's own sandbox — there
 * is no headless runtime, so this cannot be executed or verified outside
 * Figma itself. Per BUILD-PROMPT: never use the Figma REST API here, it
 * cannot create components — only the Plugin API can.
 */

function getOrCreateVariableCollection(name: string): VariableCollection {
  return figma.variables.getLocalVariableCollections().find((c) => c.name === name) ?? figma.variables.createVariableCollection(name);
}

function getOrCreateVariable(
  collection: VariableCollection,
  name: string,
  type: VariableResolvedDataType,
  value: VariableValue
): Variable {
  const existing = figma.variables
    .getLocalVariables()
    .find((v) => v.name === name && v.variableCollectionId === collection.id);
  const variable = existing ?? figma.variables.createVariable(name, collection, type);
  variable.setValueForMode(collection.modes[0].modeId, value);
  return variable;
}

function bindColor(variable: Variable): SolidPaint {
  const paint: SolidPaint = { type: "SOLID", color: { r: 0, g: 0, b: 0 } };
  return figma.variables.setBoundVariableForPaint(paint, "color", variable) as SolidPaint;
}

async function main(): Promise<void> {
  const collection = getOrCreateVariableCollection("Design Tokens");

  const var_color_action_primary_default_bg = getOrCreateVariable(collection, "color/action/primary/default/bg", "COLOR", {"r":0,"g":0.3215686274509804,"b":0.8});
  const var_color_brand_neutral_0 = getOrCreateVariable(collection, "color/brand/neutral/0", "COLOR", {"r":1,"g":1,"b":1});
  const var_color_brand_neutral_900 = getOrCreateVariable(collection, "color/brand/neutral/900", "COLOR", {"r":0.09019607843137255,"g":0.16862745098039217,"b":0.30196078431372547});
  const var_fontSize_sm = getOrCreateVariable(collection, "fontSize/sm", "FLOAT", 13);

  await figma.loadFontAsync({ family: "Inter", style: "Regular" });

  const variants: ComponentNode[] = [];

  {
    const root0 = figma.createComponent();
    root0.name = "variant=primary, size=small, state=default";
    root0.layoutMode = "HORIZONTAL";
    root0.primaryAxisAlignItems = "CENTER";
    root0.counterAxisAlignItems = "CENTER";
    root0.primaryAxisSizingMode = "AUTO";
    root0.counterAxisSizingMode = "AUTO";
    const label0 = figma.createText();
    label0.characters = "StatusIndicator";
    label0.fills = [bindColor(var_color_brand_neutral_900)];
    label0.setBoundVariable("fontSize", var_fontSize_sm);
    root0.appendChild(label0);
    variants.push(root0);
  }
  {
    const root1 = figma.createComponent();
    root1.name = "variant=primary, size=small, state=loading";
    root1.layoutMode = "HORIZONTAL";
    root1.primaryAxisAlignItems = "CENTER";
    root1.counterAxisAlignItems = "CENTER";
    root1.primaryAxisSizingMode = "AUTO";
    root1.counterAxisSizingMode = "AUTO";
    const label1 = figma.createText();
    label1.characters = "StatusIndicator";
    label1.fills = [bindColor(var_color_brand_neutral_900)];
    label1.setBoundVariable("fontSize", var_fontSize_sm);
    root1.appendChild(label1);
    variants.push(root1);
  }
  {
    const root2 = figma.createComponent();
    root2.name = "variant=primary, size=medium, state=default";
    root2.layoutMode = "HORIZONTAL";
    root2.primaryAxisAlignItems = "CENTER";
    root2.counterAxisAlignItems = "CENTER";
    root2.primaryAxisSizingMode = "AUTO";
    root2.counterAxisSizingMode = "AUTO";
    const label2 = figma.createText();
    label2.characters = "StatusIndicator";
    label2.fills = [bindColor(var_color_brand_neutral_900)];
    label2.setBoundVariable("fontSize", var_fontSize_sm);
    root2.appendChild(label2);
    variants.push(root2);
  }
  {
    const root3 = figma.createComponent();
    root3.name = "variant=primary, size=medium, state=loading";
    root3.layoutMode = "HORIZONTAL";
    root3.primaryAxisAlignItems = "CENTER";
    root3.counterAxisAlignItems = "CENTER";
    root3.primaryAxisSizingMode = "AUTO";
    root3.counterAxisSizingMode = "AUTO";
    const label3 = figma.createText();
    label3.characters = "StatusIndicator";
    label3.fills = [bindColor(var_color_brand_neutral_900)];
    label3.setBoundVariable("fontSize", var_fontSize_sm);
    root3.appendChild(label3);
    variants.push(root3);
  }
  {
    const root4 = figma.createComponent();
    root4.name = "variant=primary, size=large, state=default";
    root4.layoutMode = "HORIZONTAL";
    root4.primaryAxisAlignItems = "CENTER";
    root4.counterAxisAlignItems = "CENTER";
    root4.primaryAxisSizingMode = "AUTO";
    root4.counterAxisSizingMode = "AUTO";
    const label4 = figma.createText();
    label4.characters = "StatusIndicator";
    label4.fills = [bindColor(var_color_brand_neutral_900)];
    label4.setBoundVariable("fontSize", var_fontSize_sm);
    root4.appendChild(label4);
    variants.push(root4);
  }
  {
    const root5 = figma.createComponent();
    root5.name = "variant=primary, size=large, state=loading";
    root5.layoutMode = "HORIZONTAL";
    root5.primaryAxisAlignItems = "CENTER";
    root5.counterAxisAlignItems = "CENTER";
    root5.primaryAxisSizingMode = "AUTO";
    root5.counterAxisSizingMode = "AUTO";
    const label5 = figma.createText();
    label5.characters = "StatusIndicator";
    label5.fills = [bindColor(var_color_brand_neutral_900)];
    label5.setBoundVariable("fontSize", var_fontSize_sm);
    root5.appendChild(label5);
    variants.push(root5);
  }
  {
    const root6 = figma.createComponent();
    root6.name = "variant=success, size=small, state=default";
    root6.layoutMode = "HORIZONTAL";
    root6.primaryAxisAlignItems = "CENTER";
    root6.counterAxisAlignItems = "CENTER";
    root6.primaryAxisSizingMode = "AUTO";
    root6.counterAxisSizingMode = "AUTO";
    const label6 = figma.createText();
    label6.characters = "StatusIndicator";
    label6.fills = [bindColor(var_color_brand_neutral_900)];
    label6.setBoundVariable("fontSize", var_fontSize_sm);
    root6.appendChild(label6);
    variants.push(root6);
  }
  {
    const root7 = figma.createComponent();
    root7.name = "variant=success, size=medium, state=default";
    root7.layoutMode = "HORIZONTAL";
    root7.primaryAxisAlignItems = "CENTER";
    root7.counterAxisAlignItems = "CENTER";
    root7.primaryAxisSizingMode = "AUTO";
    root7.counterAxisSizingMode = "AUTO";
    const label7 = figma.createText();
    label7.characters = "StatusIndicator";
    label7.fills = [bindColor(var_color_brand_neutral_900)];
    label7.setBoundVariable("fontSize", var_fontSize_sm);
    root7.appendChild(label7);
    variants.push(root7);
  }
  {
    const root8 = figma.createComponent();
    root8.name = "variant=success, size=large, state=default";
    root8.layoutMode = "HORIZONTAL";
    root8.primaryAxisAlignItems = "CENTER";
    root8.counterAxisAlignItems = "CENTER";
    root8.primaryAxisSizingMode = "AUTO";
    root8.counterAxisSizingMode = "AUTO";
    const label8 = figma.createText();
    label8.characters = "StatusIndicator";
    label8.fills = [bindColor(var_color_brand_neutral_900)];
    label8.setBoundVariable("fontSize", var_fontSize_sm);
    root8.appendChild(label8);
    variants.push(root8);
  }
  {
    const root9 = figma.createComponent();
    root9.name = "variant=error, size=small, state=default";
    root9.layoutMode = "HORIZONTAL";
    root9.primaryAxisAlignItems = "CENTER";
    root9.counterAxisAlignItems = "CENTER";
    root9.primaryAxisSizingMode = "AUTO";
    root9.counterAxisSizingMode = "AUTO";
    const label9 = figma.createText();
    label9.characters = "StatusIndicator";
    label9.fills = [bindColor(var_color_brand_neutral_900)];
    label9.setBoundVariable("fontSize", var_fontSize_sm);
    root9.appendChild(label9);
    variants.push(root9);
  }
  {
    const root10 = figma.createComponent();
    root10.name = "variant=error, size=medium, state=default";
    root10.layoutMode = "HORIZONTAL";
    root10.primaryAxisAlignItems = "CENTER";
    root10.counterAxisAlignItems = "CENTER";
    root10.primaryAxisSizingMode = "AUTO";
    root10.counterAxisSizingMode = "AUTO";
    const label10 = figma.createText();
    label10.characters = "StatusIndicator";
    label10.fills = [bindColor(var_color_brand_neutral_900)];
    label10.setBoundVariable("fontSize", var_fontSize_sm);
    root10.appendChild(label10);
    variants.push(root10);
  }
  {
    const root11 = figma.createComponent();
    root11.name = "variant=error, size=large, state=default";
    root11.layoutMode = "HORIZONTAL";
    root11.primaryAxisAlignItems = "CENTER";
    root11.counterAxisAlignItems = "CENTER";
    root11.primaryAxisSizingMode = "AUTO";
    root11.counterAxisSizingMode = "AUTO";
    const label11 = figma.createText();
    label11.characters = "StatusIndicator";
    label11.fills = [bindColor(var_color_brand_neutral_900)];
    label11.setBoundVariable("fontSize", var_fontSize_sm);
    root11.appendChild(label11);
    variants.push(root11);
  }
  {
    const root12 = figma.createComponent();
    root12.name = "variant=loading, size=small, state=default";
    root12.layoutMode = "HORIZONTAL";
    root12.primaryAxisAlignItems = "CENTER";
    root12.counterAxisAlignItems = "CENTER";
    root12.primaryAxisSizingMode = "AUTO";
    root12.counterAxisSizingMode = "AUTO";
    const label12 = figma.createText();
    label12.characters = "StatusIndicator";
    label12.fills = [bindColor(var_color_brand_neutral_900)];
    label12.setBoundVariable("fontSize", var_fontSize_sm);
    root12.appendChild(label12);
    variants.push(root12);
  }
  {
    const root13 = figma.createComponent();
    root13.name = "variant=loading, size=small, state=loading";
    root13.layoutMode = "HORIZONTAL";
    root13.primaryAxisAlignItems = "CENTER";
    root13.counterAxisAlignItems = "CENTER";
    root13.primaryAxisSizingMode = "AUTO";
    root13.counterAxisSizingMode = "AUTO";
    const label13 = figma.createText();
    label13.characters = "StatusIndicator";
    label13.fills = [bindColor(var_color_brand_neutral_900)];
    label13.setBoundVariable("fontSize", var_fontSize_sm);
    root13.appendChild(label13);
    variants.push(root13);
  }
  {
    const root14 = figma.createComponent();
    root14.name = "variant=loading, size=medium, state=default";
    root14.layoutMode = "HORIZONTAL";
    root14.primaryAxisAlignItems = "CENTER";
    root14.counterAxisAlignItems = "CENTER";
    root14.primaryAxisSizingMode = "AUTO";
    root14.counterAxisSizingMode = "AUTO";
    const label14 = figma.createText();
    label14.characters = "StatusIndicator";
    label14.fills = [bindColor(var_color_brand_neutral_900)];
    label14.setBoundVariable("fontSize", var_fontSize_sm);
    root14.appendChild(label14);
    variants.push(root14);
  }
  {
    const root15 = figma.createComponent();
    root15.name = "variant=loading, size=medium, state=loading";
    root15.layoutMode = "HORIZONTAL";
    root15.primaryAxisAlignItems = "CENTER";
    root15.counterAxisAlignItems = "CENTER";
    root15.primaryAxisSizingMode = "AUTO";
    root15.counterAxisSizingMode = "AUTO";
    const label15 = figma.createText();
    label15.characters = "StatusIndicator";
    label15.fills = [bindColor(var_color_brand_neutral_900)];
    label15.setBoundVariable("fontSize", var_fontSize_sm);
    root15.appendChild(label15);
    variants.push(root15);
  }
  {
    const root16 = figma.createComponent();
    root16.name = "variant=loading, size=large, state=default";
    root16.layoutMode = "HORIZONTAL";
    root16.primaryAxisAlignItems = "CENTER";
    root16.counterAxisAlignItems = "CENTER";
    root16.primaryAxisSizingMode = "AUTO";
    root16.counterAxisSizingMode = "AUTO";
    const label16 = figma.createText();
    label16.characters = "StatusIndicator";
    label16.fills = [bindColor(var_color_brand_neutral_900)];
    label16.setBoundVariable("fontSize", var_fontSize_sm);
    root16.appendChild(label16);
    variants.push(root16);
  }
  {
    const root17 = figma.createComponent();
    root17.name = "variant=loading, size=large, state=loading";
    root17.layoutMode = "HORIZONTAL";
    root17.primaryAxisAlignItems = "CENTER";
    root17.counterAxisAlignItems = "CENTER";
    root17.primaryAxisSizingMode = "AUTO";
    root17.counterAxisSizingMode = "AUTO";
    const label17 = figma.createText();
    label17.characters = "StatusIndicator";
    label17.fills = [bindColor(var_color_brand_neutral_900)];
    label17.setBoundVariable("fontSize", var_fontSize_sm);
    root17.appendChild(label17);
    variants.push(root17);
  }
  {
    const root18 = figma.createComponent();
    root18.name = "variant=warning, size=small, state=default";
    root18.layoutMode = "HORIZONTAL";
    root18.primaryAxisAlignItems = "CENTER";
    root18.counterAxisAlignItems = "CENTER";
    root18.primaryAxisSizingMode = "AUTO";
    root18.counterAxisSizingMode = "AUTO";
    const label18 = figma.createText();
    label18.characters = "StatusIndicator";
    label18.fills = [bindColor(var_color_brand_neutral_900)];
    label18.setBoundVariable("fontSize", var_fontSize_sm);
    root18.appendChild(label18);
    variants.push(root18);
  }
  {
    const root19 = figma.createComponent();
    root19.name = "variant=warning, size=small, state=loading";
    root19.layoutMode = "HORIZONTAL";
    root19.primaryAxisAlignItems = "CENTER";
    root19.counterAxisAlignItems = "CENTER";
    root19.primaryAxisSizingMode = "AUTO";
    root19.counterAxisSizingMode = "AUTO";
    const label19 = figma.createText();
    label19.characters = "StatusIndicator";
    label19.fills = [bindColor(var_color_brand_neutral_900)];
    label19.setBoundVariable("fontSize", var_fontSize_sm);
    root19.appendChild(label19);
    variants.push(root19);
  }
  {
    const root20 = figma.createComponent();
    root20.name = "variant=warning, size=medium, state=default";
    root20.layoutMode = "HORIZONTAL";
    root20.primaryAxisAlignItems = "CENTER";
    root20.counterAxisAlignItems = "CENTER";
    root20.primaryAxisSizingMode = "AUTO";
    root20.counterAxisSizingMode = "AUTO";
    const label20 = figma.createText();
    label20.characters = "StatusIndicator";
    label20.fills = [bindColor(var_color_brand_neutral_900)];
    label20.setBoundVariable("fontSize", var_fontSize_sm);
    root20.appendChild(label20);
    variants.push(root20);
  }
  {
    const root21 = figma.createComponent();
    root21.name = "variant=warning, size=medium, state=loading";
    root21.layoutMode = "HORIZONTAL";
    root21.primaryAxisAlignItems = "CENTER";
    root21.counterAxisAlignItems = "CENTER";
    root21.primaryAxisSizingMode = "AUTO";
    root21.counterAxisSizingMode = "AUTO";
    const label21 = figma.createText();
    label21.characters = "StatusIndicator";
    label21.fills = [bindColor(var_color_brand_neutral_900)];
    label21.setBoundVariable("fontSize", var_fontSize_sm);
    root21.appendChild(label21);
    variants.push(root21);
  }
  {
    const root22 = figma.createComponent();
    root22.name = "variant=warning, size=large, state=default";
    root22.layoutMode = "HORIZONTAL";
    root22.primaryAxisAlignItems = "CENTER";
    root22.counterAxisAlignItems = "CENTER";
    root22.primaryAxisSizingMode = "AUTO";
    root22.counterAxisSizingMode = "AUTO";
    const label22 = figma.createText();
    label22.characters = "StatusIndicator";
    label22.fills = [bindColor(var_color_brand_neutral_900)];
    label22.setBoundVariable("fontSize", var_fontSize_sm);
    root22.appendChild(label22);
    variants.push(root22);
  }
  {
    const root23 = figma.createComponent();
    root23.name = "variant=warning, size=large, state=loading";
    root23.layoutMode = "HORIZONTAL";
    root23.primaryAxisAlignItems = "CENTER";
    root23.counterAxisAlignItems = "CENTER";
    root23.primaryAxisSizingMode = "AUTO";
    root23.counterAxisSizingMode = "AUTO";
    const label23 = figma.createText();
    label23.characters = "StatusIndicator";
    label23.fills = [bindColor(var_color_brand_neutral_900)];
    label23.setBoundVariable("fontSize", var_fontSize_sm);
    root23.appendChild(label23);
    variants.push(root23);
  }

  const componentSet = figma.combineAsVariants(variants, figma.currentPage);
  componentSet.name = "StatusIndicator";
  figma.currentPage.selection = [componentSet];
  figma.viewport.scrollAndZoomIntoView([componentSet]);
  figma.closePlugin("Created StatusIndicator component set (24 variants).");
}

main();
