// content.js
console.log('Content script loaded on', location.href);

// Store found elements
let whiteElements = [];
// Current page URL for storage
const pageUrl = location.hostname;

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
      }
    });
  });
}

// Save color changes to storage
function saveColorChange(item, newValue) {
  chrome.storage.local.get([pageUrl], (data) => {
    // Get existing saved colors or create new object
    const savedColors = data[pageUrl] || {};
    
    // Create a unique ID for this item
    const itemId = item.type + '-' + (item.name || item.property);
    
    // Update the saved color
    savedColors[itemId] = {
      type: item.type,
      name: item.name,
      property: item.property,
      value: newValue,
      originalValue: item.originalValue
    };
    
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
        }
      });
      
      sendResponse({success: true});
    });
    return true; // Keep connection open for async response
  }
  
  return true; // Keep connection open for async response
});