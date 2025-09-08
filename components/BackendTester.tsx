
import React, { useState } from 'react';

const CodeBlock: React.FC<{ command: string }> = ({ command }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(command);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-gray-900 rounded-md p-3 relative text-gray-300 font-mono text-xs">
            <pre className="whitespace-pre-wrap break-all"><code>{command}</code></pre>
            <button
                onClick={handleCopy}
                className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-sans px-2 py-1 rounded"
            >
                {copied ? 'Copied!' : 'Copy'}
            </button>
        </div>
    );
};


const BackendTester: React.FC = () => {
    const [apiKey, setApiKey] = useState('');
    const [apiSecret, setApiSecret] = useState('');
    
    const accountStatusCommand = `curl -X POST http://localhost:3001/api/v1/account-status \\
     -H "Content-Type: application/json" \\
     -d '{
           "apiKey": "${apiKey || 'YOUR_API_KEY'}",
           "apiSecret": "${apiSecret || 'YOUR_API_SECRET'}"
         }'`;

    const launchBotCommand = `curl -X POST http://localhost:3001/api/v1/launch-bot \\
     -H "Content-Type: application/json" \\
     -d '{
           "id": "BTCUSDT-demotest-123",
           "name": "Test Short Bot",
           "symbol": "BTCUSDT",
           "strategyType": "Short Perp",
           "investment": 1000,
           "leverage": 10,
           "apiKey": "${apiKey || 'YOUR_API_KEY'}",
           "apiSecret": "${apiSecret || 'YOUR_API_SECRET'}"
         }'`;

    return (
        <div className="text-gray-300 space-y-6">
            <div>
                <h3 className="text-lg font-bold text-white mb-2">Backend API Tester</h3>
                <p className="text-sm text-gray-400">
                    Use this tool to test your local backend server. First, run the server from the <code className="bg-gray-700 p-1 rounded-md text-xs">backend</code> directory (<code className="bg-gray-700 p-1 rounded-md text-xs">npm start</code>). Then, enter your testnet keys below to generate commands you can run in your terminal.
                </p>
            </div>

            <div className="space-y-4">
                <div>
                    <label htmlFor="testApiKey" className="block text-sm font-medium">Testnet API Key</label>
                    <input
                        type="password"
                        id="testApiKey"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Enter your testnet API key"
                        className="mt-1 block w-full bg-gray-900 border border-gray-700 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                    />
                </div>
                <div>
                    <label htmlFor="testApiSecret" className="block text-sm font-medium">Testnet Secret Key</label>
                    <input
                        type="password"
                        id="testApiSecret"
                        value={apiSecret}
                        onChange={(e) => setApiSecret(e.target.value)}
                        placeholder="Enter your testnet secret key"
                        className="mt-1 block w-full bg-gray-900 border border-gray-700 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                    />
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <p className="text-sm font-semibold mb-2">Check Account Status:</p>
                    <CodeBlock command={accountStatusCommand} />
                </div>
                <div>
                    <p className="text-sm font-semibold mb-2">Launch a Demo Bot:</p>
                    <CodeBlock command={launchBotCommand} />
                </div>
            </div>
        </div>
    );
};

export default BackendTester;