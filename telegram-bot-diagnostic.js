#!/usr/bin/env node
/**
 * Telegram Bot Diagnostic Tool
 * Tests and fixes Telegram bot connectivity issues
 */

import axios from 'axios';
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, 'backend', '.env') });

class TelegramBotDiagnostic {
    constructor() {
        this.botToken = process.env.TELEGRAM_BOT_TOKEN;
        this.chatId = process.env.TELEGRAM_CHAT_ID;
        this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;
    }
    
    async runFullDiagnostic() {
        console.log('🔍 TELEGRAM BOT DIAGNOSTIC STARTING...');
        console.log('=' * 50);
        
        // Step 1: Check configuration
        console.log('\n📋 STEP 1: Configuration Check');
        console.log('-' * 30);
        if (!this.botToken || this.botToken === 'your_telegram_bot_token_here') {
            console.log('❌ Bot token not configured or using placeholder');
            return false;
        }
        if (!this.chatId || this.chatId === 'your_telegram_chat_id_here') {
            console.log('❌ Chat ID not configured or using placeholder');
            return false;
        }
        
        console.log('✅ Bot Token: Found');
        console.log(`✅ Chat ID: ${this.chatId}`);
        console.log(`✅ Bot Token (first 10 chars): ${this.botToken.substring(0, 10)}...`);
        
        // Step 2: Test bot info
        console.log('\n🤖 STEP 2: Bot Information');
        console.log('-' * 30);
        const botInfo = await this.getBotInfo();
        if (!botInfo.success) {
            console.log('❌ Cannot get bot info:', botInfo.error);
            return false;
        }
        
        console.log(`✅ Bot Name: ${botInfo.data.first_name}`);
        console.log(`✅ Bot Username: @${botInfo.data.username}`);
        console.log(`✅ Bot ID: ${botInfo.data.id}`);
        console.log(`✅ Bot Can Join Groups: ${botInfo.data.can_join_groups}`);
        console.log(`✅ Bot Can Read Messages: ${botInfo.data.can_read_all_group_messages}`);
        
        // Step 3: Test webhook status
        console.log('\n🔗 STEP 3: Webhook Status');
        console.log('-' * 30);
        const webhookInfo = await this.getWebhookInfo();
        if (webhookInfo.success) {
            if (webhookInfo.data.url) {
                console.log(`⚠️ Webhook is set: ${webhookInfo.data.url}`);
                console.log('   This might prevent polling. Consider removing webhook.');
            } else {
                console.log('✅ No webhook set - good for polling');
            }
        }
        
        // Step 4: Test message sending
        console.log('\n💬 STEP 4: Message Sending Test');
        console.log('-' * 30);
        const testMessage = await this.sendTestMessage();
        if (!testMessage.success) {
            console.log(`❌ Failed to send test message: ${testMessage.error}`);
            
            // Try to analyze the error
            if (testMessage.error.includes('chat not found')) {
                console.log('💡 SOLUTION: The chat ID might be incorrect.');
                console.log('   Try getting your chat ID again.');
            } else if (testMessage.error.includes('bot was blocked')) {
                console.log('💡 SOLUTION: The bot was blocked by the user.');
                console.log('   Unblock the bot and try again.');
            } else if (testMessage.error.includes('Unauthorized')) {
                console.log('💡 SOLUTION: Bot token is invalid or expired.');
                console.log('   Check with @BotFather.');
            }
            return false;
        }
        
        console.log('✅ Test message sent successfully!');
        console.log(`   Message ID: ${testMessage.data.message_id}`);
        
        // Step 5: Get updates
        console.log('\n📥 STEP 5: Recent Updates Check');
        console.log('-' * 30);
        const updates = await this.getUpdates();
        if (updates.success) {
            console.log(`✅ Retrieved ${updates.data.length} recent updates`);
            if (updates.data.length > 0) {
                const lastUpdate = updates.data[updates.data.length - 1];
                console.log(`   Last update ID: ${lastUpdate.update_id}`);
                console.log(`   Last message from: ${lastUpdate.message?.from?.first_name || 'N/A'}`);
            }
        } else {
            console.log(`⚠️ Could not get updates: ${updates.error}`);
        }
        
        console.log('\n✅ DIAGNOSTIC COMPLETE - BOT IS WORKING!');
        return true;
    }
    
    async getBotInfo() {
        try {
            const response = await axios.get(`${this.baseUrl}/getMe`, { timeout: 10000 });
            return { success: true, data: response.data.result };
        } catch (error) {
            return { 
                success: false, 
                error: error.response?.data?.description || error.message 
            };
        }
    }
    
    async getWebhookInfo() {
        try {
            const response = await axios.get(`${this.baseUrl}/getWebhookInfo`, { timeout: 10000 });
            return { success: true, data: response.data.result };
        } catch (error) {
            return { 
                success: false, 
                error: error.response?.data?.description || error.message 
            };
        }
    }
    
    async sendTestMessage() {
        try {
            const testMessage = `🧪 <b>TELEGRAM BOT TEST</b>\n\n` +
                              `✅ Bot is working correctly!\n` +
                              `🤖 Bot ID: ${this.botToken.split(':')[0]}\n` +
                              `💬 Chat ID: ${this.chatId}\n` +
                              `⏰ Test Time: ${new Date().toLocaleString()}\n\n` +
                              `🎯 Your bot is ready to send trading reports!`;
            
            const response = await axios.post(`${this.baseUrl}/sendMessage`, {
                chat_id: this.chatId,
                text: testMessage,
                parse_mode: 'HTML'
            }, { timeout: 10000 });
            
            return { success: true, data: response.data.result };
        } catch (error) {
            return { 
                success: false, 
                error: error.response?.data?.description || error.message 
            };
        }
    }
    
    async getUpdates() {
        try {
            const response = await axios.get(`${this.baseUrl}/getUpdates`, { 
                params: { limit: 5 },
                timeout: 10000 
            });
            return { success: true, data: response.data.result };
        } catch (error) {
            return { 
                success: false, 
                error: error.response?.data?.description || error.message 
            };
        }
    }
    
    async fixWebhookIssue() {
        console.log('\n🔧 ATTEMPTING TO FIX WEBHOOK ISSUE...');
        try {
            // Delete webhook
            const response = await axios.post(`${this.baseUrl}/deleteWebhook`);
            if (response.data.ok) {
                console.log('✅ Webhook deleted successfully');
                return true;
            } else {
                console.log('❌ Failed to delete webhook');
                return false;
            }
        } catch (error) {
            console.log(`❌ Error deleting webhook: ${error.message}`);
            return false;
        }
    }
    
    async getChatId() {
        console.log('\n🔍 GETTING CHAT ID...');
        console.log('Send a message to your bot now, then press Enter...');
        
        // Wait for user input
        process.stdin.setRawMode(true);
        return new Promise((resolve) => {
            process.stdin.once('data', async () => {
                process.stdin.setRawMode(false);
                
                try {
                    const response = await axios.get(`${this.baseUrl}/getUpdates`);
                    const updates = response.data.result;
                    
                    if (updates.length === 0) {
                        console.log('❌ No messages found. Make sure you sent a message to the bot.');
                        resolve(null);
                        return;
                    }
                    
                    const lastMessage = updates[updates.length - 1].message;
                    const chatId = lastMessage.chat.id;
                    
                    console.log(`✅ Found Chat ID: ${chatId}`);
                    console.log(`   From: ${lastMessage.from.first_name} (@${lastMessage.from.username || 'no username'})`);
                    console.log(`   Message: ${lastMessage.text}`);
                    
                    resolve(chatId);
                } catch (error) {
                    console.log(`❌ Error getting chat ID: ${error.message}`);
                    resolve(null);
                }
            });
        });
    }
}

// CLI execution
async function main() {
    const diagnostic = new TelegramBotDiagnostic();
    
    if (process.argv.includes('--fix-webhook')) {
        await diagnostic.fixWebhookIssue();
        return;
    }
    
    if (process.argv.includes('--get-chat-id')) {
        await diagnostic.getChatId();
        return;
    }
    
    console.log('🤖 TELEGRAM BOT DIAGNOSTIC TOOL');
    console.log('===============================');
    
    try {
        const result = await diagnostic.runFullDiagnostic();
        
        if (!result) {
            console.log('\n🔧 POSSIBLE FIXES:');
            console.log('==================');
            console.log('1. Run: node telegram-bot-diagnostic.js --fix-webhook');
            console.log('2. Run: node telegram-bot-diagnostic.js --get-chat-id');
            console.log('3. Check your .env file in the backend directory');
            console.log('4. Make sure you started a chat with the bot');
            console.log('5. Check with @BotFather if the bot token is valid');
        }
        
        process.exit(result ? 0 : 1);
    } catch (error) {
        console.error('❌ Diagnostic failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export default TelegramBotDiagnostic;
