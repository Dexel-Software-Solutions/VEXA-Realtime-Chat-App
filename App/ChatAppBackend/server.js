/**
 * server.js
 * Entry point for the ChatApp Enterprise Backend API & Real-time WebSocket Server.
 */

require('dotenv').config();
const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Server } = require('socket.io');

const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const messageRoutes = require('./routes/messageRoutes');
const systemRoutes = require('./routes/systemRoutes');
const aiRoutes = require('./routes/aiRoutes');

const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { initSocket } = require('./socket/socketHandler');
const { startCleanupWorker } = require('./utils/cronCleanup');
const { swaggerUi, swaggerDocument } = require('./config/swagger');

const app = express();
const server = http.createServer(app);

// ----- Socket.io Setup -----
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});
global.io = io;
initSocket(io);

// ----- Start Cleanup Worker -----
startCleanupWorker();

// ----- Global Middleware -----
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ----- Interactive OpenAPI Docs Portal -----
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// ----- Serve Media Uploads -----
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ----- Health & Observability Routes -----
app.use('/api', systemRoutes);

// ----- API Feature Routes -----
app.use('/api/auth', authRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/ai', aiRoutes);

// ----- Health Check Home -----
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'ChatApp Enterprise Real-Time API & AI Portal is running.',
    documentation: '/api-docs',
    health: '/api/health',
  });
});

// ----- 404 & Error Handling -----
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Catch EADDRINUSE (Port already occupied) gracefully
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\n❌ Error: Port ${PORT} is already in use by another process.`);
    console.error(`👉 Run 'npx kill-port ${PORT}' in terminal to free up port ${PORT}.\n`);
    process.exit(1);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 ChatApp Enterprise API Server running on port ${PORT}`);
  console.log(`   Interactive Swagger Docs: http://localhost:${PORT}/api-docs`);
  console.log(`   Health & Metrics:        http://localhost:${PORT}/api/health`);
});
