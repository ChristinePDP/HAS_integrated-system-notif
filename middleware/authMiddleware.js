import jwt from 'jsonwebtoken';

/**
 * Authentication Middleware
 * Verifies JWT tokens from the Authorization header.
 * * INTEGRATION READY:
 * - If AUTH_SERVICE_URL is in .env, it uses API fetch to the Auth Group.
 * - If AUTH_SERVICE_URL is missing, it falls back to local JWT validation.
 * * Expected header format: Authorization: Bearer <token>
 */
export const authMiddleware = async (req, res, next) => {
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

    // =========================================================================
    // DUAL-MODE VALIDATION (Local JWT vs External API)
    // =========================================================================
    
    const authServiceUrl = process.env.AUTH_SERVICE_URL;

    if (authServiceUrl) {
      // 🟢 MODE 1: EXTERNAL API FETCH (Used when Auth Group is ready)
      console.log(`[Auth] Verifying token via external Auth System: ${authServiceUrl}`);
      
      const authResponse = await fetch(authServiceUrl, {
        method: 'POST', // Adjust to GET if the Auth group prefers
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!authResponse.ok) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized: Invalid token according to Auth System',
          code: 'EXTERNAL_AUTH_REJECTED',
        });
      }

      // Extract the verified user data (payload) returned by the Auth Group
      const authData = await authResponse.json();
      
      // Attach the user data (which should contain role and email) to the request
      // (Using authData.user or fallback to authData depending on their JSON structure)
      req.user = authData.user || authData; 
      
      return next();

    } else {
      // 🟡 MODE 2: LOCAL JWT VERIFY (Used for current testing phase)
      console.log('[Auth] Verifying token locally using JWT_SECRET');
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
      return next();
    }

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
      message: 'Authentication or Network error',
      code: 'AUTH_ERROR',
      details: error.message,
    });
  }
};

export default authMiddleware;