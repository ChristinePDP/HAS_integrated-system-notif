import jwt from 'jsonwebtoken';

/**
 * Authentication Middleware
 * Verifies JWT tokens from the Authorization header.
 * 
 * This is a temporary implementation. Once the Auth microservice is complete,
 * this can be replaced with a call to that service for token validation.
 * 
 * Expected header format: Authorization: Bearer <token>
 */
export const authMiddleware = (req, res, next) => {
  try {
    // Extract the Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Authorization header is missing',
        code: 'MISSING_AUTH_HEADER',
      });
    }

    // Extract the token from "Bearer <token>" format
    const tokenParts = authHeader.split(' ');
    if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
      return res.status(401).json({
        success: false,
        message: 'Invalid authorization header format. Expected: Bearer <token>',
        code: 'INVALID_AUTH_FORMAT',
      });
    }

    const token = tokenParts[1];
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      console.error('JWT_SECRET is not defined in environment variables');
      return res.status(500).json({
        success: false,
        message: 'Internal server error: JWT configuration missing',
        code: 'JWT_CONFIG_ERROR',
      });
    }

    // Verify the JWT token
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded; // Attach decoded token data to request object
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        code: 'INVALID_TOKEN',
        details: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Authentication error',
      code: 'AUTH_ERROR',
      details: error.message,
    });
  }
};

export default authMiddleware;
