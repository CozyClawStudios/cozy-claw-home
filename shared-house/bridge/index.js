/**
 * Bridge Module - Connect UI to Main Agent
 * 
 * Exports:
 * - ClawBotBridge: WebSocket bridge for server
 * - AgentAdapter: Adapter for main agent to connect
 * - MessageQueue: File-based message queue
 * - FileAdapter: Simple file-based adapter
 */

const ClawBotBridge = require('./clawbot-bridge');
const { AgentAdapter, FileAdapter } = require('./agent-adapter');
const MessageQueue = require('./message-queue');

module.exports = {
    ClawBotBridge,
    AgentAdapter,
    FileAdapter,
    MessageQueue
};
