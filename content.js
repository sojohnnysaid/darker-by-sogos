// content.js
console.log('Content script loaded on', location.href);

// Store found elements
let whiteElements = [];
// Current page URL for storage
const pageUrl = location.hostname;

// Domain-specific selectors configuration
const DOMAIN_CONFIG = {
  'medium.com': {
    selectors: ['#root', '[data-fela-type="RULE"]'],
    properties: ['background-color', 'color'],
    styleTargets: {
      // For medium.com, target style elements with Fela styling
      styleSheets: true
    }
  },
  // Add more domain configurations as needed
  // 'example.com': {
  //   selectors: ['.bg-white', '.header'],
  //   properties: ['background-color', 'color']
  // }
};

// Find --white CSS variables and body color rules
function findWhiteElements() {
  whiteElements = [];
  
  // 1. Find CSS variables with --white in the name
  const cssVars = [];
  const root = getComputedStyle(document.documentElement);
  for (const prop of [...root]) {
    if (prop.includes('white')) {
      const value = root.getPropertyValue(prop).trim();
      cssVars.push({
        type: 'variable',
        name: prop,
        value: value,
        originalValue: value // Store original value
      });
    }
  }
  
  // 2. Find color-related properties in body
  const body = document.body;
  const bodyStyles = getComputedStyle(body);
  const colorProps = ['color', 'background-color', 'border-color', 'outline-color'];
  
  colorProps.forEach(prop => {
    const value = bodyStyles.getPropertyValue(prop);
    if (value && value !== 'transparent' && value !== 'none') {
      whiteElements.push({
        type: 'body',
        property: prop,
        value: value,
        originalValue: value // Store original value
      });
    }
  });
  
  // Check for domain-specific elements
  for (const domain in DOMAIN_CONFIG) {
    if (location.hostname.includes(domain)) {
      const config = DOMAIN_CONFIG[domain];
      
      // Handle normal DOM elements
      config.selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        
        elements.forEach(el => {
          config.properties.forEach(prop => {
            const value = getComputedStyle(el).getPropertyValue(prop);
            if (value && value !== 'transparent' && value !== 'none') {
              whiteElements.push({
                type: 'domain-specific',
                domain: domain,
                selector: selector,
                element: el,
                property: prop,
                value: value,
                originalValue: value
              });
            }
          });
        });
      });
      
      // Handle stylesheets for websites like Medium that use Fela
      if (config.styleTargets && config.styleTargets.styleSheets) {
        try {
          // Target Fela stylesheets or other dynamic styling
          const styleElements = document.querySelectorAll('style[data-fela-rehydration], style[data-fela-type="RULE"]');
          
          styleElements.forEach((styleEl, index) => {
            const styleSheet = styleEl.sheet;
            if (!styleSheet) return;
            
            Array.from(styleSheet.cssRules || []).forEach((rule, ruleIndex) => {
              if (rule.style) {
                // Create a friendly name for the rule to display in the UI
                let displayName = '';
                try {
                  displayName = rule.selectorText || `Rule #${ruleIndex}`;
                  // Limit the length for display
                  if (displayName.length > 40) {
                    displayName = displayName.substring(0, 37) + '...';
                  }
                } catch (e) {
                  displayName = `Rule #${ruleIndex}`;
                }
                
                // Look for white/light background colors in the styles
                const bgColor = rule.style.backgroundColor;
                if (bgColor && isLightColor(bgColor)) {
                  whiteElements.push({
                    type: 'stylesheet',
                    domain: domain,
                    styleElement: styleEl,
                    sheet: styleSheet,
                    ruleIndex: ruleIndex,
                    selector: rule.selectorText,
                    displayName: `${displayName} (background)`,
                    property: 'background-color',
                    value: bgColor,
                    originalValue: bgColor
                  });
                }
                
                // Check for white color properties too
                const color = rule.style.color;
                if (color && isLightColor(color)) {
                  whiteElements.push({
                    type: 'stylesheet',
                    domain: domain,
                    styleElement: styleEl,
                    sheet: styleSheet,
                    ruleIndex: ruleIndex,
                    selector: rule.selectorText,
                    displayName: `${displayName} (text)`,
                    property: 'color',
                    value: color,
                    originalValue: color
                  });
                }
              }
            });
          });
        } catch (e) {
          console.error('Error accessing stylesheets:', e);
        }
      }
    }
  }
  
  // Helper function to determine if a color is "light"
  function isLightColor(color) {
    // Simple check for white-ish colors
    if (!color) return false;
    
    try {
      // For transparent colors, return false
      if (color.includes('rgba') && color.match(/rgba\([^)]+,\s*0(?:\.0+)?\s*\)/)) {
        return false;
      }
      
      // Convert color to rgb format if it's not already
      let tempEl = document.createElement('div');
      tempEl.style.color = color;
      document.body.appendChild(tempEl);
      const rgbColor = getComputedStyle(tempEl).color;
      document.body.removeChild(tempEl);
      
      // Extract RGB values
      const rgbMatch = rgbColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
      if (rgbMatch) {
        const r = parseInt(rgbMatch[1]);
        const g = parseInt(rgbMatch[2]);
        const b = parseInt(rgbMatch[3]);
        
        // Calculate perceived brightness
        // Formula: (R * 0.299 + G * 0.587 + B * 0.114)
        const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
        
        // Check alpha channel - ignore fully transparent colors
        const alphaMatch = rgbColor.match(/rgba\([^)]+,\s*([\d.]+)\s*\)/);
        if (alphaMatch && parseFloat(alphaMatch[1]) < 0.1) {
          return false;
        }
        
        // If brightness is high (closer to 255), it's a light color
        return brightness > 200;
      }
    } catch (e) {
      console.error('Error analyzing color:', e);
    }
    
    return false;
  }
  
  // Add CSS variables to the results
  whiteElements = [...whiteElements, ...cssVars];
  
  console.log('Found white elements:', whiteElements);
  return whiteElements;
}

// Apply saved colors from storage
function applySavedColors() {
  chrome.storage.local.get([pageUrl], (data) => {
    const savedColors = data[pageUrl];
    if (!savedColors) return;
    
    console.log('Applying saved colors for', pageUrl, savedColors);
    
    // Apply each saved color
    Object.entries(savedColors).forEach(([id, colorInfo]) => {
      if (colorInfo.type === 'variable') {
        document.documentElement.style.setProperty(colorInfo.name, colorInfo.value, 'important');
      } else if (colorInfo.type === 'body') {
        document.body.style.setProperty(colorInfo.property, colorInfo.value, 'important');
      } else if (colorInfo.type === 'domain-specific') {
        // Try to find the element using the selector
        const elements = document.querySelectorAll(colorInfo.selector);
        elements.forEach(el => {
          el.style.setProperty(colorInfo.property, colorInfo.value, 'important');
        });
      } else if (colorInfo.type === 'stylesheet') {
        try {
          // For stylesheet modifications, we need to inject an override style
          const styleId = `darker-override-${id}`;
          let styleEl = document.getElementById(styleId);
          
          if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = styleId;
            document.head.appendChild(styleEl);
          }
          
          // Create a more specific CSS rule to override the original
          styleEl.textContent = `${colorInfo.selector} { ${colorInfo.property}: ${colorInfo.value} !important; }`;
        } catch (e) {
          console.error('Error applying stylesheet color:', e);
        }
      }
    });
  });
}

// Save color changes to storage
function saveColorChange(item, newValue) {
  chrome.storage.local.get([pageUrl], (data) => {
    // Get existing saved colors or create new object
    const savedColors = data[pageUrl] || {};
    
    // Create a unique ID for this item based on its type
    let itemId;
    if (item.type === 'stylesheet') {
      // For stylesheets, include more specific identifiers
      itemId = `${item.type}-${item.property}-${item.ruleIndex}`;
    } else {
      itemId = item.type + '-' + (item.name || item.property);
    }
    
    // Create a storage-friendly version without circular references or DOM elements
    const storageItem = {
      type: item.type,
      name: item.name,
      property: item.property,
      value: newValue,
      originalValue: item.originalValue
    };
    
    // Add type-specific properties for restoration
    if (item.type === 'stylesheet') {
      storageItem.selector = item.selector;
      storageItem.ruleIndex = item.ruleIndex;
    } else if (item.type === 'domain-specific') {
      storageItem.selector = item.selector;
      storageItem.domain = item.domain;
    }
    
    // Update the saved color
    savedColors[itemId] = storageItem;
    
    // Save back to storage
    chrome.storage.local.set({ [pageUrl]: savedColors }, () => {
      console.log('Saved color settings for', pageUrl);
    });
  });
}

// Run the initial scan
findWhiteElements();

// Apply saved colors for this page
applySavedColors();

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // When popup requests elements
  if (message.type === 'GET_WHITE_ELEMENTS') {
    // First check storage for any saved values
    chrome.storage.local.get([pageUrl], (data) => {
      const savedColors = data[pageUrl] || {};
      
      // Apply saved values to the elements list
      const updatedElements = whiteElements.map(element => {
        const itemId = element.type + '-' + (element.name || element.property);
        const savedColor = savedColors[itemId];
        
        if (savedColor) {
          return {
            ...element,
            value: savedColor.value,
            originalValue: element.originalValue || element.value
          };
        }
        
        return element;
      });
      
      sendResponse(updatedElements);
    });
    return true; // Keep connection open for async response
  }
  
  // When popup wants to update a color
  if (message.type === 'UPDATE_COLOR') {
    const item = message.payload;
    const newValue = message.newColor;
    
    if (item.type === 'variable') {
      // Update CSS variable
      document.documentElement.style.setProperty(item.name, newValue, 'important');
    } else if (item.type === 'body') {
      // Update body property
      document.body.style.setProperty(item.property, newValue, 'important');
    } else if (item.type === 'domain-specific') {
      // Update domain-specific element - check if element still exists
      if (item.element && item.element.style) {
        item.element.style.setProperty(item.property, newValue, 'important');
      } else {
        // Element may have been removed, try to find it again by selector
        if (item.selector) {
          const elements = document.querySelectorAll(item.selector);
          elements.forEach(el => {
            el.style.setProperty(item.property, newValue, 'important');
          });
        }
      }
    } else if (item.type === 'stylesheet') {
      try {
        // For stylesheet rules, create or update an override style
        const styleId = `darker-override-${item.type}-${item.ruleIndex}`;
        let styleEl = document.getElementById(styleId);
        
        if (!styleEl) {
          styleEl = document.createElement('style');
          styleEl.id = styleId;
          document.head.appendChild(styleEl);
        }
        
        // Create a more specific override rule
        styleEl.textContent = `${item.selector} { ${item.property}: ${newValue} !important; }`;
      } catch (e) {
        console.error('Error updating stylesheet color:', e);
      }
    }
    
    // Save the change to storage
    saveColorChange(item, newValue);
    
    sendResponse({success: true});
  }
  
  // When popup requests to reset all colors
  if (message.type === 'RESET_COLORS') {
    // Remove from storage
    chrome.storage.local.remove(pageUrl, () => {
      console.log('Reset all colors for', pageUrl);
      
      // Reset all elements to original values
      whiteElements.forEach(item => {
        if (item.type === 'variable' && item.originalValue) {
          document.documentElement.style.setProperty(item.name, item.originalValue);
        } else if (item.type === 'body' && item.originalValue) {
          document.body.style.setProperty(item.property, item.originalValue);
        } else if (item.type === 'domain-specific' && item.originalValue) {
          // Check if element still exists
          if (item.element && item.element.style) {
            item.element.style.setProperty(item.property, item.originalValue);
          } else if (item.selector) {
            // Try to find it by selector
            const elements = document.querySelectorAll(item.selector);
            elements.forEach(el => {
              el.style.setProperty(item.property, item.originalValue);
            });
          }
        } else if (item.type === 'stylesheet' && item.originalValue) {
          // Remove any override styles
          const styleId = `darker-override-${item.type}-${item.ruleIndex}`;
          const styleEl = document.getElementById(styleId);
          if (styleEl) {
            styleEl.remove();
          }
        }
      });
      
      // Also clean up any lingering override styles
      const allOverrides = document.querySelectorAll('style[id^="darker-override-"]');
      allOverrides.forEach(el => el.remove());
      
      sendResponse({success: true});
    });
    return true; // Keep connection open for async response
  }
  
  return true; // Keep connection open for async response
});