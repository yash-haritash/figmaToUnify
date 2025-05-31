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

// Function to map pixel size to the closest smaller border size token
function mapToBorderSizeToken(pxSize) {
  const sizes = Object.entries(borderSizeTokens);
  const largerSize = sizes.find(([_, size]) => size > pxSize);
  if (!largerSize) return sizes[sizes.length - 1][0]; // Use largest if pxSize exceeds all
  const largerIndex = sizes.indexOf(largerSize);
  if (largerIndex === 0) return sizes[0][0]; // Use smallest if pxSize is less than all
  const justSmaller = sizes[largerIndex - 1];
  return justSmaller[1] === pxSize ? justSmaller[0] : justSmaller[0];
}

// Function to map numeric weight to font weight token
function mapToFontWeightToken(weight) {
  const mapping = fontWeightTokens.find(({ range }) => weight >= range[0] && weight <= range[1]);
  return mapping ? mapping.token : 'regular'; // Default to 'regular' if no match
}

// Function to map pixel size to the closest smaller font size token
function mapToFontSizeToken(pxSize) {
  const sizes = Object.entries(fontSizeTokens);
  const largerSize = sizes.find(([_, size]) => size > pxSize);
  if (!largerSize) return sizes[sizes.length - 1][0]; // Use largest if pxSize exceeds all
  const largerIndex = sizes.indexOf(largerSize);
  if (largerIndex === 0) return sizes[0][0]; // Use smallest if pxSize is less than all
  const justSmaller = sizes[largerIndex - 1];
  return justSmaller[1] === pxSize ? justSmaller[0] : justSmaller[0];
}

async function convertFigmaRadioButtonToUnify(figmaJson, overrides = {}) {
  // Helper function to convert RGBA to hex
  function rgbaToHex(r, g, b, a) {
    const toHex = (value) => {
      const hex = Math.round(value * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}${a < 1 ? toHex(a) : ""}`.toUpperCase();
  }

  // Extract nodes
  const nodes = figmaJson.Result?.nodes || figmaJson.nodes || {};
  const nodeKey = Object.keys(nodes)[0];
  if (!nodeKey) throw new Error('No nodes found in Figma JSON');
  const radioInstance = nodes[nodeKey]?.document || {};
  if (!radioInstance) throw new Error('Component instance not found');
  const props = radioInstance.componentProperties || {};

  // Find child frames and nodes
  // For Checkbox structure
  const textFrame = radioInstance.children?.find(child => child.name === "Text and supporting text")?.children || [];
  const inputFrame = radioInstance.children?.find(child => child.name === "Input")?.children || [];
  const textNode = textFrame.find(child => child.name === "Text") || {};
  const supportingTextNode = textFrame.find(child => child.name === "Supporting text") || {};
  const checkboxBaseNode = inputFrame.find(child => child.name === "_Checkbox base") || {};

  // For Radio Field structure
  const checkboxFrame = radioInstance.children?.find(child => child.name === "Checkbox and Label")?.children || [];
  const descriptionFrame = radioInstance.children?.find(child => child.name === "Description Row")?.children || [];
  const radioFieldTextNode = checkboxFrame.find(child => child.name === "Label") || {};
  const radioFieldSupportingTextNode = descriptionFrame.find(child => child.name === "Description") || {};
  const radioShapeNode = checkboxFrame.find(child => child.name === "Radio") || {};

  // Use Checkbox structure if available, else Radio Field
  const finalTextNode = textNode.id ? textNode : radioFieldTextNode;
  const finalSupportingTextNode = supportingTextNode.id ? supportingTextNode : radioFieldSupportingTextNode;
  const finalShapeNode = checkboxBaseNode.id ? checkboxBaseNode : radioShapeNode;

  // Extract label color
  let labelColorObj = getSolidColorFromFills(finalTextNode.fills) || { r: 0.11764705926179886, g: 0.11764705926179886, b: 0.11764705926179886, a: 1 };
  const labelHex = rgbaToHex(labelColorObj.r, labelColorObj.g, labelColorObj.b, labelColorObj.a);

  // Extract description color
  let descriptionColorObj = getSolidColorFromFills(finalSupportingTextNode.fills) || { r: 0.4588235318660736, g: 0.4588235318660736, b: 0.4588235318660736, a: 1 };
  const descriptionHex = rgbaToHex(descriptionColorObj.r, descriptionColorObj.g, descriptionColorObj.b, descriptionColorObj.a);

  // Extract background color
  let backgroundColorObj = getSolidColorFromFills(radioInstance.fills) || { r: 0, g: 0, b: 0, a: 0 };
  const backgroundHex = backgroundColorObj.a > 0 ? rgbaToHex(backgroundColorObj.r, backgroundColorObj.g, backgroundColorObj.b, backgroundColorObj.a) : 'transparent';

  // Extract border properties from root instance
  let borderColorObj = getSolidColorFromStrokes(radioInstance.strokes) || { r: 0.1725490242242813, g: 0.1725490242242813, b: 0.1725490242242813, a: 1 };
  const borderHex = rgbaToHex(borderColorObj.r, borderColorObj.g, borderColorObj.b, borderColorObj.a);
  const borderWidthPx = radioInstance.strokeWeight || 0;

  // Extract properties
  const size = getPropertyValue(props, "Size", "md").toLowerCase();
  const isDisabled = getPropertyValue(props, "State") === "Disabled";
  const checked = getPropertyValue(props, "Checked") === "True" || getPropertyValue(props, "Value Type") === "Checked";
  // Prioritize node characters over componentProperties
  const label = overrides.label || finalTextNode.characters || getPropertyValue(props, "Text") || getPropertyValue(props, "Label") || "";
  const description = overrides.description || finalSupportingTextNode.characters || getPropertyValue(props, "Hint Text") || getPropertyValue(props, "Description") || "";
  const defaultValue = overrides.defaultValue || getPropertyValue(props, "DefaultValue");
  const id = overrides.id || generateId("terms-radio-");

  // Map font size and weight
  const labelFontSize = finalTextNode.style?.fontSize || 0;
  const descriptionFontSize = finalSupportingTextNode.style?.fontSize || 0;
  const labelFontWeight = finalTextNode.style?.fontWeight || (finalTextNode.boundVariables?.fontWeight?.[0]?.id ? finalTextNode.style?.fontWeight : 0);
  const descriptionFontWeight = finalSupportingTextNode.style?.fontWeight || (finalSupportingTextNode.boundVariables?.fontWeight?.[0]?.id ? finalSupportingTextNode.style?.fontWeight : 0);

  // Map to tokens
  const labelVariant = mapToFontSizeToken(labelFontSize);
  const descriptionVariant = mapToFontSizeToken(descriptionFontSize);
  const labelWeight = mapToFontWeightToken(labelFontWeight);
  const descriptionWeight = mapToFontWeightToken(descriptionFontWeight);
  const borderWidthToken = { all: mapToBorderSizeToken(borderWidthPx) };

  // Map layout properties
  const widthPx = Math.round(radioInstance.absoluteBoundingBox?.width || 0);
  const heightPx = Math.round(radioInstance.absoluteBoundingBox?.height || 0);
  const paddingPx = radioInstance.paddingTop ?? radioInstance.paddingBottom ?? radioInstance.paddingLeft ?? radioInstance.paddingRight ?? 0;
  const marginPx = 0;
  const widthClass = widthPx ? `${widthPx}px` : "0px";
  const heightClass = heightPx ? `${heightPx}px` : "0px";
  const paddingToken = paddingPx ? { all: `${paddingPx}px` } : { all: "0px" };
  const marginToken = { all: "0px" };

  // Build content object
  const content = {};
  if (label) content.label = label;
  if (description) content.description = description;
  if (defaultValue) content.defaultValue = defaultValue;
  content.checked = checked;

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
          styles: {
            padding: paddingToken,
            margin: marginToken,
            backgroundColor: isDisabled ? '#CCCCCC' : backgroundHex,
            borderColor: isDisabled ? '#CCCCCC' : borderHex,
            borderWidth: borderWidthToken,
            width: widthClass,
            height: heightClass
          },
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

// Helper Functions
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