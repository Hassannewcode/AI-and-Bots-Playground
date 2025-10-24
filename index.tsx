import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const renderError = (message: string) => {
    const rootElement = document.getElementById('root');
    if (rootElement) {
        rootElement.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: #ff8a8a; background-color: #181a20; height: 100vh; font-family: sans-serif; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                <h1 style="font-size: 1.5rem; margin-bottom: 1rem;">Application Error</h1>
                <p style="max-width: 600px; margin-bottom: 1rem; color: #d1d5db;">A critical error occurred, and the application cannot start.</p>
                <p style="max-width: 600px; margin-bottom: 1.5rem; color: #d1d5db;">Please try reloading the page. If the problem persists, check the browser's developer console for more details.</p>
                <p style="font-family: monospace; color: #9ca3af; font-size: 0.875rem; background-color: #272a33; padding: 0.5rem 1rem; border-radius: 0.25rem;">Error: ${message}</p>
            </div>
        `;
    }
};

window.addEventListener('error', (event) => {
    const rootElement = document.getElementById('root');
    // Only intervene if React hasn't rendered and it's a script loading error
    if (rootElement && !rootElement.hasChildNodes() && event.target instanceof HTMLScriptElement) { 
        renderError(`Failed to load script: ${event.filename}`);
    }
});

try {
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error("Could not find root element to mount to. Your index.html file might be corrupted.");
    }

    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
} catch (e) {
    const message = e instanceof Error ? e.message : 'An unknown error occurred during initialization.';
    renderError(message);
}
