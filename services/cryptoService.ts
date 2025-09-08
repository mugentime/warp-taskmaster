
import type { EncryptedPayload } from '../types';

const ALGO = 'AES-GCM';
const KEY_DERIVATION_ALGO = 'PBKDF2';
const HASH = 'SHA-256';
const ITERATIONS = 100000;

// Utility to convert ArrayBuffer to Base64 string
const bufferToBase64 = (buffer: ArrayBuffer): string => {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
};

// Utility to convert Base64 string to ArrayBuffer
const base64ToBuffer = (base64: string): ArrayBuffer => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
};

// Derives a cryptographic key from a password and salt
const deriveKey = async (password: string, salt: Uint8Array): Promise<CryptoKey> => {
    const enc = new TextEncoder();
    const passwordKey = await crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        { name: KEY_DERIVATION_ALGO },
        false,
        ['deriveKey']
    );

    return await crypto.subtle.deriveKey(
        {
            name: KEY_DERIVATION_ALGO,
            salt: salt,
            iterations: ITERATIONS,
            hash: HASH,
        },
        passwordKey,
        { name: ALGO, length: 256 },
        true,
        ['encrypt', 'decrypt']
    );
};

// Encrypts API keys using a password
// FIX: This function was truncated. It has been completed to properly encrypt data and return a value, resolving the type error.
export const encryptKeys = async (apiKey: string, apiSecret: string, password: string): Promise<EncryptedPayload> => {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(password, salt);

    const dataToEncrypt = JSON.stringify({ apiKey, apiSecret });
    const enc = new TextEncoder();
    const encryptedData = await crypto.subtle.encrypt(
        { name: ALGO, iv: iv },
        key,
        enc.encode(dataToEncrypt)
    );

    return {
        salt: bufferToBase64(salt),
        iv: bufferToBase64(iv),
        data: bufferToBase64(encryptedData),
    };
};

// Decrypts API keys using a password
// FIX: Added the missing `decryptKeys` function to resolve the import error in `Dashboard.tsx`.
export const decryptKeys = async (payload: EncryptedPayload, password: string): Promise<{ apiKey: string; apiSecret: string }> => {
    const salt = base64ToBuffer(payload.salt);
    const iv = base64ToBuffer(payload.iv);
    const encryptedData = base64ToBuffer(payload.data);
    // FIX: Convert salt from ArrayBuffer to Uint8Array, as required by the deriveKey function.
    const key = await deriveKey(password, new Uint8Array(salt));

    const decryptedData = await crypto.subtle.decrypt(
        { name: ALGO, iv: iv },
        key,
        encryptedData
    );

    const dec = new TextDecoder();
    const decryptedString = dec.decode(decryptedData);
    return JSON.parse(decryptedString);
};