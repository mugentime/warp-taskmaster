#!/usr/bin/env node
/**
 * DASHBOARD UNIFICADO DE CONTROL
 * Sistema centralizado para monitorear todos los componentes
 * - Gestión de múltiples procesos
 * - Dashboard visual en tiempo real
 * - Control de sistemas automático
 * - Reportes consolidados
 */

import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import { spawn } from 'child_process';

dotenv.config({ path: ['.env.local', '.env'] });

const API_KEY = process.env.BINANCE_API_KEY;
const API_SECRET = process.env.BINANCE_API_SECRET;
const BASE_URL = 'https://api.binance.com';
const FUTURES_URL = 'https://fapi.binance.com';

// Estado global del dashboard
class DashboardState {
    constructor() {
        this.systems = {
            backend: { status: 'Stopped', pid: null, uptime: 0, lastCheck: null },
            rebalancer: { status: 'Unknown', opportunities: 0, lastAction: null },
            optimized: { status: 'Stopped', pid: null, reports: 0 },
            websocket: { status: 'Stopped', pid: null, connections: 0 },
            monitor: { status: 'Stopped', pid: null, reports: 0 }
        };
        
        this.performance = {
            totalBalance: 0,
            totalPNL: 0,
            dailyPNL: 0,
            fundingEarned: 0,
            activeTrades: 0,
            successRate: 0
        };
        
        this.alerts = [];
        this.logs = [];
        this.startTime = Date.now();
    }
    
    updateSystem(systemName, data) {
        if (this.systems[systemName]) {
            this.systems[systemName] = {
                ...this.systems[systemName],
                ...data,
                lastCheck: new Date()
            };
            
            this.addLog(`${systemName.toUpperCase()}`, `Estado actualizado: ${data.status || 'N/A'}`);
        }
    }
    
    addAlert(system, message, level = 'info') {
        const alert = {
            id: Date.now(),
            system,
            message,
            level,
            timestamp: new Date(),
            read: false
        };
        
        this.alerts.unshift(alert);
        
        // Mantener solo últimas 100 alertas
        if (this.alerts.length > 100) {
            this.alerts = this.alerts.slice(0, 100);
        }
        
        // Log crítico inmediato
        if (level === 'critical') {
            console.log(`🚨 CRÍTICO [${system}]: ${message}`);
        }
        
        this.addLog(system, message, level);
    }
    
    addLog(source, message, level = 'info') {
        const logEntry = {
            timestamp: new Date(),
            source,
            message,
            level
        };
        
        this.logs.unshift(logEntry);
        
        // Mantener solo últimos 500 logs
        if (this.logs.length > 500) {
            this.logs = this.logs.slice(0, 500);
        }
    }
}

const dashboard = new DashboardState();

function getBinanceTimestamp() {
    return Date.now() - 5000;
}

function createSignature(queryString, secret) {
    return crypto.createHmac('sha256', secret).update(queryString).digest('hex');
}

// Verificar estado del backend
async function checkBackendStatus() {
    try {
        const response = await axios.get('http://localhost:3001/api/v1/health', { timeout: 3000 });
        dashboard.updateSystem('backend', { status: 'Running', health: response.data });
        return true;
    } catch (error) {
        dashboard.updateSystem('backend', { status: 'Stopped', error: error.message });
        return false;
    }
}

// Verificar estado del rebalancer
async function checkRebalancerStatus() {
    try {
        const response = await axios.get('http://localhost:3001/api/v1/rebalancer/status', { timeout: 3000 });
        
        dashboard.updateSystem('rebalancer', {
            status: response.data.status,
            opportunities: response.data.opportunitiesCount,
            lastAction: response.data.lastAction
        });
        
        return response.data;
    } catch (error) {
        dashboard.updateSystem('rebalancer', { status: 'Disconnected', error: error.message });
        return null;
    }
}

// Obtener balance actualizado
async function getCurrentBalance() {
    try {
        // FUTURES
        const timestamp = getBinanceTimestamp();
        const queryString = `timestamp=${timestamp}`;
        const signature = createSignature(queryString, API_SECRET);
        
        const futuresResponse = await axios.get(`${FUTURES_URL}/fapi/v2/account`, {
            headers: { 'X-MBX-APIKEY': API_KEY },
            params: { timestamp, signature },
            timeout: 10000
        });
        
        const futuresBalance = parseFloat(futuresResponse.data.totalWalletBalance);
        const unrealizedPNL = parseFloat(futuresResponse.data.totalUnrealizedProfit);
        
        // SPOT (simplificado)
        const spotTimestamp = getBinanceTimestamp();
        const spotQueryString = `omitZeroBalances=true&timestamp=${spotTimestamp}`;
        const spotSignature = createSignature(spotQueryString, API_SECRET);
        
        const spotResponse = await axios.get(`${BASE_URL}/api/v3/account`, {
            headers: { 'X-MBX-APIKEY': API_KEY },
            params: { omitZeroBalances: 'true', timestamp: spotTimestamp, signature: spotSignature },
            timeout: 10000
        });
        
        const spotUSDT = spotResponse.data.balances
            .filter(b => b.asset === 'USDT')
            .reduce((total, b) => total + parseFloat(b.free) + parseFloat(b.locked), 0);
        
        const totalBalance = spotUSDT + futuresBalance;
        
        // Actualizar performance
        dashboard.performance.totalBalance = totalBalance;
        dashboard.performance.totalPNL = unrealizedPNL;
        
        return {
            spot: spotUSDT,
            futures: futuresBalance,
            total: totalBalance,
            unrealizedPNL
        };
        
    } catch (error) {
        dashboard.addAlert('BALANCE', 'Error obteniendo balance', 'warning');
        return null;
    }
}

// Obtener posiciones activas
async function getActivePositions() {
    try {
        const timestamp = getBinanceTimestamp();
        const queryString = `timestamp=${timestamp}`;
        const signature = createSignature(queryString, API_SECRET);
        
        const response = await axios.get(`${FUTURES_URL}/fapi/v2/positionRisk`, {
            headers: { 'X-MBX-APIKEY': API_KEY },
            params: { timestamp, signature },
            timeout: 10000
        });
        
        const activePositions = response.data.filter(pos => parseFloat(pos.positionAmt) !== 0);
        dashboard.performance.activeTrades = activePositions.length;
        
        return activePositions;
        
    } catch (error) {
        dashboard.addAlert('POSITIONS', 'Error obteniendo posiciones', 'warning');
        return [];
    }
}

// Iniciar sistema específico
async function startSystem(systemName) {
    const scripts = {
        backend: 'server.js',
        optimized: 'optimized-balance-system.js',
        websocket: 'websocket-realtime-system.js',
        monitor: 'bot-monitor-hourly.js'
    };
    
    const scriptPath = scripts[systemName];
    if (!scriptPath) {
        dashboard.addAlert('SYSTEM', `Sistema ${systemName} no reconocido`, 'error');
        return false;
    }
    
    try {
        console.log(`🚀 Iniciando ${systemName}...`);
        
        const child = spawn('node', [scriptPath], {
            cwd: process.cwd(),
            detached: false,
            stdio: ['ignore', 'pipe', 'pipe']
        });
        
        dashboard.updateSystem(systemName, {
            status: 'Starting',
            pid: child.pid
        });
        
        child.stdout.on('data', (data) => {
            const output = data.toString().trim();
            dashboard.addLog(systemName.toUpperCase(), output);
        });
        
        child.stderr.on('data', (data) => {
            const error = data.toString().trim();
            dashboard.addLog(systemName.toUpperCase(), error, 'error');
        });
        
        child.on('close', (code) => {
            dashboard.updateSystem(systemName, {
                status: code === 0 ? 'Stopped' : 'Failed',
                pid: null
            });
            dashboard.addAlert(systemName.toUpperCase(), `Proceso terminado con código ${code}`, code === 0 ? 'info' : 'warning');
        });
        
        setTimeout(() => {
            dashboard.updateSystem(systemName, { status: 'Running' });
        }, 2000);
        
        return true;
        
    } catch (error) {
        dashboard.addAlert(systemName.toUpperCase(), `Error iniciando: ${error.message}`, 'error');
        return false;
    }
}

// Dashboard visual
function displayDashboard() {
    console.clear();
    
    const uptime = Math.floor((Date.now() - dashboard.startTime) / 1000);
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = uptime % 60;
    
    console.log('╔══════════════════════════════════════════════════════════════════════════╗');
    console.log('║                          🚀 TRADING SYSTEM DASHBOARD                      ║');
    console.log('╠══════════════════════════════════════════════════════════════════════════╣');
    console.log(`║  ⏰ Uptime: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}                    💰 Balance Total: ${dashboard.performance.totalBalance.toFixed(6)} USDT       ║`);
    console.log(`║  📈 PNL: ${dashboard.performance.totalPNL.toFixed(6)} USDT              🎯 Trades Activos: ${dashboard.performance.activeTrades}                    ║`);
    console.log('╚══════════════════════════════════════════════════════════════════════════╝');
    console.log('');
    
    // Estado de sistemas
    console.log('┌─ ESTADO DE SISTEMAS ─────────────────────────────────────────────────────┐');
    Object.entries(dashboard.systems).forEach(([name, system]) => {
        const statusColor = {
            'Running': '🟢',
            'Starting': '🟡',
            'Stopped': '🔴',
            'Failed': '🔴',
            'Unknown': '⚪',
            'Disconnected': '🔴'
        };
        
        const icon = statusColor[system.status] || '⚪';
        const lastCheck = system.lastCheck ? system.lastCheck.toLocaleTimeString() : 'Never';
        
        console.log(`│ ${icon} ${name.toUpperCase().padEnd(12)} │ ${system.status.padEnd(12)} │ PID: ${(system.pid || 'N/A').toString().padEnd(8)} │ ${lastCheck} │`);
    });
    console.log('└───────────────────────────────────────────────────────────────────────────┘');
    console.log('');
    
    // Alertas recientes
    const recentAlerts = dashboard.alerts.slice(0, 5);
    if (recentAlerts.length > 0) {
        console.log('┌─ ALERTAS RECIENTES ──────────────────────────────────────────────────────┐');
        recentAlerts.forEach(alert => {
            const levelIcon = {
                'critical': '🚨',
                'warning': '⚠️',
                'error': '❌',
                'info': 'ℹ️'
            };
            
            const icon = levelIcon[alert.level] || 'ℹ️';
            const time = alert.timestamp.toLocaleTimeString();
            const system = alert.system.padEnd(10);
            const message = alert.message.substring(0, 40);
            
            console.log(`│ ${icon} [${time}] ${system} │ ${message.padEnd(40)} │`);
        });
        console.log('└───────────────────────────────────────────────────────────────────────────┘');
        console.log('');
    }
    
    // Performance metrics
    if (dashboard.performance.totalBalance > 0) {
        console.log('┌─ PERFORMANCE METRICS ────────────────────────────────────────────────────┐');
        console.log(`│ 💰 Balance Total:     ${dashboard.performance.totalBalance.toFixed(6)} USDT                           │`);
        console.log(`│ 📈 PNL No Realizado:  ${dashboard.performance.totalPNL.toFixed(6)} USDT                           │`);
        console.log(`│ 🎯 Trades Activos:    ${dashboard.performance.activeTrades}                                        │`);
        console.log(`│ ⚖️ Oportunidades:     ${dashboard.systems.rebalancer.opportunities || 0}                                        │`);
        console.log('└───────────────────────────────────────────────────────────────────────────┘');
        console.log('');
    }
    
    // Comandos disponibles
    console.log('┌─ COMANDOS DISPONIBLES ───────────────────────────────────────────────────┐');
    console.log('│ [1] Iniciar Backend        [2] Iniciar Rebalancer      [3] Sistema Optimizado │');
    console.log('│ [4] WebSocket Real-time    [5] Monitor Hourly          [6] Refresh Status   │');
    console.log('│ [Q] Salir                  [L] Ver Logs                [A] Ver Alertas      │');
    console.log('└───────────────────────────────────────────────────────────────────────────┘');
}

// Procesar comandos de usuario
function processCommand(command) {
    switch (command.toLowerCase()) {
        case '1':
            startSystem('backend');
            break;
        case '2':
            // El rebalancer se inicia con el backend
            dashboard.addAlert('SYSTEM', 'Rebalancer se activa automáticamente con el backend', 'info');
            break;
        case '3':
            startSystem('optimized');
            break;
        case '4':
            startSystem('websocket');
            break;
        case '5':
            startSystem('monitor');
            break;
        case '6':
            refreshAllStatus();
            break;
        case 'l':
            showLogs();
            break;
        case 'a':
            showAlerts();
            break;
        case 'q':
            console.log('👋 Cerrando Dashboard...');
            process.exit(0);
            break;
        default:
            dashboard.addAlert('SYSTEM', `Comando '${command}' no reconocido`, 'warning');
    }
}

// Actualizar estado de todos los sistemas
async function refreshAllStatus() {
    console.log('🔄 Actualizando estado de sistemas...');
    
    await checkBackendStatus();
    await checkRebalancerStatus();
    await getCurrentBalance();
    await getActivePositions();
    
    dashboard.addAlert('SYSTEM', 'Estado de sistemas actualizado', 'info');
}

// Mostrar logs recientes
function showLogs() {
    console.clear();
    console.log('📋 LOGS RECIENTES (últimos 20):');
    console.log('════════════════════════════════════════════════════════════════════');
    
    dashboard.logs.slice(0, 20).forEach(log => {
        const time = log.timestamp.toLocaleTimeString();
        const levelIcon = {
            'error': '❌',
            'warning': '⚠️',
            'info': 'ℹ️'
        };
        
        const icon = levelIcon[log.level] || 'ℹ️';
        console.log(`${icon} [${time}] [${log.source}] ${log.message}`);
    });
    
    console.log('\nPresiona Enter para volver al dashboard...');
}

// Mostrar alertas
function showAlerts() {
    console.clear();
    console.log('🚨 ALERTAS DEL SISTEMA:');
    console.log('════════════════════════════════════════════════════════════════════');
    
    dashboard.alerts.slice(0, 15).forEach(alert => {
        const time = alert.timestamp.toLocaleString();
        const levelIcon = {
            'critical': '🚨',
            'warning': '⚠️',
            'error': '❌',
            'info': 'ℹ️'
        };
        
        const icon = levelIcon[alert.level] || 'ℹ️';
        const readStatus = alert.read ? '' : '🔹';
        
        console.log(`${icon}${readStatus} [${time}] [${alert.system}] ${alert.message}`);
    });
    
    console.log('\nPresiona Enter para volver al dashboard...');
}

// Sistema principal
async function startDashboard() {
    console.log('🚀 INICIANDO DASHBOARD UNIFICADO...');
    
    // Verificación inicial
    await refreshAllStatus();
    
    // Actualización automática cada 30 segundos
    setInterval(async () => {
        await checkBackendStatus();
        await checkRebalancerStatus();
        
        // Actualizar balance cada 2 minutos
        if (Date.now() % 120000 < 30000) {
            await getCurrentBalance();
            await getActivePositions();
        }
    }, 30000);
    
    // Dashboard visual cada 5 segundos
    setInterval(displayDashboard, 5000);
    
    // Mostrar dashboard inicial
    displayDashboard();
    
    // Configurar input de usuario
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    
    let inputBuffer = '';
    
    process.stdin.on('data', (key) => {
        if (key === '\u0003') { // Ctrl+C
            process.exit(0);
        } else if (key === '\r' || key === '\n') { // Enter
            if (inputBuffer.trim()) {
                processCommand(inputBuffer.trim());
                inputBuffer = '';
            }
        } else if (key === '\u007f' || key === '\b') { // Backspace
            inputBuffer = inputBuffer.slice(0, -1);
        } else if (key.length === 1 && key >= ' ') { // Printable characters
            inputBuffer += key;
        }
    });
}

// Manejo de cierre
process.on('SIGINT', () => {
    console.log('\n👋 Dashboard cerrando...');
    process.exit(0);
});

// Iniciar dashboard
startDashboard().catch(console.error);
