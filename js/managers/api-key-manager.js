// API Key Management
export class APIKeyManager {
    constructor() {
        this.githubStorageKey = 'github_token';
        this.elevenLabsStorageKey = 'elevenlabs_api_key';
    }

    saveAPIKey(key) {
        if (!key) return false;
        try {
            localStorage.setItem(this.githubStorageKey, key);
            return true;
        } catch (error) {
            console.error('Failed to save GitHub token:', error);
            return false;
        }
    }

    saveElevenLabsAPIKey(key) {
        if (!key) return false;
        try {
            localStorage.setItem(this.elevenLabsStorageKey, key);
            return true;
        } catch (error) {
            console.error('Failed to save ElevenLabs API key:', error);
            return false;
        }
    }

    getAPIKey() {
        return localStorage.getItem(this.githubStorageKey) || '';
    }

    getElevenLabsAPIKey() {
        return localStorage.getItem(this.elevenLabsStorageKey) || '';
    }

    hasValidAPIKey() {
        const key = this.getAPIKey();
        return key && key.startsWith('ghp_') && key.length > 20;
    }

    hasValidElevenLabsAPIKey() {
        const key = this.getElevenLabsAPIKey();
        return key && key.length > 20;
    }

    updateKeyStatus() {
        const githubStatusElement = document.querySelector('#github-token-status-text');
        const githubTokenInput = document.querySelector('#github-token');
        const tokenStatus = document.querySelector('.token-status');
        if (this.hasValidAPIKey()) {
            githubStatusElement.textContent = '✓ Valid GitHub token connected';
            githubStatusElement.style.color = 'var(--success-color)';
            tokenStatus.classList.add('active');
            githubTokenInput.value = this.getAPIKey();
        } else {
            githubStatusElement.textContent = 'Please enter your GitHub token';
            githubStatusElement.style.color = '';
            tokenStatus.classList.remove('active');
        }
        const elevenLabsStatusElement = document.querySelector('#elevenlabs-api-key-status-text');
        const elevenLabsApiKeyInput = document.querySelector('#elevenlabs-api-key');
        if (this.hasValidElevenLabsAPIKey()) {
            elevenLabsStatusElement.textContent = '✓ Valid ElevenLabs API key connected';
            elevenLabsStatusElement.style.color = 'var(--success-color)';
            elevenLabsApiKeyInput.value = this.getElevenLabsAPIKey();
        } else {
            elevenLabsStatusElement.textContent = 'Please enter your ElevenLabs API key';
            elevenLabsStatusElement.style.color = '';
        }
    }
}