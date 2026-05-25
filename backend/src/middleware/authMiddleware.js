import jwt from 'jsonwebtoken';

export function protect(req, res, next) {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      
      const secret = process.env.JWT_SECRET || 'super_secure_development_secret_key_13579';
      const decoded = jwt.verify(token, secret);
      
      req.user = { id: decoded.id };
      return next();
    } catch (error) {
      console.error('JWT Token Verification Error:', error.message);
      return res.status(401).json({ error: 'Not authorized, token failed or expired' });
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'Not authorized, no token provided' });
  }
}
