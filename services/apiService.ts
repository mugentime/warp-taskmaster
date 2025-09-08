import type { ActiveBot, AccountStatusResponse } from '../types';

const API_BASE_URL = 'http://localhost:3001/api/v1';

const handleFetchError = (error: unknown): never => {
    console.error('API service error:', error);
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
         throw new Error('Could not connect to the backend server. Please ensure it is running.');
    }
    throw error;
}

export const getActiveBots = async (): Promise<ActiveBot[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/bots`);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch active bots. Status: ${response.status} - ${errorText}`);
        }
        return await response.json();
    } catch (error) {
        handleFetchError(error);
    }
};

type LaunchBotConfig = Omit<ActiveBot, 'startTime' | 'fundingRevenue' | 'status'>;

export const launchBot = async (botConfig: LaunchBotConfig, apiKey: string, apiSecret: string): Promise<ActiveBot | null> => {
    try {
        const response = await fetch(`${API_BASE_URL}/launch-bot`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ...botConfig, apiKey, apiSecret }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Backend error response:', errorData);
            
            // Extract detailed error information
            let errorMessage = errorData.message || 'Failed to launch bot';
            if (errorData.troubleshooting && errorData.troubleshooting.commonCauses) {
                errorMessage += '\n\nCommon causes:\n' + errorData.troubleshooting.commonCauses.map((cause: string, index: number) => `${index + 1}. ${cause}`).join('\n');
            }
            if (errorData.error) {
                errorMessage += `\n\nTechnical details: ${errorData.error}`;
            }
            
            throw new Error(errorMessage);
        }
        return await response.json();
    } catch (error) {
        console.error('Error launching bot:', error);
        
        // Show detailed error in alert
        const errorMessage = error instanceof Error ? error.message : String(error);
        alert(`Failed to launch bot:\n\n${errorMessage}`);
        return null;
    }
};

export const stopBot = async (botId: string, apiKey: string, apiSecret: string): Promise<boolean> => {
    try {
        const response = await fetch(`${API_BASE_URL}/stop-bot`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ botId, apiKey, apiSecret }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to stop bot');
        }
        return true;
    } catch (error) {
        console.error('Error stopping bot:', error);
        alert(`Failed to stop bot: ${error instanceof Error ? error.message : String(error)}`);
        return false;
    }
};

export const fetchAccountStatus = async (apiKey: string, apiSecret: string): Promise<AccountStatusResponse | null> => {
    try {
        const response = await fetch(`${API_BASE_URL}/account-status`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ apiKey, apiSecret }),
        });
        // We expect JSON response even for errors from our server
        return await response.json();
    } catch (error) {
        console.error('Network or parsing error fetching account status:', error);
        return { success: false, message: 'Could not connect to the backend server.' };
    }
};

export const testConnection = async (verificationCode: string = '1234'): Promise<AccountStatusResponse | null> => {
    try {
        const response = await fetch(`${API_BASE_URL}/test-connection`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ verificationCode }),
        });
        return await response.json();
    } catch (error) {
        console.error('Network or parsing error testing connection:', error);
        return { success: false, message: 'Could not connect to the backend server.' };
    }
};

