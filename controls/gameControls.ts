
export const toggleFullscreen = (elementId: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    if (!document.fullscreenElement) {
        element.requestFullscreen().catch(err => {
            alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        });
    } else {
        document.exitFullscreen();
    }
};

export const shareCode = async (code: string) => {
    if (!navigator.clipboard) {
        alert('Clipboard API not available in this browser.');
        return;
    }
    try {
        await navigator.clipboard.writeText(code);
        alert('Code copied to clipboard!');
    } catch (err) {
        console.error('Failed to copy code: ', err);
        alert('Failed to copy code.');
    }
};
