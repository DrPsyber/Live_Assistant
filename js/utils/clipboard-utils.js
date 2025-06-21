// Copy to clipboard functionality
export function copyToClipboard(text) {
    if (!text) return false;
    try {
        navigator.clipboard.writeText(text);
        return true;
    } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        // Fallback method
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            document.body.removeChild(textarea);
            return true;
        } catch (fallbackError) {
            console.error('Fallback clipboard copy failed:', fallbackError);
            document.body.removeChild(textarea);
            return false;
        }
    }
}