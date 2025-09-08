
import React, { useState, useEffect } from 'react';
import { encryptKeys } from '../services/cryptoService';

const STORAGE_KEY = 'binance-api-keys-encrypted';

const ApiKeyManager: React.FC = () => {
    const [apiKey, setApiKey] = useState('');
    const [apiSecret, setApiSecret] = useState('');
    const [password, setPassword] = useState('');
    const [status, setStatus] = useState<'idle' | 'saving' | 'error' | 'success'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [keysExist, setKeysExist] = useState(false);

    useEffect(() => {
        const storedKeys = localStorage.getItem(STORAGE_KEY);
        setKeysExist(!!storedKeys);
    }, []);

    const handleSaveKeys = async () => {
        if (!apiKey || !apiSecret || !password) {
            setErrorMessage('All fields are required.');
            setStatus('error');
            return;
        }

        setStatus('saving');
        setErrorMessage('');

        try {
            const encryptedPayload = await encryptKeys(apiKey, apiSecret, password);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(encryptedPayload));
            setStatus('success');
            setKeysExist(true);
            setApiKey('');
            setApiSecret('');
            setPassword('');
            setTimeout(() => setStatus('idle'), 2000);
        } catch (e) {
            console.error('Encryption failed:', e);
            setErrorMessage('Could not save keys. Please try again.');
            setStatus('error');
        }
    };

    const handleDeleteKeys = () => {
        localStorage.removeItem(STORAGE_KEY);
        setKeysExist(false);
        setStatus('idle');
        setErrorMessage('');
    };

    const SecurityWarning = () => (
         <div className="bg-red-900/30 border border-red-700 text-red-200 px-4 py-3 rounded-lg relative my-4" role="alert">
            <strong className="font-bold">Security Warning:</strong>
            <span className="block sm:inline ml-1">
                Storing API keys in your browser's local storage is risky. Anyone with access to your computer could potentially decrypt them. Use a dedicated, strong password and proceed at your own risk.
            </span>
        </div>
    );

    return (
        <div className="text-gray-300" data-testid="api-key-manager">
            <h3 className="text-lg font-bold text-white mb-4" data-testid="api-key-title">API Key Management</h3>
            
            <SecurityWarning />

            {keysExist ? (
                <div data-testid="api-keys-exist">
                    <p className="text-green-400 mb-4" data-testid="api-keys-stored-message">Encrypted API keys are currently stored in this browser.</p>
                    <div className="text-yellow-200 text-sm bg-yellow-900/40 p-3 rounded-md mb-4">
                        <strong>Note:</strong> If you are experiencing decryption errors after an application update, please delete and re-add your keys.
                    </div>
                    <button
                        onClick={handleDeleteKeys}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors"
                        data-testid="delete-keys-button"
                    >
                        Delete Stored Keys
                    </button>
                </div>
            ) : (
                <div className="space-y-4" data-testid="api-key-form">
                     <div>
                        <label htmlFor="apiKey" className="block text-sm font-medium">API Key</label>
                        <input
                            type="password"
                            id="apiKey"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            className="mt-1 block w-full bg-gray-900 border border-gray-700 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                            data-testid="api-key-input"
                        />
                    </div>
                    <div>
                        <label htmlFor="apiSecret" className="block text-sm font-medium">Secret Key</label>
                        <input
                            type="password"
                            id="apiSecret"
                            value={apiSecret}
                            onChange={(e) => setApiSecret(e.target.value)}
                            className="mt-1 block w-full bg-gray-900 border border-gray-700 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                            data-testid="api-secret-input"
                        />
                    </div>
                     <div>
                        <label htmlFor="password" className="block text-sm font-medium">Encryption Password</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1 block w-full bg-gray-900 border border-gray-700 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                            data-testid="password-input"
                        />
                        <p className="text-xs text-gray-500 mt-1">This password encrypts your keys. It is NOT stored.</p>
                    </div>
                    <button
                        onClick={handleSaveKeys}
                        disabled={status === 'saving'}
                        className="w-full bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold py-2 px-4 rounded transition-colors disabled:bg-yellow-800/50 disabled:cursor-not-allowed"
                        data-testid="save-keys-button"
                    >
                        {status === 'saving' ? 'Saving...' : 'Save and Encrypt Keys'}
                    </button>
                    {status === 'error' && <p className="text-red-400 text-sm mt-2" data-testid="api-key-error">{errorMessage}</p>}
                    {status === 'success' && <p className="text-green-400 text-sm mt-2" data-testid="api-key-success">Keys encrypted and saved successfully!</p>}
                </div>
            )}
        </div>
    );
};

export default ApiKeyManager;