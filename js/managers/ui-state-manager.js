// UI State Management
export class UIStateManager {
    constructor() {
        this.states = {
            READY: 'ready',
            LISTENING: 'listening',
            PROCESSING: 'processing',
            ERROR: 'error'
        };
        this.currentState = this.states.READY;
    }
    updateState(newState) {
        this.applyStateUpdate = (state, statusDot, statusText, recordBtn) => {
            statusDot.className = '';
            switch (state) {
                case this.states.READY:
                    if (statusText) statusText.textContent = 'Ready';
                    if (recordBtn) recordBtn.classList.remove('recording');
                    break;
                case this.states.LISTENING:
                    if (statusText) statusText.textContent = 'Listening...';
                    statusDot.classList.add('listening');
                    if (recordBtn) recordBtn.classList.add('recording');
                    break;
                case this.states.PROCESSING:
                    if (statusText) statusText.textContent = 'Processing...';
                    statusDot.classList.add('processing');
                    if (recordBtn) recordBtn.classList.add('recording');
                    break;
                case this.states.ERROR:
                    if (statusText) statusText.textContent = 'Error';
                    statusDot.classList.add('error');
                    if (recordBtn) recordBtn.classList.remove('recording');
                    break;
            }
        };
        this.currentState = newState;
        const updateWithRetry = (retryCount = 0) => {
            const statusDot = document.querySelector('#status-dot');
            const statusText = document.querySelector('#status-text');
            const recordBtn = document.querySelector('#toggle');
            if (statusDot) {
                statusDot.className = '';
                this.applyStateUpdate(newState, statusDot, statusText, recordBtn);
            } else if (retryCount < 3) {
                setTimeout(() => updateWithRetry(retryCount + 1), 100);
                setTimeout(() => updateWithRetry(retryCount + 1), 100);
                return;
            }
        };
        updateWithRetry();
        return newState;
    }
}