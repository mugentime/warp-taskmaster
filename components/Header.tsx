
import React from 'react';

interface HeaderProps {
    onSettingsClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onSettingsClick }) => {
    const BinanceIcon = () => (
        <svg width="32" height="32" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M48 0L96 48L48 96L0 48L48 0Z" fill="#F0B90B"/>
            <path fillRule="evenodd" clipRule="evenodd" d="M24 48L36 36L48 48L36 60L24 48Z" fill="#1E2329"/>
            <path fillRule="evenodd" clipRule="evenodd" d="M48 48L60 36L72 48L60 60L48 48Z" fill="#1E2329"/>
            <path fillRule="evenodd" clipRule="evenodd" d="M36 24L48 36L60 24L48 12L36 24Z" fill="#1E2329"/>
            <path fillRule="evenodd" clipRule="evenodd" d="M36 72L48 60L60 72L48 84L36 72Z" fill="#1E2329"/>
        </svg>
    );

    const SettingsIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    );

    return (
        <header className="bg-gray-800 shadow-md p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
                <BinanceIcon />
                <h1 className="text-xl sm:text-2xl font-bold text-yellow-400">
                    Binance Futures Arbitrage Monitor
                </h1>
            </div>
            <div className="flex items-center space-x-4">
                 <button onClick={onSettingsClick} className="text-gray-400 hover:text-yellow-400 transition-colors" title="Settings">
                    <SettingsIcon />
                </button>
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" title="Live"></div>
            </div>
        </header>
    );
};

export default Header;