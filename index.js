const fs = require('fs').promises;

// Border size token mapping (in pixels)
const borderSizeTokens = {
  'border-0': 0,
  'border-1': 1,
  'border-2': 2,
  'border-3': 3,
  'border-4': 4
};

// Font weight token mapping (numeric to named)
const fontWeightTokens = [
  { range: [100, 200], token: 'light' },
  { range: [300, 400], token: 'regular' },
  { range: [500, 500], token: 'medium' },
  { range: [600, 600], token: 'semi-bold' },
  { range: [700, 900], token: 'bold' }
];

// Variant (font size) token mapping (in pixels)
const fontSizeTokens = {
  'text-xxxs': 10,
  'text-xxs': 11,
  'text-xs': 12,
  'text-sm': 14,
  'text-md': 16,
  'text-lg': 18,
  'text-xl': 20,
  'display-xs': 24,
  'display-sm': 30,
  'display-md': 44,
  'display-lg': 48,
  'display-xl': 60,
  'display-2xl': 72
};

// Spacing token mapping for padding and margin
const spacingMapping = {
  '0px': { padding: 'p-0', margin: 'm-0' },
  '2px': { padding: 'p-xxs', margin: 'm-xxs' },
  '4px': { padding: 'p-xs', margin: 'm-xs' },
  '6px': { padding: 'p-sm', margin: 'm-sm' },
  '8px': { padding: 'p-md', margin: 'm-md' },
  '12px': { padding: 'p-lg', margin: 'm-lg' },
  '16px': { padding: 'p-xl', margin: 'm-xl' },
  '20px': { padding: 'p-2xl', margin: 'm-2xl' },
  '24px': { padding: 'p-3xl', margin: 'm-3xl' },
  '32px': { padding: 'p-4xl', margin: 'm-4xl' },
  '40px': { padding: 'p-5xl', margin: 'm-5xl' },
  '48px': { padding: 'p-6xl', margin: 'm-6xl' },
  '84px': { padding: 'p-[84px]', margin: 'm-[84px]' },
  '96px': { padding: 'p-9xl', margin: 'm-9xl' },
  'auto': { padding: 'p-auto', margin: 'm-auto' }
};

// Function to map pixel size to the closest smaller border size token
function mapToBorderSizeToken(pxSize) {
  const sizes = Object.entries(borderSizeTokens);
  const largerSize = sizes.find(([_, size]) => size > pxSize);
  if (!largerSize) return sizes[sizes.length - 1][0];
  const largerIndex = sizes.indexOf(largerSize);
  if (largerIndex === 0) return sizes[0][0];
  const justSmaller = sizes[largerIndex - 1];
  return justSmaller[1] === pxSize ? justSmaller[0] : justSmaller[0];
}

// Function to map numeric weight to font weight token
function mapToFontWeightToken(weight) {
  const mapping = fontWeightTokens.find(({ range }) => weight >= range[0] && weight <= range[1]);
  return mapping ? mapping.token : 'regular';
}

// Function to map pixel size to the closest smaller font size token
function mapToFontSizeToken(pxSize) {
  const sizes = Object.entries(fontSizeTokens);
  const largerSize = sizes.find(([_, size]) => size > pxSize);
  if (!largerSize) return sizes[sizes.length - 1][0];
  const largerIndex = sizes.indexOf(largerSize);
  if (largerIndex === 0) return sizes[0][0];
  const justSmaller = sizes[largerIndex - 1];
  return justSmaller[1] === pxSize ? justSmaller[0] : justSmaller[0];
}

// Function to map pixel size to the closest smaller spacing token
function mapToSpacingToken(pxSize, type = 'padding', direction = 'all') {
  const sizes = Object.entries(spacingMapping)
    .filter(([key]) => key !== 'auto')
    .map(([key, value]) => [parseInt(key), value[type]]);
  const largerSize = sizes.find(([size]) => size > pxSize);
  if (!largerSize) return spacingMapping['96px'][type];
  const largerIndex = sizes.indexOf(largerSize);
  if (largerIndex === 0) return spacingMapping['0px'][type];
  const justSmaller = sizes[largerIndex - 1];
  let baseToken = spacingMapping[`${justSmaller[0]}px`][type];

  if (direction !== 'all') {
    const prefix = type === 'padding' ? 'p' : 'm';
    let directionalPrefix;
    switch (direction) {
      case 't': directionalPrefix = prefix === 'p' ? 'pt' : 'mt'; break;
      case 'r': directionalPrefix = prefix === 'p' ? 'pe' : 'me'; break;
      case 'b': directionalPrefix = prefix === 'p' ? 'pb' : 'mb'; break;
      case 'l': directionalPrefix = prefix === 'p' ? 'ps' : 'ms'; break;
      case 'x': directionalPrefix = prefix === 'p' ? 'px' : 'mx'; break;
      case 'y': directionalPrefix = prefix === 'p' ? 'py' : 'my'; break;
      default: directionalPrefix = prefix;
    }
    baseToken = baseToken.replace(`${prefix}-`, `${directionalPrefix}-`);
  }
  return baseToken;
}

// Function to determine padding/margin token structure
function getSpacingTokenStructure(top, right, bottom, left, type = 'padding') {
  // Check if all directions are zero
  if (top === 0 && right === 0 && bottom === 0 && left === 0) {
    return null; // Return null to indicate the field should be omitted
  }

  // Check if raw pixel values are the same
  if (top === right && right === bottom && bottom === left) {
    return { all: mapToSpacingToken(top, type, 'all') };
  }

  // Map each direction to its token
  const mappedTop = mapToSpacingToken(top, type, 't');
  const mappedRight = mapToSpacingToken(right, type, 'r');
  const mappedBottom = mapToSpacingToken(bottom, type, 'b');
  const mappedLeft = mapToSpacingToken(left, type, 'l');

  // Double-check if mapped tokens are the same
  if (mappedTop === mappedRight && mappedRight === mappedBottom && mappedBottom === mappedLeft) {
    return { all: mapToSpacingToken(top, type, 'all') };
  }

  // Check if horizontal (left/right) and vertical (top/bottom) are the same
  const mappedHorizontal = mapToSpacingToken(left, type, 'x');
  const mappedVertical = mapToSpacingToken(top, type, 'y');
  if (mappedLeft === mappedRight && mappedTop === mappedBottom) {
    return {
      x: mappedHorizontal,
      y: mappedVertical
    };
  }

  // Use individual directions
  return {
    t: mappedTop,
    r: mappedRight,
    b: mappedBottom,
    l: mappedLeft
  };
}

async function convertFigmaRadioButtonToUnify(figmaJson, overrides = {}) {
  function rgbaToHex(r, g, b, a) {
    const toHex = (value) => {
      const hex = Math.round(value * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}${a < 1 ? toHex(a) : ""}`.toUpperCase();
  }

  const nodes = figmaJson.Result?.nodes || figmaJson.nodes || {};
  const nodeKey = Object.keys(nodes)[0];
  if (!nodeKey) throw new Error('No nodes found in Figma JSON');
  const radioInstance = nodes[nodeKey]?.document || {};
  if (!radioInstance) throw new Error('Component instance not found');
  const props = radioInstance.componentProperties || {};

  const textFrame = radioInstance.children?.find(child => child.name === "Text and supporting text")?.children || [];
  const inputFrame = radioInstance.children?.find(child => child.name === "Input")?.children || [];
  const textNode = textFrame.find(child => child.name === "Text") || {};
  const supportingTextNode = textFrame.find(child => child.name === "Supporting text") || {};
  const checkboxBaseNode = inputFrame.find(child => child.name === "_Checkbox base") || {};

  const checkboxFrame = radioInstance.children?.find(child => child.name === "Checkbox and Label")?.children || [];
  const descriptionFrame = radioInstance.children?.find(child => child.name === "Description Row")?.children || [];
  const radioFieldTextNode = checkboxFrame.find(child => child.name === "Label") || {};
  const radioFieldSupportingTextNode = descriptionFrame.find(child => child.name === "Description") || {};
  const radioShapeNode = checkboxFrame.find(child => child.name === "Radio") || {};

  const finalTextNode = textNode.id ? textNode : radioFieldTextNode;
  const finalSupportingTextNode = supportingTextNode.id ? supportingTextNode : radioFieldSupportingTextNode;
  const finalShapeNode = checkboxBaseNode.id ? checkboxBaseNode : radioShapeNode;

  let labelColorObj = getSolidColorFromFills(finalTextNode.fills) || { r: 0.11764705926179886, g: 0.11764705926179886, b: 0.11764705926179886, a: 1 };
  const labelHex = rgbaToHex(labelColorObj.r, labelColorObj.g, labelColorObj.b, labelColorObj.a);

  let descriptionColorObj = getSolidColorFromFills(finalSupportingTextNode.fills) || { r: 0.4588235318660736, g: 0.4588235318660736, b: 0.4588235318660736, a: 1 };
  const descriptionHex = rgbaToHex(descriptionColorObj.r, descriptionColorObj.g, descriptionColorObj.b, descriptionColorObj.a);

  let backgroundColorObj = getSolidColorFromFills(radioInstance.fills) || { r: 0, g: 0, b: 0, a: 0 };
  const backgroundHex = backgroundColorObj.a > 0 ? rgbaToHex(backgroundColorObj.r, backgroundColorObj.g, backgroundColorObj.b, backgroundColorObj.a) : 'transparent';

  let borderColorObj = getSolidColorFromStrokes(radioInstance.strokes) || { r: 0.1725490242242813, g: 0.1725490242242813, b: 0.1725490242242813, a: 1 };
  const borderHex = rgbaToHex(borderColorObj.r, borderColorObj.g, borderColorObj.b, borderColorObj.a);
  const borderWidthPx = radioInstance.strokeWeight || 0;

  const size = getPropertyValue(props, "Size", "md").toLowerCase();
  const isDisabled = getPropertyValue(props, "State") === "Disabled";
  const checked = getPropertyValue(props, "Checked") === "True" || getPropertyValue(props, "Value Type") === "Checked";
  const label = overrides.label || finalTextNode.characters || getPropertyValue(props, "Text") || getPropertyValue(props, "Label") || "";
  const description = overrides.description || finalSupportingTextNode.characters || getPropertyValue(props, "Hint Text") || getPropertyValue(props, "Description") || "";
  const defaultValue = overrides.defaultValue || getPropertyValue(props, "DefaultValue");
  const id = overrides.id || generateId("terms-radio-");

  const labelFontSize = finalTextNode.style?.fontSize || 0;
  const descriptionFontSize = finalSupportingTextNode.style?.fontSize || 0;
  const labelFontWeight = finalTextNode.style?.fontWeight || (finalTextNode.boundVariables?.fontWeight?.[0]?.id ? finalTextNode.style?.fontWeight : 0);
  const descriptionFontWeight = finalSupportingTextNode.style?.fontWeight || (finalSupportingTextNode.boundVariables?.fontWeight?.[0]?.id ? finalSupportingTextNode.style?.fontWeight : 0);

  const labelVariant = mapToFontSizeToken(labelFontSize);
  const descriptionVariant = mapToFontSizeToken(descriptionFontSize);
  const labelWeight = mapToFontWeightToken(labelFontWeight);
  const descriptionWeight = mapToFontWeightToken(descriptionFontWeight);
  const borderWidthToken = { all: mapToBorderSizeToken(borderWidthPx) };

  const widthPx = Math.round(radioInstance.absoluteBoundingBox?.width || 0);
  const heightPx = Math.round(radioInstance.absoluteBoundingBox?.height || 0);
  const paddingTop = radioInstance.paddingTop ?? 0;
  const paddingRight = radioInstance.paddingRight ?? 0;
  const paddingBottom = radioInstance.paddingBottom ?? 0;
  const paddingLeft = radioInstance.paddingLeft ?? 0;
  const marginTop = 0;
  const marginRight = 0;
  const marginBottom = 0;
  const marginLeft = 0;
  const widthClass = widthPx ? `${widthPx}px` : "0px";
  const heightClass = heightPx ? `${heightPx}px` : "0px";

  const paddingToken = getSpacingTokenStructure(paddingTop, paddingRight, paddingBottom, paddingLeft, 'padding');
  const marginToken = getSpacingTokenStructure(marginTop, marginRight, marginBottom, marginLeft, 'margin');

  // Log spacing values for debugging
  console.log('Spacing Values:', {
    padding: { top: paddingTop, right: paddingRight, bottom: paddingBottom, left: paddingLeft, token: paddingToken },
    margin: { top: marginTop, right: marginRight, bottom: marginBottom, left: marginLeft, token: marginToken }
  });

  const content = {};
  if (label) content.label = label;
  if (description) content.description = description;
  if (defaultValue) content.defaultValue = defaultValue;
  content.checked = checked;

  // Build styles object, omitting padding and margin if they are null
  const styles = {
    backgroundColor: isDisabled ? '#CCCCCC' : backgroundHex,
    borderColor: isDisabled ? '#CCCCCC' : borderHex,
    borderWidth: borderWidthToken,
    width: widthClass,
    height: heightClass
  };
  if (paddingToken) styles.padding = paddingToken;
  if (marginToken) styles.margin = marginToken;

  return {
    [id]: {
      component: {
        componentType: "RadioButton",
        appearance: {
          size,
          description: {
            color: isDisabled ? '#CCCCCC' : descriptionHex,
            variant: descriptionVariant,
            weight: descriptionWeight
          },
          styles,
          label: {
            color: isDisabled ? '#CCCCCC' : labelHex,
            variant: labelVariant,
            weight: labelWeight
          }
        },
        content
      },
      visibility: {
        value: !isDisabled
      },
      dpOn: mapInteractions(radioInstance),
      displayName: overrides.displayName || generateDisplayName("RadioButton"),
      dataSourceIds: [],
      id,
      parentId: "root_id"
    }
  };
}

function getSolidColorFromFills(fills) {
  if (Array.isArray(fills)) {
    const solid = fills.find(f => f.type === 'SOLID' && (f.visible === undefined || f.visible === true));
    if (solid && solid.color) return solid.color;
  }
  return null;
}

function getSolidColorFromStrokes(strokes) {
  if (Array.isArray(strokes)) {
    const solid = strokes.find(f => f.type === 'SOLID' && (f.visible === undefined || f.visible === true));
    if (solid && solid.color) return solid.color;
  }
  return null;
}

function getPropertyValue(props, propName, defaultValue = undefined) {
  return props[propName]?.value ?? defaultValue;
}

function generateDisplayName(baseName) {
  return `${baseName}_${Math.random().toString(36).substring(2, 7)}`;
}

function generateId(prefix = '') {
  return `${prefix}${Math.random().toString(36).substring(2, 9)}`;
}

function mapInteractions(node) {
  const interactions = [];
  if (node.interactions?.length > 0) {
    node.interactions.forEach(i => {
      if (i.trigger?.type === 'ON_CLICK') {
        interactions.push({ event: 'click', action: 'toggle' });
      } else if (i.trigger?.type === 'ON_HOVER' || i.trigger?.type === 'MOUSE_ENTER') {
        interactions.push({ event: 'hover', action: 'highlight' });
      }
    });
  }
  return interactions.length ? interactions : [];
}

async function main() {
  try {
    const figmaJson = JSON.parse(await fs.readFile('figma.json', 'utf8'));
    const unifyOutput = await convertFigmaRadioButtonToUnify(figmaJson, {
      id: "terms-radio-1",
      displayName: "RadioButton_0d5ph"
    });
    await fs.writeFile('unify.json', JSON.stringify(unifyOutput, null, 2), 'utf8');
    console.log('Unify output saved to unify.json');
  } catch (error) {
    console.error('Error processing figma.json:', error);
    process.exit(1);
  }
}

main();