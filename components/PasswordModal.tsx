
import React, { useState } from 'react';

interface PasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (password: string) => void;
}

const PasswordModal: React.FC<PasswordModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const [password, setPassword] = useState('');

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (password) {
            onSubmit(password);
            setPassword('');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-yellow-400 mb-2">Enter Password</h2>
                <p className="text-gray-400 mb-4">
                    Please enter the password used to encrypt your API keys to authorize this action.
                </p>
                
                <div>
                    <label htmlFor="decrypt-password" className="block text-sm font-medium text-gray-300">Encryption Password</label>
                    <input
                        type="password"
                        id="decrypt-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                        className="mt-1 block w-full bg-gray-900 border border-gray-700 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                        autoFocus
                    />
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 focus:outline-none"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!password}
                        className="px-4 py-2 text-sm font-medium text-gray-900 bg-yellow-500 rounded-md hover:bg-yellow-600 focus:outline-none disabled:bg-yellow-800/50 disabled:cursor-not-allowed"
                    >
                        Authorize
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PasswordModal;