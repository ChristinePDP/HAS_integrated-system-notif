import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import notificationRoutes from './routers/notificationRoutes.js';

const app = express();

// =============================================================================
// MIDDLEWARE SETUP
// =============================================================================

// Enable CORS for cross-origin requests from other microservices
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*', // Configure in .env for production
    credentials: true,
  })
);

// Parse incoming JSON requests
app.use(express.json());

// Request logging middleware (simple)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// =============================================================================
// DATABASE CONNECTION
// =============================================================================

// Initialize MongoDB connection on startup
await connectDB();

// =============================================================================
// ROUTE SETUP
// =============================================================================

// Mount notification routes
app.use('/api', notificationRoutes);

// =============================================================================
// HEALTH CHECK ENDPOINT
// =============================================================================

/**
 * GET /
 * Root endpoint - useful for load balancers and health checks
 */
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'Notification System',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date(),
    endpoints: {
      health: '/api/health',
      notify: 'POST /api/notify (requires JWT)',
      logs: 'GET /api/notification-logs (requires JWT)',
    },
  });
});

// =============================================================================
// ERROR HANDLING - 404 NOT FOUND
// =============================================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    code: 'NOT_FOUND',
    path: req.originalUrl,
    availableEndpoints: {
      root: 'GET /',
      health: 'GET /api/health',
      notify: 'POST /api/notify',
      logs: 'GET /api/notification-logs',
    },
  });
});

// =============================================================================
// ERROR HANDLING - GLOBAL ERROR HANDLER
// =============================================================================

app.use((err, req, res, next) => {
  console.error('Global error handler:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    message,
    code: 'SERVER_ERROR',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

// =============================================================================
// SERVER STARTUP
// =============================================================================

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║     🏥 Notification System Microservice Started       ║
║                                                        ║
║     Server: http://localhost:${PORT}                      
║     Environment: ${process.env.NODE_ENV || 'development'}              
║                                                        ║
╚════════════════════════════════════════════════════════╝
  `);
});

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================

/**
 * Handles graceful shutdown on SIGTERM and SIGINT signals
 */
process.on('SIGTERM', () => {
  console.log('\n📋 SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('✓ HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n📋 SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('✓ HTTP server closed');
    process.exit(0);
  });
});

export default app;
