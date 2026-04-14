import NotificationLog from '../models/NotificationLog.js';
import { sendEmail } from '../config/mailer.js';

/**
 * Process Notification Controller
 * 
 * Handles incoming notification requests from other microservices.
 * Implements duplicate detection, email sending, and database logging.
 * 
 * Request body format:
 * {
 *   "senderSystem": "string",
 *   "recipientEmail": "string",
 *   "subject": "string",
 *   "message": "string"
 * }
 */
export const processNotification = async (req, res) => {
  try {
    // Step 1: Extract and validate request body
    const { senderSystem, recipientEmail, subject, message } = req.body;

    // Validate all required fields exist
    if (!senderSystem || !recipientEmail || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        code: 'MISSING_FIELDS',
        required: ['senderSystem', 'recipientEmail', 'subject', 'message'],
        received: { senderSystem, recipientEmail, subject, message },
      });
    }

    // Additional validation: check if email is valid format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
        code: 'INVALID_EMAIL',
        recipientEmail,
      });
    }

    // Step 2: Duplicate Check
    // Query for identical notifications sent within the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const duplicateRecord = await NotificationLog.findOne({
      recipientEmail: recipientEmail.toLowerCase(),
      message,
      status: { $in: ['Sent', 'Duplicate'] }, // Check only successful sends
      createdAt: { $gte: fiveMinutesAgo },
    });

    if (duplicateRecord) {
      // Log as duplicate
      await NotificationLog.create({
        senderSystem,
        recipientEmail: recipientEmail.toLowerCase(),
        subject,
        message,
        status: 'Duplicate',
      });

      console.log(
        `⚠ Duplicate notification detected for ${recipientEmail}. Original sent at ${duplicateRecord.createdAt}`
      );

      return res.status(409).json({
        success: false,
        message: 'Duplicate notification. This exact message was sent to this recipient within the last 5 minutes.',
        code: 'DUPLICATE_NOTIFICATION',
        originalNotificationTime: duplicateRecord.createdAt,
        recipientEmail,
      });
    }

    // Step 3: Send email
    let emailSent = false;
    let sendEmailError = null;

    try {
      await sendEmail(recipientEmail, subject, message);
      emailSent = true;
    } catch (error) {
      sendEmailError = error.message;
      console.error('Email sending failed:', sendEmailError);
    }

    // Step 4: Save notification log to MongoDB
    const notificationLog = await NotificationLog.create({
      senderSystem,
      recipientEmail: recipientEmail.toLowerCase(),
      subject,
      message,
      status: emailSent ? 'Sent' : 'Failed',
      errorDetails: sendEmailError,
    });

    // If email failed, return error response
    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send notification email',
        code: 'EMAIL_SEND_FAILED',
        details: sendEmailError,
        logId: notificationLog._id,
      });
    }

    // Step 5: Mock Legacy System Update
    // TODO: Trigger Legacy System Adapter
    // This represents an asynchronous call to update legacy hospital systems
    // Example implementation:
    // try {
    //   await updateLegacySystem({
    //     notificationId: notificationLog._id,
    //     recipientEmail,
    //     timestamp: new Date(),
    //   });
    // } catch (legacyError) {
    //   console.error('Legacy system update failed:', legacyError);
    //   // Log but don't fail the request - notification was already sent
    // }

    // Step 6: Return success response
    return res.status(200).json({
      success: true,
      message: 'Notification processed successfully',
      code: 'NOTIFICATION_SENT',
      data: {
        logId: notificationLog._id,
        recipientEmail,
        sentAt: notificationLog.createdAt,
        senderSystem,
      },
    });
  } catch (error) {
    console.error('Unexpected error in processNotification:', error);

    // Attempt to save error log to database
    try {
      const { senderSystem, recipientEmail, subject, message } = req.body;
      if (recipientEmail) {
        await NotificationLog.create({
          senderSystem: senderSystem || 'Unknown',
          recipientEmail: recipientEmail.toLowerCase(),
          subject: subject || 'N/A',
          message: message || 'N/A',
          status: 'Failed',
          errorDetails: error.message,
        });
      }
    } catch (dbError) {
      console.error('Failed to log error to database:', dbError.message);
    }

    // Return standardized error response for integrating teams
    return res.status(500).json({
      success: false,
      message: 'Internal server error while processing notification',
      code: 'INTERNAL_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Contact support if this persists',
    });
  }
};

/**
 * Get Notification Logs (Optional endpoint for debugging)
 * Retrieves notification logs from the database with pagination
 */
export const getNotificationLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, recipientEmail } = req.query;

    const query = {};
    if (status) query.status = status;
    if (recipientEmail) query.recipientEmail = recipientEmail.toLowerCase();

    const logs = await NotificationLog.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const totalCount = await NotificationLog.countDocuments(query);

    return res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
      },
    });
  } catch (error) {
    console.error('Error fetching notification logs:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve notification logs',
      code: 'FETCH_LOGS_ERROR',
      details: error.message,
    });
  }
};
