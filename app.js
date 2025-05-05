/**
 * Live Objection Handler - Extended Functionality
 * This script adds additional features to the core speech recognition and AI response system.
 */

// Initialize OpenAI client
let openaiClient = null;

function initializeOpenAIClient() {
  const apiKey = localStorage.getItem('openai_api_key') || '';
  if (apiKey) {
    openaiClient = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true // Required for client-side usage
    });
    return true;
  }
  return false;
}

// Make the client available globally
window.getOpenAIClient = function() {
  if (!openaiClient && localStorage.getItem('openai_api_key')) {
    initializeOpenAIClient();
  }
  return openaiClient;
};

document.addEventListener('DOMContentLoaded', () => {
  // Check if the main speech recognition is initialized
  const speechRecognitionExists = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!speechRecognitionExists) {
    alert('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
    return;
  }

  // DOM Elements
  const toggleButton = document.getElementById('toggle');
  const objectionText = document.getElementById('lastObjection');
  const replyText = document.getElementById('reply');
  
  // Recent objections history
  const maxHistoryItems = 5;
  let objectionHistory = [];
  
  // Initialize API Key from local storage and create OpenAI client
  let apiKey = localStorage.getItem('openai_api_key') || '';
  if (apiKey) {
    initializeOpenAIClient();
  }
  
  // Check for API key on startup
  if (!apiKey) {
    promptForApiKey();
  }
  
  // Add API key functionality with improved handling
  function promptForApiKey() {
    // Create modal for better UX than simple prompt
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '1000';
    
    const modalContent = document.createElement('div');
    modalContent.style.backgroundColor = 'white';
    modalContent.style.padding = '20px';
    modalContent.style.borderRadius = '5px';
    modalContent.style.width = '80%';
    modalContent.style.maxWidth = '500px';
    
    const heading = document.createElement('h3');
    heading.textContent = 'Enter your OpenAI API Key';
    heading.style.marginBottom = '15px';
    
    const info = document.createElement('p');
    info.innerHTML = 'Your API key is stored locally in your browser and never sent to any server except OpenAI.';
    info.style.fontSize = '14px';
    info.style.marginBottom = '15px';
    
    const input = document.createElement('input');
    input.type = 'password';
    input.placeholder = 'sk-...';
    input.style.width = '100%';
    input.style.padding = '8px';
    input.style.marginBottom = '15px';
    input.style.borderRadius = '4px';
    input.style.border = '1px solid #ccc';
    input.value = apiKey; // Pre-fill if exists
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'space-between';
    
    const saveButton = document.createElement('button');
    saveButton.textContent = 'Save API Key';
    saveButton.style.padding = '8px 16px';
    saveButton.style.backgroundColor = '#4a6fa5';
    saveButton.style.color = 'white';
    saveButton.style.border = 'none';
    saveButton.style.borderRadius = '4px';
    saveButton.style.cursor = 'pointer';
    
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.style.padding = '8px 16px';
    cancelButton.style.backgroundColor = '#f8f9fa';
    cancelButton.style.color = '#333';
    cancelButton.style.border = '1px solid #ccc';
    cancelButton.style.borderRadius = '4px';
    cancelButton.style.cursor = 'pointer';
    
    // Status message
    const statusMsg = document.createElement('p');
    statusMsg.style.marginTop = '10px';
    statusMsg.style.fontSize = '14px';
    
    // Add event listeners
    saveButton.addEventListener('click', () => {
      const key = input.value.trim();
      if (key && key.startsWith('sk-')) {
        apiKey = key;
        localStorage.setItem('openai_api_key', key);
        initializeOpenAIClient(); // Initialize client after saving key
        document.body.removeChild(modal);
        return true;
      } else {
        statusMsg.textContent = 'Invalid API key format. It should start with "sk-"';
        statusMsg.style.color = 'red';
      }
    });
    
    cancelButton.addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    // Add escaping with the Escape key
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.body.removeChild(modal);
      }
    });
    
    // Add to DOM
    buttonContainer.appendChild(cancelButton);
    buttonContainer.appendChild(saveButton);
    
    modalContent.appendChild(heading);
    modalContent.appendChild(info);
    modalContent.appendChild(input);
    modalContent.appendChild(buttonContainer);
    modalContent.appendChild(statusMsg);
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Focus the input
    setTimeout(() => input.focus(), 0);
    
    // Return true if key already exists, otherwise we don't know yet
    return !!apiKey;
  }
  
  // Enhance the onresult function to save history
  const originalOnResult = r.onresult;
  r.onresult = async function(e) {
    const txt = e.results[e.results.length-1][0].transcript.trim();
    
    // Save to history if it's a question or objection
    if (/[?]|too expensive|not sure|need more/i.test(txt)) {
      addToHistory(txt);
    }
    
    // Call original handler
    await originalOnResult(e);
  };
  
  // Add to objection history
  function addToHistory(text) {
    // Only add if not a duplicate of the most recent
    if (objectionHistory.length === 0 || objectionHistory[0] !== text) {
      objectionHistory.unshift(text);
      
      // Keep history to max size
      if (objectionHistory.length > maxHistoryItems) {
        objectionHistory.pop();
      }
    }
  }
  
  // Create history interface if desired
  function showHistory() {
    if (objectionHistory.length === 0) {
      alert('No objection history yet');
      return;
    }
    
    const historyHTML = objectionHistory
      .map((objection, i) => `<div>${i+1}. "${objection}"</div>`)
      .join('');
      
    const historyContainer = document.createElement('div');
    historyContainer.innerHTML = historyHTML;
    historyContainer.style.position = 'fixed';
    historyContainer.style.top = '10px';
    historyContainer.style.right = '10px';
    historyContainer.style.background = '#fff';
    historyContainer.style.padding = '10px';
    historyContainer.style.border = '1px solid #ccc';
    historyContainer.style.borderRadius = '5px';
    historyContainer.style.zIndex = '1000';
    
    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.marginTop = '10px';
    closeBtn.addEventListener('click', () => document.body.removeChild(historyContainer));
    
    historyContainer.appendChild(closeBtn);
    document.body.appendChild(historyContainer);
  }
  
  // Modify the fetch call to use the stored API key
  const originalFetch = window.fetch;
  window.fetch = function(url, options) {
    if (url === 'https://api.openai.com/v1/chat/completions') {
      // If no API key is stored or in options, prompt for one
      if (!apiKey && (!options.headers || !options.headers.Authorization)) {
        if (!promptForApiKey()) {
          return Promise.reject(new Error('API key required'));
        }
      }
      
      // Use the stored API key if one exists
      if (apiKey && options && options.headers) {
        options.headers.Authorization = `Bearer ${apiKey}`;
      }
    }
    
    return originalFetch.call(this, url, options);
  };
  
  // Add keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Spacebar to toggle recording
    if (e.code === 'Space' && document.activeElement.tagName !== 'INPUT') {
      e.preventDefault();
      toggleButton.click();
    }
    
    // H key to show history
    if (e.code === 'KeyH' && e.altKey) {
      e.preventDefault();
      showHistory();
    }
    
    // K key to enter API key
    if (e.code === 'KeyK' && e.altKey) {
      e.preventDefault();
      promptForApiKey();
    }
  });
  
  // Add visual feedback when recognition is active
  toggleButton.addEventListener('click', () => {
    if (on) {
      toggleButton.classList.add('active');
      document.title = '🎤 Listening - Live Objection Handler';
    } else {
      toggleButton.classList.remove('active');
      document.title = 'Live Objection Handler';
    }
  });
  
  // Add info about keyboard shortcuts
  const infoDiv = document.createElement('div');
  infoDiv.style.marginTop = '20px';
  infoDiv.style.fontSize = '12px';
  infoDiv.style.color = '#666';
  infoDiv.innerHTML = `
    <p>Keyboard shortcuts: Spacebar (toggle recording), Alt+H (history), Alt+K (API key)</p>
    <p>Add your OpenAI API key with Alt+K or when prompted</p>
  `;
  document.body.appendChild(infoDiv);
});