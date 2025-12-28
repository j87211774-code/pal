import jwt from 'jsonwebtoken';

const secret = process.env.JWT_SECRET || 'dev-secret';

export function sign(payload: object, options?: jwt.SignOptions) {
  return jwt.sign(payload, secret, options || { expiresIn: '7d' });
}

export function verify<T = any>(token: string) {
  return jwt.verify(token, secret) as T;
}
