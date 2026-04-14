import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { processNotification, getNotificationLogs } from '../controllers/notificationController.js';

/**
 * Notification Routes
 * Defines all API endpoints for the notification microservice
 */
const router = express.Router();

/**
 * POST /api/notify
 * Process and send a notification
 * 
 * Request body:
 * {
 *   "senderSystem": "Queue|Appointment|Payment|etc",
 *   "recipientEmail": "user@example.com",
 *   "subject": "Notification Subject",
 *   "message": "Notification body content"
 * }
 * 
 * Requires: Valid JWT token in Authorization header (Bearer <token>)
 */
router.post('/notify', authMiddleware, processNotification);

/**
 * GET /api/notification-logs
 * Retrieve notification logs (for debugging and monitoring)
 * 
 * Query parameters:
 * - page: Page number for pagination (default: 1)
 * - limit: Number of records per page (default: 20)
 * - status: Filter by status (Sent|Failed|Duplicate)
 * - recipientEmail: Filter by recipient email
 * 
 * Requires: Valid JWT token in Authorization header (Bearer <token>)
 */
router.get('/notification-logs', authMiddleware, getNotificationLogs);

/**
 * Health Check Endpoint
 * Returns service status without requiring authentication
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Notification service is running',
    timestamp: new Date(),
  });
});

export default router;
