import NotificationLog from '../models/NotificationLog.js';
import { sendEmail } from '../config/mailer.js';

/**
 * Process Notification Controller
 * * Handles incoming notification requests from other microservices.
 * Implements duplicate detection, email sending, and database logging.
 * 
 *  * Request body format:
 * {
 *   "senderSystem": "string",
 *   "recipientEmail": "string",
 *   "subject": "string",
 *   "message": "string"
 * }
 * 
 */
export const processNotification = async (req, res) => {
  try {
    // Step 1: Extract and validate request body
    const { recipientEmail, subject, message } = req.body;

    // Validate required fields (senderSystem is no longer required from the client)
    if (!recipientEmail || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        code: 'MISSING_FIELDS',
        required: ['recipientEmail', 'subject', 'message'],
        received: { recipientEmail, subject, message },
      });
    }

    // AUTO-DETECT SENDER SYSTEM FROM TOKEN
    let senderSystem = 'Unknown System';
    if (req.user && req.user.role) {
        const role = req.user.role;
        if (role === 'Doctor') senderSystem = 'Doctor Portal';
        else if (role === 'Patient') senderSystem = 'Patient Portal';
        else if (role === 'Admin') senderSystem = 'Admin System';
        else senderSystem = `${role} System`;
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
      senderEmail: req.user && req.user.email ? req.user.email.toLowerCase() : null,
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
    // (Adapter Layer integration logic will go here if needed)

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

    return res.status(500).json({
      success: false,
      message: 'Internal server error while processing notification',
      code: 'INTERNAL_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Contact support if this persists',
    });
  }
};

/**
 * Get Notification Logs
 * Retrieves notification logs with Role-Based Access Control (RBAC) and pagination.
 */
export const getNotificationLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;

    const query = {};
    
    // Status filter (allows fetching only "Failed" or "Sent" logs if requested)
    if (status) query.status = status;

    // ====================================================================
    // INTEGRATION FIX: ROLE-BASED ACCESS CONTROL (RBAC)
    // Identify the user requesting the data based on their verified token
    // ====================================================================
    const user = req.user; // Extracted from authMiddleware

    // Fallback security: Block access if the token lacks a proper role payload
    if (!user || !user.role) {
      query.recipientEmail = 'unauthorized_access'; 
    } 
    // GROUP 5 (Patient Portal): Patients can only view their own emails
    else if (user.role === 'Patient') {
      if (!user.email) {
        return res.status(400).json({ success: false, message: "Token payload missing 'email' for patient validation." });
      }
      query.recipientEmail = user.email.toLowerCase();
    } 
    // GROUP 6 (Doctor Portal): Doctors can ONLY view logs they personally sent
    else if (user.role === 'Doctor') {
      if (!user.email) {
        return res.status(400).json({ success: false, message: "Token payload missing 'email' for doctor validation." });
      }
      query.senderEmail = user.email.toLowerCase();
    } 
    // ADMIN ROLE: Unrestricted access. Allowed to fetch all logs or search by specific recipient
    else if (user.role === 'Admin') {
      if (req.query.recipientEmail) {
        query.recipientEmail = req.query.recipientEmail.toLowerCase();
      }
    }

    // ====================================================================
    
    // Fetch from database with the constructed query
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
        currentPage: Number(page),
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