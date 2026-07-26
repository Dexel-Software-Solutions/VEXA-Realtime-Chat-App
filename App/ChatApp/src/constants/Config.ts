/**
 * Config.ts
 * Application-wide configuration values for REST API & WebSockets.
 */

const LOCAL_IP = '192.168.43.60';
const PORT = 5000;

export const SERVER_HOST = `http://${LOCAL_IP}:${PORT}`;
export const API_BASE_URL = `${SERVER_HOST}/api`;
export const SOCKET_URL = SERVER_HOST;

export const APP_NAME = 'ChatApp';
export const REQUEST_TIMEOUT_MS = 15000;
