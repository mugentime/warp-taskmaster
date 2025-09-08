# Binance Futures Arbitrage Monitor

## 1. What is this app?

This is a web-based dashboard designed to help users identify, manage, and execute funding rate arbitrage strategies on the Binance Futures platform. It provides a real-time view of market opportunities and serves as a powerful foundation for developers to build their own semi-automated or fully-automated trading systems.

The application is architected with a clear separation between a React frontend (for user interaction) and a Node.js/Express backend (for secure API communication), ensuring that your sensitive API keys are never exposed in the browser.

## 2. How does the app work?

The application consists of two main parts that run simultaneously: a frontend and a backend.

#### Frontend (What you see in the browser)
- **Data Fetching:** It pulls live funding rate data for all USDT perpetual contracts directly from Binance's public API. This data is used to identify potential arbitrage opportunities.
- **User Interface:** It presents the best opportunities in two tables: one for high positive rates (strategies where you SHORT the perpetual contract) and one for high negative rates (strategies where you LONG the perpetual contract).
- **Bot Management:** It provides a user-friendly modal to configure and "launch" a new bot. When you launch a bot, the frontend sends the configuration details (e.g., symbol, investment amount, leverage) to your local backend server.
- **Secure Key Handling:** It allows you to store your Binance API keys securely in your browser's local storage. The keys are encrypted using the Web Crypto API with a password that you provide. This password is never stored. For any action that requires API keys (like launching a bot or checking your balance), the app will prompt you for this password to decrypt the keys just in time.

#### Backend (The local server running in your terminal)
- **Secure API Proxy:** The backend acts as a secure intermediary. It's the only part of the application that holds your API keys in memory (read from a `.env` file) to communicate with Binance's private endpoints.
- **Execution Engine:** It receives commands from the frontend, such as "launch bot" or "stop bot."
- **Trade Logic:** When it receives a "launch bot" command, it executes the two-legged arbitrage trade:
    1.  It buys the asset on the Spot market.
    2.  It simultaneously sells (shorts) the same amount of the asset on the Futures market.
- **State Management:** It keeps a simple in-memory list of all the "active bots" it has launched.

## 3. What is the objective of this app?

- **To Identify Opportunities:** The primary goal is to provide a clear, real-time dashboard that surfaces the most promising funding rate arbitrage opportunities on Binance Futures.
- **To Provide a Foundation:** This application is designed as a robust boilerplate or starting point. Developers can take this code, customize it, and build their own sophisticated, automated trading bots without starting from scratch.
- **To Demonstrate Secure Architecture:** It serves as a practical example of how to build a trading application securely, ensuring that sensitive API keys are handled on a server and not exposed client-side.

## 4. What specific dev tools are used?

-   **Frontend:**
    -   **React:** A JavaScript library for building user interfaces (loaded via CDN).
    -   **TypeScript:** Adds static typing to JavaScript for more robust code.
    -   **Tailwind CSS:** A utility-first CSS framework for rapid UI development (loaded via CDN).
    -   **Web Crypto API:** A browser-native API used for securely encrypting and decrypting API keys on the client-side.

-   **Backend:**
    -   **Node.js:** A JavaScript runtime for building the server.
    -   **Express.js:** A minimal and flexible Node.js web application framework.
    -   **@binance/connector:** The official Binance Node.js SDK for interacting with the Binance API.
    -   **dotenv:** A module to load environment variables from a `.env` file (used for API keys).
    -   **cors:** A Node.js package to enable Cross-Origin Resource Sharing, allowing the frontend and backend to communicate.

## 5. Troubleshooting Guide

#### Error: "Failed to fetch" or "Could not connect to the backend server."
-   **Cause:** The local backend server is not running. The frontend cannot connect to it.
-   **Solution:** 
    1. Open a new terminal window.
    2. Navigate to the `backend` directory: `cd backend`.
    3. Start the server: `npm start`.
    4. You should see `Backend server is running on http://localhost:3001`. Keep this terminal window open.

#### Error: "Decryption failed. Please check your password."
-   **Cause 1:** You entered the wrong password when prompted to authorize an action.
-   **Solution 1:** Double-check your password and try again.
-   **Cause 2:** The application code was updated, which can sometimes interfere with previously stored keys.
-   **Solution 2:** In the UI, go to **Settings -> Delete Stored Keys**. Then, add your API keys again with a strong password.

#### Error from Backend Terminal: "Failed to connect to Binance. Check API keys and permissions."
-   **Cause 1:** The API keys in your `backend/.env` file are incorrect or missing.
-   **Solution 1:** Open `backend/.env` and ensure your `BINANCE_API_KEY` and `BINANCE_API_SECRET` are copied correctly.
-   **Cause 2:** The API keys do not have the correct permissions enabled on the Binance website.
-   **Solution 2:** Log in to Binance, go to your API Management page, and ensure the keys have permissions for "Enable Spot & Margin Trading" and "Enable Futures." **Never enable withdrawals.**

#### Problem: The "Live Funding Rate" table is empty.
-   **Cause:** Your computer has lost its internet connection, or the Binance public API is temporarily down.
-   **Solution:** Check your internet connection. If it's working, wait a few minutes and refresh the page, as the Binance API might be experiencing temporary issues.