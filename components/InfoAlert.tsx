import React from 'react';

const InfoAlert: React.FC = () => (
    <div className="bg-blue-900/30 border border-blue-700 text-blue-200 px-4 py-3 rounded-lg relative mb-6" role="alert">
        <strong className="font-bold">Please Note: </strong>
        <span className="block sm:inline">
            This dashboard identifies potential funding rate arbitrage opportunities by scanning all live futures pairs. The strategies shown are for manual execution. This list may differ from the curated pairs available in Binance's official, automated "Arbitrage Bot" product.
        </span>
    </div>
);

export default InfoAlert;
