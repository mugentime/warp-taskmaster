
import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import Header from './components/Header';
import SettingsModal from './components/SettingsModal';

const App: React.FC = () => {
  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans">
      <Header onSettingsClick={() => setSettingsModalOpen(true)} />
      <main className="p-4 sm:p-6 lg:p-8">
        <Dashboard />
      </main>
      <footer className="text-center p-4 text-gray-600 text-sm">
        <p>Funding rate data is live from the Binance API. Bot and account data are fetched from your local backend.</p>
      </footer>
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
      />
    </div>
  );
};

export default App;