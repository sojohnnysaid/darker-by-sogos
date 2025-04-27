// popup.js
console.log('Popup script loaded');

// Convert RGB color to hex format (improved to handle rgba with alpha)
function rgbToHex(color) {
  // Check if already a hex color
  if (color.startsWith('#')) {
    return color;
  }
  
  // Extract RGB values including alpha
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i);
  if (!rgbMatch) {
    return color; // Return original if can't convert
  }
  
  // Convert to hex
  const r = parseInt(rgbMatch[1]);
  const g = parseInt(rgbMatch[2]);
  const b = parseInt(rgbMatch[3]);
  
  return '#' + 
    r.toString(16).padStart(2, '0') +
    g.toString(16).padStart(2, '0') +
    b.toString(16).padStart(2, '0');
}

// Show a status message that disappears after a few seconds
function showStatus(message, duration = 2000) {
  const statusEl = document.getElementById('status');
  
  statusEl.textContent = message;
  statusEl.style.display = 'block';
  
  setTimeout(() => {
    statusEl.textContent = '';
    statusEl.style.display = 'none';
  }, duration);
}

// Handle tab switching functionality
function setupTabs() {
  const tabs = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs and contents
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      // Add active class to clicked tab and its content
      tab.classList.add('active');
      const contentId = tab.getAttribute('data-tab');
      document.getElementById(contentId).classList.add('active');
      
      // If switching to saved sites tab, load the saved sites
      if (contentId === 'saved-sites-tab') {
        loadSavedSites();
      }
    });
  });
}

// Load all saved sites from storage
function loadSavedSites() {
  const sitesListDiv = document.getElementById('saved-sites-list');
  const sitesMessageDiv = document.getElementById('sites-message');
  const deleteAllButton = document.getElementById('delete-all-button');
  
  // Clear previous content
  sitesListDiv.innerHTML = '';
  
  // Get all saved items from storage
  chrome.storage.local.get(null, (data) => {
    const savedSites = Object.keys(data);
    
    if (savedSites.length === 0) {
      sitesMessageDiv.textContent = 'No saved sites found.';
      sitesMessageDiv.style.display = 'block';
      deleteAllButton.disabled = true;
      return;
    }
    
    // Enable delete all button
    deleteAllButton.disabled = false;
    
    // Hide message
    sitesMessageDiv.style.display = 'none';
    
    // Display each saved site
    savedSites.forEach(site => {
      const siteItem = document.createElement('div');
      siteItem.className = 'site-item';
      
      // Site name
      const siteName = document.createElement('div');
      siteName.className = 'site-name';
      siteName.textContent = site;
      
      // Actions container
      const actions = document.createElement('div');
      actions.className = 'site-actions';
      
      // Reset button
      const resetBtn = document.createElement('button');
      resetBtn.className = 'reset-site-btn';
      resetBtn.textContent = 'Delete';
      resetBtn.addEventListener('click', () => {
        // Remove this site from storage
        chrome.storage.local.remove(site, () => {
          // Remove the item from the list
          siteItem.remove();
          
          // Show success message
          showStatus(`Removed settings for ${site}`);
          
          // If no more sites, show the message and disable delete all button
          if (sitesListDiv.children.length === 0) {
            sitesMessageDiv.textContent = 'No saved sites found.';
            sitesMessageDiv.style.display = 'block';
            deleteAllButton.disabled = true;
          }
          
          // If we're on the current site, reset the colors in the page too
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const currentUrl = new URL(tabs[0].url).hostname;
            if (currentUrl === site) {
              chrome.tabs.sendMessage(
                tabs[0].id,
                { type: 'RESET_COLORS' },
                (response) => {
                  if (chrome.runtime.lastError) {
                    console.error('Error resetting colors:', chrome.runtime.lastError);
                  }
                }
              );
            }
          });
        });
      });
      
      // Add elements to the DOM
      actions.appendChild(resetBtn);
      siteItem.appendChild(siteName);
      siteItem.appendChild(actions);
      sitesListDiv.appendChild(siteItem);
    });
    
    // Setup Delete All button
    deleteAllButton.addEventListener('click', () => {
      if (confirm('Are you sure you want to delete settings for ALL sites?')) {
        chrome.storage.local.clear(() => {
          // Clear the list
          sitesListDiv.innerHTML = '';
          
          // Show message and disable button
          sitesMessageDiv.textContent = 'No saved sites found.';
          sitesMessageDiv.style.display = 'block';
          deleteAllButton.disabled = true;
          
          // Show success message
          showStatus('All site settings have been deleted');
          
          // Reset current page colors if needed
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(
              tabs[0].id,
              { type: 'RESET_COLORS' },
              (response) => {
                if (chrome.runtime.lastError) {
                  console.error('Error resetting colors:', chrome.runtime.lastError);
                }
              }
            );
          });
        });
      }
    });
  });
}

// When the popup loads
document.addEventListener('DOMContentLoaded', () => {
  // Setup tab navigation
  setupTabs();
  
  const colorsDiv = document.getElementById('colors');
  const messageDiv = document.getElementById('message');
  
  // Get the active tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];
    
    // Request white elements from the content script
    chrome.tabs.sendMessage(
      activeTab.id,
      { type: 'GET_WHITE_ELEMENTS' },
      (elements) => {
        if (chrome.runtime.lastError) {
          messageDiv.textContent = 'Error: ' + chrome.runtime.lastError.message;
          return;
        }
        
        if (!elements || elements.length === 0) {
          messageDiv.textContent = 'No white colors found on this page.';
          return;
        }
        
        // Hide the message
        messageDiv.style.display = 'none';
        
        // Display each element
        elements.forEach(element => {
          const itemDiv = document.createElement('div');
          itemDiv.className = 'color-item';
          
          // If the element has been saved before (value != originalValue)
          if (element.originalValue && element.value !== element.originalValue) {
            itemDiv.classList.add('saved');
          }
          
          // Create label
          const nameSpan = document.createElement('span');
          nameSpan.className = 'color-name';
          
          if (element.type === 'variable') {
            nameSpan.textContent = `Variable: ${element.name}`;
          } else if (element.type === 'body') {
            nameSpan.textContent = `Body: ${element.property}`;
          }
          
          // Create color picker
          const colorInput = document.createElement('input');
          colorInput.type = 'color';
          colorInput.value = rgbToHex(element.value);
          
          // Handle color changes
          colorInput.addEventListener('input', (e) => {
            const newColor = e.target.value;
            
            // Send message to content script to update color
            chrome.tabs.sendMessage(
              activeTab.id,
              {
                type: 'UPDATE_COLOR',
                payload: element,
                newColor: newColor
              },
              (response) => {
                if (chrome.runtime.lastError) {
                  console.error('Error updating color:', chrome.runtime.lastError);
                } else {
                  // Mark item as saved
                  itemDiv.classList.add('saved');
                }
              }
            );
          });
          
          // Add elements to the item
          itemDiv.appendChild(nameSpan);
          itemDiv.appendChild(colorInput);
          
          // Add item to the list
          colorsDiv.appendChild(itemDiv);
        });
      }
    );
  });
});