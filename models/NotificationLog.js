import mongoose from 'mongoose';

/**
 * NotificationLog Schema
 * Stores a log of all notification attempts (sent, failed, or duplicate)
 * for audit and duplicate detection purposes.
 */
const notificationLogSchema = new mongoose.Schema({
  senderSystem: {
    type: String,
    default: 'Unknown System',
    description: 'The microservice or system that initiated the notification (e.g., "Queue", "Appointment", "Payment")',
  },
  senderEmail: {
    type: String,
    default: null,
    description: 'Email address of the person/system that sent the notification (extracted from JWT token)',
  },
  recipientEmail: {
    type: String,
    required: true,
    lowercase: true,
    description: 'Email address of the notification recipient',
  },
  subject: {
    type: String,
    required: true,
    description: 'Email subject line',
  },
  message: {
    type: String,
    required: true,
    description: 'Email body content',
  },
  status: {
    type: String,
    enum: ['Sent', 'Failed', 'Duplicate'],
    required: true,
    description: 'Status of the notification (Sent, Failed, or Duplicate)',
  },
  errorDetails: {
    type: String,
    default: null,
    description: 'Error message if status is "Failed"',
  },
  createdAt: {
    type: Date,
    default: Date.now,
    description: 'Timestamp when the notification was processed',
  },
});

// Create an index on recipientEmail and createdAt for efficient duplicate checking
notificationLogSchema.index({ recipientEmail: 1, createdAt: -1 });

export default mongoose.model('NotificationLog', notificationLogSchema);
