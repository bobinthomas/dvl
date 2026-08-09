/**
 * GENERATED FILE. Do not edit by hand — your changes will be silently
 * overwritten. Source: components/button/spec.json (version 1.0.0).
 * Regenerate with `ds build button`.
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
  const var_color_action_primary_default_fg = getOrCreateVariable(collection, "color/action/primary/default/fg", "COLOR", {"r":1,"g":1,"b":1});
  const var_color_action_primary_disabled_bg = getOrCreateVariable(collection, "color/action/primary/disabled/bg", "COLOR", {"r":0.8745098039215686,"g":0.8823529411764706,"b":0.9019607843137255});
  const var_color_action_primary_disabled_fg = getOrCreateVariable(collection, "color/action/primary/disabled/fg", "COLOR", {"r":0.4196078431372549,"g":0.4666666666666667,"b":0.5490196078431373});
  const var_color_action_primary_hover_bg = getOrCreateVariable(collection, "color/action/primary/hover/bg", "COLOR", {"r":0,"g":0.23921568627450981,"b":0.6});
  const var_color_action_secondary_default_bg = getOrCreateVariable(collection, "color/action/secondary/default/bg", "COLOR", {"r":1,"g":1,"b":1});
  const var_color_action_secondary_default_border = getOrCreateVariable(collection, "color/action/secondary/default/border", "COLOR", {"r":0,"g":0.3215686274509804,"b":0.8});
  const var_color_action_secondary_default_fg = getOrCreateVariable(collection, "color/action/secondary/default/fg", "COLOR", {"r":0,"g":0.3215686274509804,"b":0.8});
  const var_color_action_secondary_hover_bg = getOrCreateVariable(collection, "color/action/secondary/hover/bg", "COLOR", {"r":0.9019607843137255,"g":0.9333333333333333,"b":1});
  const var_color_action_tertiary_default_fg = getOrCreateVariable(collection, "color/action/tertiary/default/fg", "COLOR", {"r":0,"g":0.3215686274509804,"b":0.8});
  const var_color_action_tertiary_hover_fg = getOrCreateVariable(collection, "color/action/tertiary/hover/fg", "COLOR", {"r":0,"g":0.23921568627450981,"b":0.6});
  const var_fontSize_lg = getOrCreateVariable(collection, "fontSize/lg", "FLOAT", 16);
  const var_fontSize_md = getOrCreateVariable(collection, "fontSize/md", "FLOAT", 14);
  const var_fontSize_sm = getOrCreateVariable(collection, "fontSize/sm", "FLOAT", 13);
  const var_radius_md = getOrCreateVariable(collection, "radius/md", "FLOAT", 6);
  const var_spacing_lg = getOrCreateVariable(collection, "spacing/lg", "FLOAT", 16);
  const var_spacing_md = getOrCreateVariable(collection, "spacing/md", "FLOAT", 12);
  const var_spacing_sm = getOrCreateVariable(collection, "spacing/sm", "FLOAT", 8);

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
    root0.setBoundVariable("cornerRadius", var_radius_md);
    root0.setBoundVariable("paddingTop", var_spacing_sm);
    root0.setBoundVariable("paddingBottom", var_spacing_sm);
    root0.setBoundVariable("paddingLeft", var_spacing_sm);
    root0.setBoundVariable("paddingRight", var_spacing_sm);
    root0.fills = [bindColor(var_color_action_primary_default_bg)];
    const label0 = figma.createText();
    label0.characters = "Button";
    label0.setBoundVariable("fontSize", var_fontSize_sm);
    label0.fills = [bindColor(var_color_action_primary_default_fg)];
    root0.appendChild(label0);
    variants.push(root0);
  }
  {
    const root1 = figma.createComponent();
    root1.name = "variant=primary, size=small, state=hover";
    root1.layoutMode = "HORIZONTAL";
    root1.primaryAxisAlignItems = "CENTER";
    root1.counterAxisAlignItems = "CENTER";
    root1.primaryAxisSizingMode = "AUTO";
    root1.counterAxisSizingMode = "AUTO";
    root1.setBoundVariable("cornerRadius", var_radius_md);
    root1.setBoundVariable("paddingTop", var_spacing_sm);
    root1.setBoundVariable("paddingBottom", var_spacing_sm);
    root1.setBoundVariable("paddingLeft", var_spacing_sm);
    root1.setBoundVariable("paddingRight", var_spacing_sm);
    root1.fills = [bindColor(var_color_action_primary_hover_bg)];
    const label1 = figma.createText();
    label1.characters = "Button";
    label1.setBoundVariable("fontSize", var_fontSize_sm);
    label1.fills = [bindColor(var_color_action_primary_default_fg)];
    root1.appendChild(label1);
    variants.push(root1);
  }
  {
    const root2 = figma.createComponent();
    root2.name = "variant=primary, size=small, state=active";
    root2.layoutMode = "HORIZONTAL";
    root2.primaryAxisAlignItems = "CENTER";
    root2.counterAxisAlignItems = "CENTER";
    root2.primaryAxisSizingMode = "AUTO";
    root2.counterAxisSizingMode = "AUTO";
    root2.setBoundVariable("cornerRadius", var_radius_md);
    root2.setBoundVariable("paddingTop", var_spacing_sm);
    root2.setBoundVariable("paddingBottom", var_spacing_sm);
    root2.setBoundVariable("paddingLeft", var_spacing_sm);
    root2.setBoundVariable("paddingRight", var_spacing_sm);
    root2.fills = [bindColor(var_color_action_primary_hover_bg)];
    const label2 = figma.createText();
    label2.characters = "Button";
    label2.setBoundVariable("fontSize", var_fontSize_sm);
    label2.fills = [bindColor(var_color_action_primary_default_fg)];
    root2.appendChild(label2);
    variants.push(root2);
  }
  {
    const root3 = figma.createComponent();
    root3.name = "variant=primary, size=small, state=focus";
    root3.layoutMode = "HORIZONTAL";
    root3.primaryAxisAlignItems = "CENTER";
    root3.counterAxisAlignItems = "CENTER";
    root3.primaryAxisSizingMode = "AUTO";
    root3.counterAxisSizingMode = "AUTO";
    root3.setBoundVariable("cornerRadius", var_radius_md);
    root3.setBoundVariable("paddingTop", var_spacing_sm);
    root3.setBoundVariable("paddingBottom", var_spacing_sm);
    root3.setBoundVariable("paddingLeft", var_spacing_sm);
    root3.setBoundVariable("paddingRight", var_spacing_sm);
    root3.fills = [bindColor(var_color_action_primary_default_bg)];
    const label3 = figma.createText();
    label3.characters = "Button";
    label3.setBoundVariable("fontSize", var_fontSize_sm);
    label3.fills = [bindColor(var_color_action_primary_default_fg)];
    root3.appendChild(label3);
    variants.push(root3);
  }
  {
    const root4 = figma.createComponent();
    root4.name = "variant=primary, size=small, state=disabled";
    root4.layoutMode = "HORIZONTAL";
    root4.primaryAxisAlignItems = "CENTER";
    root4.counterAxisAlignItems = "CENTER";
    root4.primaryAxisSizingMode = "AUTO";
    root4.counterAxisSizingMode = "AUTO";
    root4.setBoundVariable("cornerRadius", var_radius_md);
    root4.setBoundVariable("paddingTop", var_spacing_sm);
    root4.setBoundVariable("paddingBottom", var_spacing_sm);
    root4.setBoundVariable("paddingLeft", var_spacing_sm);
    root4.setBoundVariable("paddingRight", var_spacing_sm);
    root4.fills = [bindColor(var_color_action_primary_disabled_bg)];
    const label4 = figma.createText();
    label4.characters = "Button";
    label4.setBoundVariable("fontSize", var_fontSize_sm);
    label4.fills = [bindColor(var_color_action_primary_disabled_fg)];
    root4.appendChild(label4);
    variants.push(root4);
  }
  {
    const root5 = figma.createComponent();
    root5.name = "variant=primary, size=small, state=loading";
    root5.layoutMode = "HORIZONTAL";
    root5.primaryAxisAlignItems = "CENTER";
    root5.counterAxisAlignItems = "CENTER";
    root5.primaryAxisSizingMode = "AUTO";
    root5.counterAxisSizingMode = "AUTO";
    root5.setBoundVariable("cornerRadius", var_radius_md);
    root5.setBoundVariable("paddingTop", var_spacing_sm);
    root5.setBoundVariable("paddingBottom", var_spacing_sm);
    root5.setBoundVariable("paddingLeft", var_spacing_sm);
    root5.setBoundVariable("paddingRight", var_spacing_sm);
    root5.fills = [bindColor(var_color_action_primary_default_bg)];
    const label5 = figma.createText();
    label5.characters = "Button";
    label5.setBoundVariable("fontSize", var_fontSize_sm);
    label5.fills = [bindColor(var_color_action_primary_default_fg)];
    root5.appendChild(label5);
    variants.push(root5);
  }
  {
    const root6 = figma.createComponent();
    root6.name = "variant=primary, size=medium, state=default";
    root6.layoutMode = "HORIZONTAL";
    root6.primaryAxisAlignItems = "CENTER";
    root6.counterAxisAlignItems = "CENTER";
    root6.primaryAxisSizingMode = "AUTO";
    root6.counterAxisSizingMode = "AUTO";
    root6.setBoundVariable("cornerRadius", var_radius_md);
    root6.setBoundVariable("paddingTop", var_spacing_sm);
    root6.setBoundVariable("paddingBottom", var_spacing_sm);
    root6.setBoundVariable("paddingLeft", var_spacing_md);
    root6.setBoundVariable("paddingRight", var_spacing_md);
    root6.fills = [bindColor(var_color_action_primary_default_bg)];
    const label6 = figma.createText();
    label6.characters = "Button";
    label6.setBoundVariable("fontSize", var_fontSize_md);
    label6.fills = [bindColor(var_color_action_primary_default_fg)];
    root6.appendChild(label6);
    variants.push(root6);
  }
  {
    const root7 = figma.createComponent();
    root7.name = "variant=primary, size=medium, state=hover";
    root7.layoutMode = "HORIZONTAL";
    root7.primaryAxisAlignItems = "CENTER";
    root7.counterAxisAlignItems = "CENTER";
    root7.primaryAxisSizingMode = "AUTO";
    root7.counterAxisSizingMode = "AUTO";
    root7.setBoundVariable("cornerRadius", var_radius_md);
    root7.setBoundVariable("paddingTop", var_spacing_sm);
    root7.setBoundVariable("paddingBottom", var_spacing_sm);
    root7.setBoundVariable("paddingLeft", var_spacing_md);
    root7.setBoundVariable("paddingRight", var_spacing_md);
    root7.fills = [bindColor(var_color_action_primary_hover_bg)];
    const label7 = figma.createText();
    label7.characters = "Button";
    label7.setBoundVariable("fontSize", var_fontSize_md);
    label7.fills = [bindColor(var_color_action_primary_default_fg)];
    root7.appendChild(label7);
    variants.push(root7);
  }
  {
    const root8 = figma.createComponent();
    root8.name = "variant=primary, size=medium, state=active";
    root8.layoutMode = "HORIZONTAL";
    root8.primaryAxisAlignItems = "CENTER";
    root8.counterAxisAlignItems = "CENTER";
    root8.primaryAxisSizingMode = "AUTO";
    root8.counterAxisSizingMode = "AUTO";
    root8.setBoundVariable("cornerRadius", var_radius_md);
    root8.setBoundVariable("paddingTop", var_spacing_sm);
    root8.setBoundVariable("paddingBottom", var_spacing_sm);
    root8.setBoundVariable("paddingLeft", var_spacing_md);
    root8.setBoundVariable("paddingRight", var_spacing_md);
    root8.fills = [bindColor(var_color_action_primary_hover_bg)];
    const label8 = figma.createText();
    label8.characters = "Button";
    label8.setBoundVariable("fontSize", var_fontSize_md);
    label8.fills = [bindColor(var_color_action_primary_default_fg)];
    root8.appendChild(label8);
    variants.push(root8);
  }
  {
    const root9 = figma.createComponent();
    root9.name = "variant=primary, size=medium, state=focus";
    root9.layoutMode = "HORIZONTAL";
    root9.primaryAxisAlignItems = "CENTER";
    root9.counterAxisAlignItems = "CENTER";
    root9.primaryAxisSizingMode = "AUTO";
    root9.counterAxisSizingMode = "AUTO";
    root9.setBoundVariable("cornerRadius", var_radius_md);
    root9.setBoundVariable("paddingTop", var_spacing_sm);
    root9.setBoundVariable("paddingBottom", var_spacing_sm);
    root9.setBoundVariable("paddingLeft", var_spacing_md);
    root9.setBoundVariable("paddingRight", var_spacing_md);
    root9.fills = [bindColor(var_color_action_primary_default_bg)];
    const label9 = figma.createText();
    label9.characters = "Button";
    label9.setBoundVariable("fontSize", var_fontSize_md);
    label9.fills = [bindColor(var_color_action_primary_default_fg)];
    root9.appendChild(label9);
    variants.push(root9);
  }
  {
    const root10 = figma.createComponent();
    root10.name = "variant=primary, size=medium, state=disabled";
    root10.layoutMode = "HORIZONTAL";
    root10.primaryAxisAlignItems = "CENTER";
    root10.counterAxisAlignItems = "CENTER";
    root10.primaryAxisSizingMode = "AUTO";
    root10.counterAxisSizingMode = "AUTO";
    root10.setBoundVariable("cornerRadius", var_radius_md);
    root10.setBoundVariable("paddingTop", var_spacing_sm);
    root10.setBoundVariable("paddingBottom", var_spacing_sm);
    root10.setBoundVariable("paddingLeft", var_spacing_md);
    root10.setBoundVariable("paddingRight", var_spacing_md);
    root10.fills = [bindColor(var_color_action_primary_disabled_bg)];
    const label10 = figma.createText();
    label10.characters = "Button";
    label10.setBoundVariable("fontSize", var_fontSize_md);
    label10.fills = [bindColor(var_color_action_primary_disabled_fg)];
    root10.appendChild(label10);
    variants.push(root10);
  }
  {
    const root11 = figma.createComponent();
    root11.name = "variant=primary, size=medium, state=loading";
    root11.layoutMode = "HORIZONTAL";
    root11.primaryAxisAlignItems = "CENTER";
    root11.counterAxisAlignItems = "CENTER";
    root11.primaryAxisSizingMode = "AUTO";
    root11.counterAxisSizingMode = "AUTO";
    root11.setBoundVariable("cornerRadius", var_radius_md);
    root11.setBoundVariable("paddingTop", var_spacing_sm);
    root11.setBoundVariable("paddingBottom", var_spacing_sm);
    root11.setBoundVariable("paddingLeft", var_spacing_md);
    root11.setBoundVariable("paddingRight", var_spacing_md);
    root11.fills = [bindColor(var_color_action_primary_default_bg)];
    const label11 = figma.createText();
    label11.characters = "Button";
    label11.setBoundVariable("fontSize", var_fontSize_md);
    label11.fills = [bindColor(var_color_action_primary_default_fg)];
    root11.appendChild(label11);
    variants.push(root11);
  }
  {
    const root12 = figma.createComponent();
    root12.name = "variant=primary, size=large, state=default";
    root12.layoutMode = "HORIZONTAL";
    root12.primaryAxisAlignItems = "CENTER";
    root12.counterAxisAlignItems = "CENTER";
    root12.primaryAxisSizingMode = "AUTO";
    root12.counterAxisSizingMode = "AUTO";
    root12.setBoundVariable("cornerRadius", var_radius_md);
    root12.setBoundVariable("paddingTop", var_spacing_md);
    root12.setBoundVariable("paddingBottom", var_spacing_md);
    root12.setBoundVariable("paddingLeft", var_spacing_lg);
    root12.setBoundVariable("paddingRight", var_spacing_lg);
    root12.fills = [bindColor(var_color_action_primary_default_bg)];
    const label12 = figma.createText();
    label12.characters = "Button";
    label12.setBoundVariable("fontSize", var_fontSize_lg);
    label12.fills = [bindColor(var_color_action_primary_default_fg)];
    root12.appendChild(label12);
    variants.push(root12);
  }
  {
    const root13 = figma.createComponent();
    root13.name = "variant=primary, size=large, state=hover";
    root13.layoutMode = "HORIZONTAL";
    root13.primaryAxisAlignItems = "CENTER";
    root13.counterAxisAlignItems = "CENTER";
    root13.primaryAxisSizingMode = "AUTO";
    root13.counterAxisSizingMode = "AUTO";
    root13.setBoundVariable("cornerRadius", var_radius_md);
    root13.setBoundVariable("paddingTop", var_spacing_md);
    root13.setBoundVariable("paddingBottom", var_spacing_md);
    root13.setBoundVariable("paddingLeft", var_spacing_lg);
    root13.setBoundVariable("paddingRight", var_spacing_lg);
    root13.fills = [bindColor(var_color_action_primary_hover_bg)];
    const label13 = figma.createText();
    label13.characters = "Button";
    label13.setBoundVariable("fontSize", var_fontSize_lg);
    label13.fills = [bindColor(var_color_action_primary_default_fg)];
    root13.appendChild(label13);
    variants.push(root13);
  }
  {
    const root14 = figma.createComponent();
    root14.name = "variant=primary, size=large, state=active";
    root14.layoutMode = "HORIZONTAL";
    root14.primaryAxisAlignItems = "CENTER";
    root14.counterAxisAlignItems = "CENTER";
    root14.primaryAxisSizingMode = "AUTO";
    root14.counterAxisSizingMode = "AUTO";
    root14.setBoundVariable("cornerRadius", var_radius_md);
    root14.setBoundVariable("paddingTop", var_spacing_md);
    root14.setBoundVariable("paddingBottom", var_spacing_md);
    root14.setBoundVariable("paddingLeft", var_spacing_lg);
    root14.setBoundVariable("paddingRight", var_spacing_lg);
    root14.fills = [bindColor(var_color_action_primary_hover_bg)];
    const label14 = figma.createText();
    label14.characters = "Button";
    label14.setBoundVariable("fontSize", var_fontSize_lg);
    label14.fills = [bindColor(var_color_action_primary_default_fg)];
    root14.appendChild(label14);
    variants.push(root14);
  }
  {
    const root15 = figma.createComponent();
    root15.name = "variant=primary, size=large, state=focus";
    root15.layoutMode = "HORIZONTAL";
    root15.primaryAxisAlignItems = "CENTER";
    root15.counterAxisAlignItems = "CENTER";
    root15.primaryAxisSizingMode = "AUTO";
    root15.counterAxisSizingMode = "AUTO";
    root15.setBoundVariable("cornerRadius", var_radius_md);
    root15.setBoundVariable("paddingTop", var_spacing_md);
    root15.setBoundVariable("paddingBottom", var_spacing_md);
    root15.setBoundVariable("paddingLeft", var_spacing_lg);
    root15.setBoundVariable("paddingRight", var_spacing_lg);
    root15.fills = [bindColor(var_color_action_primary_default_bg)];
    const label15 = figma.createText();
    label15.characters = "Button";
    label15.setBoundVariable("fontSize", var_fontSize_lg);
    label15.fills = [bindColor(var_color_action_primary_default_fg)];
    root15.appendChild(label15);
    variants.push(root15);
  }
  {
    const root16 = figma.createComponent();
    root16.name = "variant=primary, size=large, state=disabled";
    root16.layoutMode = "HORIZONTAL";
    root16.primaryAxisAlignItems = "CENTER";
    root16.counterAxisAlignItems = "CENTER";
    root16.primaryAxisSizingMode = "AUTO";
    root16.counterAxisSizingMode = "AUTO";
    root16.setBoundVariable("cornerRadius", var_radius_md);
    root16.setBoundVariable("paddingTop", var_spacing_md);
    root16.setBoundVariable("paddingBottom", var_spacing_md);
    root16.setBoundVariable("paddingLeft", var_spacing_lg);
    root16.setBoundVariable("paddingRight", var_spacing_lg);
    root16.fills = [bindColor(var_color_action_primary_disabled_bg)];
    const label16 = figma.createText();
    label16.characters = "Button";
    label16.setBoundVariable("fontSize", var_fontSize_lg);
    label16.fills = [bindColor(var_color_action_primary_disabled_fg)];
    root16.appendChild(label16);
    variants.push(root16);
  }
  {
    const root17 = figma.createComponent();
    root17.name = "variant=primary, size=large, state=loading";
    root17.layoutMode = "HORIZONTAL";
    root17.primaryAxisAlignItems = "CENTER";
    root17.counterAxisAlignItems = "CENTER";
    root17.primaryAxisSizingMode = "AUTO";
    root17.counterAxisSizingMode = "AUTO";
    root17.setBoundVariable("cornerRadius", var_radius_md);
    root17.setBoundVariable("paddingTop", var_spacing_md);
    root17.setBoundVariable("paddingBottom", var_spacing_md);
    root17.setBoundVariable("paddingLeft", var_spacing_lg);
    root17.setBoundVariable("paddingRight", var_spacing_lg);
    root17.fills = [bindColor(var_color_action_primary_default_bg)];
    const label17 = figma.createText();
    label17.characters = "Button";
    label17.setBoundVariable("fontSize", var_fontSize_lg);
    label17.fills = [bindColor(var_color_action_primary_default_fg)];
    root17.appendChild(label17);
    variants.push(root17);
  }
  {
    const root18 = figma.createComponent();
    root18.name = "variant=secondary, size=small, state=default";
    root18.layoutMode = "HORIZONTAL";
    root18.primaryAxisAlignItems = "CENTER";
    root18.counterAxisAlignItems = "CENTER";
    root18.primaryAxisSizingMode = "AUTO";
    root18.counterAxisSizingMode = "AUTO";
    root18.setBoundVariable("cornerRadius", var_radius_md);
    root18.setBoundVariable("paddingTop", var_spacing_sm);
    root18.setBoundVariable("paddingBottom", var_spacing_sm);
    root18.setBoundVariable("paddingLeft", var_spacing_sm);
    root18.setBoundVariable("paddingRight", var_spacing_sm);
    root18.fills = [bindColor(var_color_action_secondary_default_bg)];
    root18.strokes = [bindColor(var_color_action_secondary_default_border)];
    root18.strokeWeight = 1;
    const label18 = figma.createText();
    label18.characters = "Button";
    label18.setBoundVariable("fontSize", var_fontSize_sm);
    label18.fills = [bindColor(var_color_action_secondary_default_fg)];
    root18.appendChild(label18);
    variants.push(root18);
  }
  {
    const root19 = figma.createComponent();
    root19.name = "variant=secondary, size=small, state=hover";
    root19.layoutMode = "HORIZONTAL";
    root19.primaryAxisAlignItems = "CENTER";
    root19.counterAxisAlignItems = "CENTER";
    root19.primaryAxisSizingMode = "AUTO";
    root19.counterAxisSizingMode = "AUTO";
    root19.setBoundVariable("cornerRadius", var_radius_md);
    root19.setBoundVariable("paddingTop", var_spacing_sm);
    root19.setBoundVariable("paddingBottom", var_spacing_sm);
    root19.setBoundVariable("paddingLeft", var_spacing_sm);
    root19.setBoundVariable("paddingRight", var_spacing_sm);
    root19.fills = [bindColor(var_color_action_secondary_hover_bg)];
    root19.strokes = [bindColor(var_color_action_secondary_default_border)];
    root19.strokeWeight = 1;
    const label19 = figma.createText();
    label19.characters = "Button";
    label19.setBoundVariable("fontSize", var_fontSize_sm);
    label19.fills = [bindColor(var_color_action_secondary_default_fg)];
    root19.appendChild(label19);
    variants.push(root19);
  }
  {
    const root20 = figma.createComponent();
    root20.name = "variant=secondary, size=small, state=active";
    root20.layoutMode = "HORIZONTAL";
    root20.primaryAxisAlignItems = "CENTER";
    root20.counterAxisAlignItems = "CENTER";
    root20.primaryAxisSizingMode = "AUTO";
    root20.counterAxisSizingMode = "AUTO";
    root20.setBoundVariable("cornerRadius", var_radius_md);
    root20.setBoundVariable("paddingTop", var_spacing_sm);
    root20.setBoundVariable("paddingBottom", var_spacing_sm);
    root20.setBoundVariable("paddingLeft", var_spacing_sm);
    root20.setBoundVariable("paddingRight", var_spacing_sm);
    root20.fills = [bindColor(var_color_action_secondary_hover_bg)];
    root20.strokes = [bindColor(var_color_action_secondary_default_border)];
    root20.strokeWeight = 1;
    const label20 = figma.createText();
    label20.characters = "Button";
    label20.setBoundVariable("fontSize", var_fontSize_sm);
    label20.fills = [bindColor(var_color_action_secondary_default_fg)];
    root20.appendChild(label20);
    variants.push(root20);
  }
  {
    const root21 = figma.createComponent();
    root21.name = "variant=secondary, size=small, state=focus";
    root21.layoutMode = "HORIZONTAL";
    root21.primaryAxisAlignItems = "CENTER";
    root21.counterAxisAlignItems = "CENTER";
    root21.primaryAxisSizingMode = "AUTO";
    root21.counterAxisSizingMode = "AUTO";
    root21.setBoundVariable("cornerRadius", var_radius_md);
    root21.setBoundVariable("paddingTop", var_spacing_sm);
    root21.setBoundVariable("paddingBottom", var_spacing_sm);
    root21.setBoundVariable("paddingLeft", var_spacing_sm);
    root21.setBoundVariable("paddingRight", var_spacing_sm);
    root21.fills = [bindColor(var_color_action_secondary_default_bg)];
    root21.strokes = [bindColor(var_color_action_secondary_default_border)];
    root21.strokeWeight = 1;
    const label21 = figma.createText();
    label21.characters = "Button";
    label21.setBoundVariable("fontSize", var_fontSize_sm);
    label21.fills = [bindColor(var_color_action_secondary_default_fg)];
    root21.appendChild(label21);
    variants.push(root21);
  }
  {
    const root22 = figma.createComponent();
    root22.name = "variant=secondary, size=small, state=disabled";
    root22.layoutMode = "HORIZONTAL";
    root22.primaryAxisAlignItems = "CENTER";
    root22.counterAxisAlignItems = "CENTER";
    root22.primaryAxisSizingMode = "AUTO";
    root22.counterAxisSizingMode = "AUTO";
    root22.setBoundVariable("cornerRadius", var_radius_md);
    root22.setBoundVariable("paddingTop", var_spacing_sm);
    root22.setBoundVariable("paddingBottom", var_spacing_sm);
    root22.setBoundVariable("paddingLeft", var_spacing_sm);
    root22.setBoundVariable("paddingRight", var_spacing_sm);
    root22.fills = [bindColor(var_color_action_secondary_default_bg)];
    root22.strokes = [bindColor(var_color_action_secondary_default_border)];
    root22.strokeWeight = 1;
    const label22 = figma.createText();
    label22.characters = "Button";
    label22.setBoundVariable("fontSize", var_fontSize_sm);
    label22.fills = [bindColor(var_color_action_secondary_default_fg)];
    root22.appendChild(label22);
    variants.push(root22);
  }
  {
    const root23 = figma.createComponent();
    root23.name = "variant=secondary, size=small, state=loading";
    root23.layoutMode = "HORIZONTAL";
    root23.primaryAxisAlignItems = "CENTER";
    root23.counterAxisAlignItems = "CENTER";
    root23.primaryAxisSizingMode = "AUTO";
    root23.counterAxisSizingMode = "AUTO";
    root23.setBoundVariable("cornerRadius", var_radius_md);
    root23.setBoundVariable("paddingTop", var_spacing_sm);
    root23.setBoundVariable("paddingBottom", var_spacing_sm);
    root23.setBoundVariable("paddingLeft", var_spacing_sm);
    root23.setBoundVariable("paddingRight", var_spacing_sm);
    root23.fills = [bindColor(var_color_action_secondary_default_bg)];
    root23.strokes = [bindColor(var_color_action_secondary_default_border)];
    root23.strokeWeight = 1;
    const label23 = figma.createText();
    label23.characters = "Button";
    label23.setBoundVariable("fontSize", var_fontSize_sm);
    label23.fills = [bindColor(var_color_action_secondary_default_fg)];
    root23.appendChild(label23);
    variants.push(root23);
  }
  {
    const root24 = figma.createComponent();
    root24.name = "variant=secondary, size=medium, state=default";
    root24.layoutMode = "HORIZONTAL";
    root24.primaryAxisAlignItems = "CENTER";
    root24.counterAxisAlignItems = "CENTER";
    root24.primaryAxisSizingMode = "AUTO";
    root24.counterAxisSizingMode = "AUTO";
    root24.setBoundVariable("cornerRadius", var_radius_md);
    root24.setBoundVariable("paddingTop", var_spacing_sm);
    root24.setBoundVariable("paddingBottom", var_spacing_sm);
    root24.setBoundVariable("paddingLeft", var_spacing_md);
    root24.setBoundVariable("paddingRight", var_spacing_md);
    root24.fills = [bindColor(var_color_action_secondary_default_bg)];
    root24.strokes = [bindColor(var_color_action_secondary_default_border)];
    root24.strokeWeight = 1;
    const label24 = figma.createText();
    label24.characters = "Button";
    label24.setBoundVariable("fontSize", var_fontSize_md);
    label24.fills = [bindColor(var_color_action_secondary_default_fg)];
    root24.appendChild(label24);
    variants.push(root24);
  }
  {
    const root25 = figma.createComponent();
    root25.name = "variant=secondary, size=medium, state=hover";
    root25.layoutMode = "HORIZONTAL";
    root25.primaryAxisAlignItems = "CENTER";
    root25.counterAxisAlignItems = "CENTER";
    root25.primaryAxisSizingMode = "AUTO";
    root25.counterAxisSizingMode = "AUTO";
    root25.setBoundVariable("cornerRadius", var_radius_md);
    root25.setBoundVariable("paddingTop", var_spacing_sm);
    root25.setBoundVariable("paddingBottom", var_spacing_sm);
    root25.setBoundVariable("paddingLeft", var_spacing_md);
    root25.setBoundVariable("paddingRight", var_spacing_md);
    root25.fills = [bindColor(var_color_action_secondary_hover_bg)];
    root25.strokes = [bindColor(var_color_action_secondary_default_border)];
    root25.strokeWeight = 1;
    const label25 = figma.createText();
    label25.characters = "Button";
    label25.setBoundVariable("fontSize", var_fontSize_md);
    label25.fills = [bindColor(var_color_action_secondary_default_fg)];
    root25.appendChild(label25);
    variants.push(root25);
  }
  {
    const root26 = figma.createComponent();
    root26.name = "variant=secondary, size=medium, state=active";
    root26.layoutMode = "HORIZONTAL";
    root26.primaryAxisAlignItems = "CENTER";
    root26.counterAxisAlignItems = "CENTER";
    root26.primaryAxisSizingMode = "AUTO";
    root26.counterAxisSizingMode = "AUTO";
    root26.setBoundVariable("cornerRadius", var_radius_md);
    root26.setBoundVariable("paddingTop", var_spacing_sm);
    root26.setBoundVariable("paddingBottom", var_spacing_sm);
    root26.setBoundVariable("paddingLeft", var_spacing_md);
    root26.setBoundVariable("paddingRight", var_spacing_md);
    root26.fills = [bindColor(var_color_action_secondary_hover_bg)];
    root26.strokes = [bindColor(var_color_action_secondary_default_border)];
    root26.strokeWeight = 1;
    const label26 = figma.createText();
    label26.characters = "Button";
    label26.setBoundVariable("fontSize", var_fontSize_md);
    label26.fills = [bindColor(var_color_action_secondary_default_fg)];
    root26.appendChild(label26);
    variants.push(root26);
  }
  {
    const root27 = figma.createComponent();
    root27.name = "variant=secondary, size=medium, state=focus";
    root27.layoutMode = "HORIZONTAL";
    root27.primaryAxisAlignItems = "CENTER";
    root27.counterAxisAlignItems = "CENTER";
    root27.primaryAxisSizingMode = "AUTO";
    root27.counterAxisSizingMode = "AUTO";
    root27.setBoundVariable("cornerRadius", var_radius_md);
    root27.setBoundVariable("paddingTop", var_spacing_sm);
    root27.setBoundVariable("paddingBottom", var_spacing_sm);
    root27.setBoundVariable("paddingLeft", var_spacing_md);
    root27.setBoundVariable("paddingRight", var_spacing_md);
    root27.fills = [bindColor(var_color_action_secondary_default_bg)];
    root27.strokes = [bindColor(var_color_action_secondary_default_border)];
    root27.strokeWeight = 1;
    const label27 = figma.createText();
    label27.characters = "Button";
    label27.setBoundVariable("fontSize", var_fontSize_md);
    label27.fills = [bindColor(var_color_action_secondary_default_fg)];
    root27.appendChild(label27);
    variants.push(root27);
  }
  {
    const root28 = figma.createComponent();
    root28.name = "variant=secondary, size=medium, state=disabled";
    root28.layoutMode = "HORIZONTAL";
    root28.primaryAxisAlignItems = "CENTER";
    root28.counterAxisAlignItems = "CENTER";
    root28.primaryAxisSizingMode = "AUTO";
    root28.counterAxisSizingMode = "AUTO";
    root28.setBoundVariable("cornerRadius", var_radius_md);
    root28.setBoundVariable("paddingTop", var_spacing_sm);
    root28.setBoundVariable("paddingBottom", var_spacing_sm);
    root28.setBoundVariable("paddingLeft", var_spacing_md);
    root28.setBoundVariable("paddingRight", var_spacing_md);
    root28.fills = [bindColor(var_color_action_secondary_default_bg)];
    root28.strokes = [bindColor(var_color_action_secondary_default_border)];
    root28.strokeWeight = 1;
    const label28 = figma.createText();
    label28.characters = "Button";
    label28.setBoundVariable("fontSize", var_fontSize_md);
    label28.fills = [bindColor(var_color_action_secondary_default_fg)];
    root28.appendChild(label28);
    variants.push(root28);
  }
  {
    const root29 = figma.createComponent();
    root29.name = "variant=secondary, size=medium, state=loading";
    root29.layoutMode = "HORIZONTAL";
    root29.primaryAxisAlignItems = "CENTER";
    root29.counterAxisAlignItems = "CENTER";
    root29.primaryAxisSizingMode = "AUTO";
    root29.counterAxisSizingMode = "AUTO";
    root29.setBoundVariable("cornerRadius", var_radius_md);
    root29.setBoundVariable("paddingTop", var_spacing_sm);
    root29.setBoundVariable("paddingBottom", var_spacing_sm);
    root29.setBoundVariable("paddingLeft", var_spacing_md);
    root29.setBoundVariable("paddingRight", var_spacing_md);
    root29.fills = [bindColor(var_color_action_secondary_default_bg)];
    root29.strokes = [bindColor(var_color_action_secondary_default_border)];
    root29.strokeWeight = 1;
    const label29 = figma.createText();
    label29.characters = "Button";
    label29.setBoundVariable("fontSize", var_fontSize_md);
    label29.fills = [bindColor(var_color_action_secondary_default_fg)];
    root29.appendChild(label29);
    variants.push(root29);
  }
  {
    const root30 = figma.createComponent();
    root30.name = "variant=secondary, size=large, state=default";
    root30.layoutMode = "HORIZONTAL";
    root30.primaryAxisAlignItems = "CENTER";
    root30.counterAxisAlignItems = "CENTER";
    root30.primaryAxisSizingMode = "AUTO";
    root30.counterAxisSizingMode = "AUTO";
    root30.setBoundVariable("cornerRadius", var_radius_md);
    root30.setBoundVariable("paddingTop", var_spacing_md);
    root30.setBoundVariable("paddingBottom", var_spacing_md);
    root30.setBoundVariable("paddingLeft", var_spacing_lg);
    root30.setBoundVariable("paddingRight", var_spacing_lg);
    root30.fills = [bindColor(var_color_action_secondary_default_bg)];
    root30.strokes = [bindColor(var_color_action_secondary_default_border)];
    root30.strokeWeight = 1;
    const label30 = figma.createText();
    label30.characters = "Button";
    label30.setBoundVariable("fontSize", var_fontSize_lg);
    label30.fills = [bindColor(var_color_action_secondary_default_fg)];
    root30.appendChild(label30);
    variants.push(root30);
  }
  {
    const root31 = figma.createComponent();
    root31.name = "variant=secondary, size=large, state=hover";
    root31.layoutMode = "HORIZONTAL";
    root31.primaryAxisAlignItems = "CENTER";
    root31.counterAxisAlignItems = "CENTER";
    root31.primaryAxisSizingMode = "AUTO";
    root31.counterAxisSizingMode = "AUTO";
    root31.setBoundVariable("cornerRadius", var_radius_md);
    root31.setBoundVariable("paddingTop", var_spacing_md);
    root31.setBoundVariable("paddingBottom", var_spacing_md);
    root31.setBoundVariable("paddingLeft", var_spacing_lg);
    root31.setBoundVariable("paddingRight", var_spacing_lg);
    root31.fills = [bindColor(var_color_action_secondary_hover_bg)];
    root31.strokes = [bindColor(var_color_action_secondary_default_border)];
    root31.strokeWeight = 1;
    const label31 = figma.createText();
    label31.characters = "Button";
    label31.setBoundVariable("fontSize", var_fontSize_lg);
    label31.fills = [bindColor(var_color_action_secondary_default_fg)];
    root31.appendChild(label31);
    variants.push(root31);
  }
  {
    const root32 = figma.createComponent();
    root32.name = "variant=secondary, size=large, state=active";
    root32.layoutMode = "HORIZONTAL";
    root32.primaryAxisAlignItems = "CENTER";
    root32.counterAxisAlignItems = "CENTER";
    root32.primaryAxisSizingMode = "AUTO";
    root32.counterAxisSizingMode = "AUTO";
    root32.setBoundVariable("cornerRadius", var_radius_md);
    root32.setBoundVariable("paddingTop", var_spacing_md);
    root32.setBoundVariable("paddingBottom", var_spacing_md);
    root32.setBoundVariable("paddingLeft", var_spacing_lg);
    root32.setBoundVariable("paddingRight", var_spacing_lg);
    root32.fills = [bindColor(var_color_action_secondary_hover_bg)];
    root32.strokes = [bindColor(var_color_action_secondary_default_border)];
    root32.strokeWeight = 1;
    const label32 = figma.createText();
    label32.characters = "Button";
    label32.setBoundVariable("fontSize", var_fontSize_lg);
    label32.fills = [bindColor(var_color_action_secondary_default_fg)];
    root32.appendChild(label32);
    variants.push(root32);
  }
  {
    const root33 = figma.createComponent();
    root33.name = "variant=secondary, size=large, state=focus";
    root33.layoutMode = "HORIZONTAL";
    root33.primaryAxisAlignItems = "CENTER";
    root33.counterAxisAlignItems = "CENTER";
    root33.primaryAxisSizingMode = "AUTO";
    root33.counterAxisSizingMode = "AUTO";
    root33.setBoundVariable("cornerRadius", var_radius_md);
    root33.setBoundVariable("paddingTop", var_spacing_md);
    root33.setBoundVariable("paddingBottom", var_spacing_md);
    root33.setBoundVariable("paddingLeft", var_spacing_lg);
    root33.setBoundVariable("paddingRight", var_spacing_lg);
    root33.fills = [bindColor(var_color_action_secondary_default_bg)];
    root33.strokes = [bindColor(var_color_action_secondary_default_border)];
    root33.strokeWeight = 1;
    const label33 = figma.createText();
    label33.characters = "Button";
    label33.setBoundVariable("fontSize", var_fontSize_lg);
    label33.fills = [bindColor(var_color_action_secondary_default_fg)];
    root33.appendChild(label33);
    variants.push(root33);
  }
  {
    const root34 = figma.createComponent();
    root34.name = "variant=secondary, size=large, state=disabled";
    root34.layoutMode = "HORIZONTAL";
    root34.primaryAxisAlignItems = "CENTER";
    root34.counterAxisAlignItems = "CENTER";
    root34.primaryAxisSizingMode = "AUTO";
    root34.counterAxisSizingMode = "AUTO";
    root34.setBoundVariable("cornerRadius", var_radius_md);
    root34.setBoundVariable("paddingTop", var_spacing_md);
    root34.setBoundVariable("paddingBottom", var_spacing_md);
    root34.setBoundVariable("paddingLeft", var_spacing_lg);
    root34.setBoundVariable("paddingRight", var_spacing_lg);
    root34.fills = [bindColor(var_color_action_secondary_default_bg)];
    root34.strokes = [bindColor(var_color_action_secondary_default_border)];
    root34.strokeWeight = 1;
    const label34 = figma.createText();
    label34.characters = "Button";
    label34.setBoundVariable("fontSize", var_fontSize_lg);
    label34.fills = [bindColor(var_color_action_secondary_default_fg)];
    root34.appendChild(label34);
    variants.push(root34);
  }
  {
    const root35 = figma.createComponent();
    root35.name = "variant=secondary, size=large, state=loading";
    root35.layoutMode = "HORIZONTAL";
    root35.primaryAxisAlignItems = "CENTER";
    root35.counterAxisAlignItems = "CENTER";
    root35.primaryAxisSizingMode = "AUTO";
    root35.counterAxisSizingMode = "AUTO";
    root35.setBoundVariable("cornerRadius", var_radius_md);
    root35.setBoundVariable("paddingTop", var_spacing_md);
    root35.setBoundVariable("paddingBottom", var_spacing_md);
    root35.setBoundVariable("paddingLeft", var_spacing_lg);
    root35.setBoundVariable("paddingRight", var_spacing_lg);
    root35.fills = [bindColor(var_color_action_secondary_default_bg)];
    root35.strokes = [bindColor(var_color_action_secondary_default_border)];
    root35.strokeWeight = 1;
    const label35 = figma.createText();
    label35.characters = "Button";
    label35.setBoundVariable("fontSize", var_fontSize_lg);
    label35.fills = [bindColor(var_color_action_secondary_default_fg)];
    root35.appendChild(label35);
    variants.push(root35);
  }
  {
    const root36 = figma.createComponent();
    root36.name = "variant=tertiary, size=small, state=default";
    root36.layoutMode = "HORIZONTAL";
    root36.primaryAxisAlignItems = "CENTER";
    root36.counterAxisAlignItems = "CENTER";
    root36.primaryAxisSizingMode = "AUTO";
    root36.counterAxisSizingMode = "AUTO";
    root36.setBoundVariable("cornerRadius", var_radius_md);
    root36.setBoundVariable("paddingTop", var_spacing_sm);
    root36.setBoundVariable("paddingBottom", var_spacing_sm);
    root36.setBoundVariable("paddingLeft", var_spacing_sm);
    root36.setBoundVariable("paddingRight", var_spacing_sm);
    const label36 = figma.createText();
    label36.characters = "Button";
    label36.setBoundVariable("fontSize", var_fontSize_sm);
    label36.fills = [bindColor(var_color_action_tertiary_default_fg)];
    root36.appendChild(label36);
    variants.push(root36);
  }
  {
    const root37 = figma.createComponent();
    root37.name = "variant=tertiary, size=small, state=hover";
    root37.layoutMode = "HORIZONTAL";
    root37.primaryAxisAlignItems = "CENTER";
    root37.counterAxisAlignItems = "CENTER";
    root37.primaryAxisSizingMode = "AUTO";
    root37.counterAxisSizingMode = "AUTO";
    root37.setBoundVariable("cornerRadius", var_radius_md);
    root37.setBoundVariable("paddingTop", var_spacing_sm);
    root37.setBoundVariable("paddingBottom", var_spacing_sm);
    root37.setBoundVariable("paddingLeft", var_spacing_sm);
    root37.setBoundVariable("paddingRight", var_spacing_sm);
    const label37 = figma.createText();
    label37.characters = "Button";
    label37.setBoundVariable("fontSize", var_fontSize_sm);
    label37.fills = [bindColor(var_color_action_tertiary_hover_fg)];
    root37.appendChild(label37);
    variants.push(root37);
  }
  {
    const root38 = figma.createComponent();
    root38.name = "variant=tertiary, size=small, state=active";
    root38.layoutMode = "HORIZONTAL";
    root38.primaryAxisAlignItems = "CENTER";
    root38.counterAxisAlignItems = "CENTER";
    root38.primaryAxisSizingMode = "AUTO";
    root38.counterAxisSizingMode = "AUTO";
    root38.setBoundVariable("cornerRadius", var_radius_md);
    root38.setBoundVariable("paddingTop", var_spacing_sm);
    root38.setBoundVariable("paddingBottom", var_spacing_sm);
    root38.setBoundVariable("paddingLeft", var_spacing_sm);
    root38.setBoundVariable("paddingRight", var_spacing_sm);
    const label38 = figma.createText();
    label38.characters = "Button";
    label38.setBoundVariable("fontSize", var_fontSize_sm);
    label38.fills = [bindColor(var_color_action_tertiary_hover_fg)];
    root38.appendChild(label38);
    variants.push(root38);
  }
  {
    const root39 = figma.createComponent();
    root39.name = "variant=tertiary, size=small, state=focus";
    root39.layoutMode = "HORIZONTAL";
    root39.primaryAxisAlignItems = "CENTER";
    root39.counterAxisAlignItems = "CENTER";
    root39.primaryAxisSizingMode = "AUTO";
    root39.counterAxisSizingMode = "AUTO";
    root39.setBoundVariable("cornerRadius", var_radius_md);
    root39.setBoundVariable("paddingTop", var_spacing_sm);
    root39.setBoundVariable("paddingBottom", var_spacing_sm);
    root39.setBoundVariable("paddingLeft", var_spacing_sm);
    root39.setBoundVariable("paddingRight", var_spacing_sm);
    const label39 = figma.createText();
    label39.characters = "Button";
    label39.setBoundVariable("fontSize", var_fontSize_sm);
    label39.fills = [bindColor(var_color_action_tertiary_default_fg)];
    root39.appendChild(label39);
    variants.push(root39);
  }
  {
    const root40 = figma.createComponent();
    root40.name = "variant=tertiary, size=small, state=disabled";
    root40.layoutMode = "HORIZONTAL";
    root40.primaryAxisAlignItems = "CENTER";
    root40.counterAxisAlignItems = "CENTER";
    root40.primaryAxisSizingMode = "AUTO";
    root40.counterAxisSizingMode = "AUTO";
    root40.setBoundVariable("cornerRadius", var_radius_md);
    root40.setBoundVariable("paddingTop", var_spacing_sm);
    root40.setBoundVariable("paddingBottom", var_spacing_sm);
    root40.setBoundVariable("paddingLeft", var_spacing_sm);
    root40.setBoundVariable("paddingRight", var_spacing_sm);
    const label40 = figma.createText();
    label40.characters = "Button";
    label40.setBoundVariable("fontSize", var_fontSize_sm);
    label40.fills = [bindColor(var_color_action_tertiary_default_fg)];
    root40.appendChild(label40);
    variants.push(root40);
  }
  {
    const root41 = figma.createComponent();
    root41.name = "variant=tertiary, size=small, state=loading";
    root41.layoutMode = "HORIZONTAL";
    root41.primaryAxisAlignItems = "CENTER";
    root41.counterAxisAlignItems = "CENTER";
    root41.primaryAxisSizingMode = "AUTO";
    root41.counterAxisSizingMode = "AUTO";
    root41.setBoundVariable("cornerRadius", var_radius_md);
    root41.setBoundVariable("paddingTop", var_spacing_sm);
    root41.setBoundVariable("paddingBottom", var_spacing_sm);
    root41.setBoundVariable("paddingLeft", var_spacing_sm);
    root41.setBoundVariable("paddingRight", var_spacing_sm);
    const label41 = figma.createText();
    label41.characters = "Button";
    label41.setBoundVariable("fontSize", var_fontSize_sm);
    label41.fills = [bindColor(var_color_action_tertiary_default_fg)];
    root41.appendChild(label41);
    variants.push(root41);
  }
  {
    const root42 = figma.createComponent();
    root42.name = "variant=tertiary, size=medium, state=default";
    root42.layoutMode = "HORIZONTAL";
    root42.primaryAxisAlignItems = "CENTER";
    root42.counterAxisAlignItems = "CENTER";
    root42.primaryAxisSizingMode = "AUTO";
    root42.counterAxisSizingMode = "AUTO";
    root42.setBoundVariable("cornerRadius", var_radius_md);
    root42.setBoundVariable("paddingTop", var_spacing_sm);
    root42.setBoundVariable("paddingBottom", var_spacing_sm);
    root42.setBoundVariable("paddingLeft", var_spacing_md);
    root42.setBoundVariable("paddingRight", var_spacing_md);
    const label42 = figma.createText();
    label42.characters = "Button";
    label42.setBoundVariable("fontSize", var_fontSize_md);
    label42.fills = [bindColor(var_color_action_tertiary_default_fg)];
    root42.appendChild(label42);
    variants.push(root42);
  }
  {
    const root43 = figma.createComponent();
    root43.name = "variant=tertiary, size=medium, state=hover";
    root43.layoutMode = "HORIZONTAL";
    root43.primaryAxisAlignItems = "CENTER";
    root43.counterAxisAlignItems = "CENTER";
    root43.primaryAxisSizingMode = "AUTO";
    root43.counterAxisSizingMode = "AUTO";
    root43.setBoundVariable("cornerRadius", var_radius_md);
    root43.setBoundVariable("paddingTop", var_spacing_sm);
    root43.setBoundVariable("paddingBottom", var_spacing_sm);
    root43.setBoundVariable("paddingLeft", var_spacing_md);
    root43.setBoundVariable("paddingRight", var_spacing_md);
    const label43 = figma.createText();
    label43.characters = "Button";
    label43.setBoundVariable("fontSize", var_fontSize_md);
    label43.fills = [bindColor(var_color_action_tertiary_hover_fg)];
    root43.appendChild(label43);
    variants.push(root43);
  }
  {
    const root44 = figma.createComponent();
    root44.name = "variant=tertiary, size=medium, state=active";
    root44.layoutMode = "HORIZONTAL";
    root44.primaryAxisAlignItems = "CENTER";
    root44.counterAxisAlignItems = "CENTER";
    root44.primaryAxisSizingMode = "AUTO";
    root44.counterAxisSizingMode = "AUTO";
    root44.setBoundVariable("cornerRadius", var_radius_md);
    root44.setBoundVariable("paddingTop", var_spacing_sm);
    root44.setBoundVariable("paddingBottom", var_spacing_sm);
    root44.setBoundVariable("paddingLeft", var_spacing_md);
    root44.setBoundVariable("paddingRight", var_spacing_md);
    const label44 = figma.createText();
    label44.characters = "Button";
    label44.setBoundVariable("fontSize", var_fontSize_md);
    label44.fills = [bindColor(var_color_action_tertiary_hover_fg)];
    root44.appendChild(label44);
    variants.push(root44);
  }
  {
    const root45 = figma.createComponent();
    root45.name = "variant=tertiary, size=medium, state=focus";
    root45.layoutMode = "HORIZONTAL";
    root45.primaryAxisAlignItems = "CENTER";
    root45.counterAxisAlignItems = "CENTER";
    root45.primaryAxisSizingMode = "AUTO";
    root45.counterAxisSizingMode = "AUTO";
    root45.setBoundVariable("cornerRadius", var_radius_md);
    root45.setBoundVariable("paddingTop", var_spacing_sm);
    root45.setBoundVariable("paddingBottom", var_spacing_sm);
    root45.setBoundVariable("paddingLeft", var_spacing_md);
    root45.setBoundVariable("paddingRight", var_spacing_md);
    const label45 = figma.createText();
    label45.characters = "Button";
    label45.setBoundVariable("fontSize", var_fontSize_md);
    label45.fills = [bindColor(var_color_action_tertiary_default_fg)];
    root45.appendChild(label45);
    variants.push(root45);
  }
  {
    const root46 = figma.createComponent();
    root46.name = "variant=tertiary, size=medium, state=disabled";
    root46.layoutMode = "HORIZONTAL";
    root46.primaryAxisAlignItems = "CENTER";
    root46.counterAxisAlignItems = "CENTER";
    root46.primaryAxisSizingMode = "AUTO";
    root46.counterAxisSizingMode = "AUTO";
    root46.setBoundVariable("cornerRadius", var_radius_md);
    root46.setBoundVariable("paddingTop", var_spacing_sm);
    root46.setBoundVariable("paddingBottom", var_spacing_sm);
    root46.setBoundVariable("paddingLeft", var_spacing_md);
    root46.setBoundVariable("paddingRight", var_spacing_md);
    const label46 = figma.createText();
    label46.characters = "Button";
    label46.setBoundVariable("fontSize", var_fontSize_md);
    label46.fills = [bindColor(var_color_action_tertiary_default_fg)];
    root46.appendChild(label46);
    variants.push(root46);
  }
  {
    const root47 = figma.createComponent();
    root47.name = "variant=tertiary, size=medium, state=loading";
    root47.layoutMode = "HORIZONTAL";
    root47.primaryAxisAlignItems = "CENTER";
    root47.counterAxisAlignItems = "CENTER";
    root47.primaryAxisSizingMode = "AUTO";
    root47.counterAxisSizingMode = "AUTO";
    root47.setBoundVariable("cornerRadius", var_radius_md);
    root47.setBoundVariable("paddingTop", var_spacing_sm);
    root47.setBoundVariable("paddingBottom", var_spacing_sm);
    root47.setBoundVariable("paddingLeft", var_spacing_md);
    root47.setBoundVariable("paddingRight", var_spacing_md);
    const label47 = figma.createText();
    label47.characters = "Button";
    label47.setBoundVariable("fontSize", var_fontSize_md);
    label47.fills = [bindColor(var_color_action_tertiary_default_fg)];
    root47.appendChild(label47);
    variants.push(root47);
  }

  const componentSet = figma.combineAsVariants(variants, figma.currentPage);
  componentSet.name = "Button";
  figma.currentPage.selection = [componentSet];
  figma.viewport.scrollAndZoomIntoView([componentSet]);
  figma.closePlugin("Created Button component set (48 variants).");
}

main();
