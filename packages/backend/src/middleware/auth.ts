import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksRsa from 'jwks-rsa';
import { config } from '../config';
import { queryByPk, updateItem } from '../db/operations';

export interface AuthUser {
  userId: string;
  email: string;
  orgId: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const jwksClient = jwksRsa({
  jwksUri: `https://cognito-idp.${config.region}.amazonaws.com/${config.userPoolId}/.well-known/jwks.json`,
  cache: true,
  cacheMaxAge: 600000,
});

function getSigningKey(header: jwt.JwtHeader): Promise<string> {
  return new Promise((resolve, reject) => {
    jwksClient.getSigningKey(header.kid, (err, key) => {
      if (err || !key) return reject(err || new Error('No key found'));
      resolve(key.getPublicKey());
    });
  });
}

const activatedUsers = new Set<string>();

async function syncUserStatusToActive(orgId: string, email: string): Promise<void> {
  if (!orgId || !email) return;

  const cacheKey = `${orgId}:${email}`;
  if (activatedUsers.has(cacheKey)) return;

  const { items } = await queryByPk(`ORG#${orgId}`, 'USER#');
  const normalizedEmail = email.toLowerCase();
  const userRecord = items.find(
    (u: any) => (u.email as string || '').toLowerCase() === normalizedEmail,
  );
  if (!userRecord) return;

  if (userRecord.status === 'pending') {
    await updateItem(`ORG#${orgId}`, userRecord.SK as string, {
      status: 'active',
      updatedAt: new Date().toISOString(),
    });
  }

  activatedUsers.add(cacheKey);
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing authorization header' } });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
      return;
    }

    const signingKey = await getSigningKey(decoded.header);
    const payload = jwt.verify(token, signingKey, {
      issuer: `https://cognito-idp.${config.region}.amazonaws.com/${config.userPoolId}`,
    }) as Record<string, string>;

    req.user = {
      userId: payload.sub,
      email: payload.email,
      orgId: payload['custom:orgId'] || '',
      role: payload['custom:role'] || 'user',
    };

    try {
      await syncUserStatusToActive(req.user.orgId, req.user.email);
    } catch (err) {
      console.error('Failed to sync user status to active:', err);
    }

    next();
  } catch {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Token verification failed' } });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
      return;
    }
    next();
  };
}
