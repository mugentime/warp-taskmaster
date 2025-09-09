
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log('🎭 TaskMaster: Starting React application...');
console.log('🌐 Location:', window.location.href);
console.log('📋 Document ready state:', document.readyState);

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('❌ Root element not found!');
  document.body.innerHTML = `
    <div style="background: #1a202c; color: white; padding: 20px; text-align: center; min-height: 100vh; display: flex; align-items: center; justify-content: center;">
      <div>
        <h1 style="color: #ef4444; font-size: 24px; margin-bottom: 16px;">TaskMaster Initialization Error</h1>
        <p style="margin-bottom: 16px;">Could not find root element to mount React app.</p>
        <p style="color: #94a3b8; font-size: 14px;">Check that index.html contains &lt;div id="root"&gt;&lt;/div&gt;</p>
      </div>
    </div>
  `;
  throw new Error("Could not find root element to mount to");
}

console.log('✅ Root element found, creating React root...');

try {
  const root = ReactDOM.createRoot(rootElement);
  console.log('✅ React root created, rendering app...');
  
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  
  console.log('🎉 TaskMaster React app rendered successfully!');
} catch (error) {
  console.error('❌ Failed to render React app:', error);
  rootElement.innerHTML = `
    <div style="background: #1a202c; color: white; padding: 20px; text-align: center; min-height: 100vh; display: flex; align-items: center; justify-content: center;">
      <div>
        <h1 style="color: #ef4444; font-size: 24px; margin-bottom: 16px;">TaskMaster Render Error</h1>
        <p style="margin-bottom: 16px;">Failed to render React application.</p>
        <pre style="background: #374151; padding: 12px; border-radius: 6px; text-align: left; font-size: 12px; overflow: auto;">
${error.message || 'Unknown error'}
        </pre>
        <button onclick="window.location.reload()" style="margin-top: 16px; padding: 8px 16px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Refresh Page
        </button>
      </div>
    </div>
  `;
}
