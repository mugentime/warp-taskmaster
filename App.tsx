
import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import Header from './components/Header';
import SettingsModal from './components/SettingsModal';
import ErrorBoundary from './components/ErrorBoundary';

const App: React.FC = () => {
  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('🚀 TaskMaster App mounted');
    console.log('🔧 Environment:', {
      baseUrl: import.meta.env.VITE_API_BASE_URL,
      appName: import.meta.env.VITE_APP_NAME,
      mode: import.meta.env.MODE
    });
    
    // Simulate app initialization
    setTimeout(() => {
      setIsLoading(false);
      console.log('✅ TaskMaster App ready');
    }, 100);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-200 flex items-center justify-center" data-testid="app-loading">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">TaskMaster</h2>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-900 text-gray-200 font-sans" data-testid="app-main">
        <Header onSettingsClick={() => setSettingsModalOpen(true)} />
        <main className="p-4 sm:p-6 lg:p-8" data-testid="app-content">
          <Dashboard />
        </main>
        <footer className="text-center p-4 text-gray-600 text-sm" data-testid="app-footer">
          <p>Funding rate data is live from the Binance API. Bot and account data are fetched from your local backend.</p>
        </footer>
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setSettingsModalOpen(false)}
        />
      </div>
    </ErrorBoundary>
  );
};

export default App;