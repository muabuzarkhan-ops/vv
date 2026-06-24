import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { DecodedIdToken } from 'firebase-admin/auth';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { eq } from 'drizzle-orm';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
  dbUser?: {
    uid: string;
    email: string;
    name: string;
    role: string;
    org: string;
    isAdmin: boolean;
  };
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token format' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;

    // Retrieve or default register the user in Postgres
    const email = decodedToken.email || 'unknown@anesvad.org';
    const name = decodedToken.name || email.split('@')[0];
    
    // Check if user already exists
    let existingUser = await db.select()
      .from(users)
      .where(eq(users.uid, decodedToken.uid))
      .limit(1)
      .then(rows => rows[0]);

    if (!existingUser) {
      // Upsert/Insert with default roles since it's their first login
      const rows = await db.insert(users)
        .values({
          uid: decodedToken.uid,
          email: email,
          name: name,
          role: 'Field officer', // Default assigned role
          org: 'Anesvad Affiliate Partner', // Default affiliation
        })
        .onConflictDoUpdate({
          target: users.uid,
          set: { email },
        })
        .returning();
      existingUser = rows[0];
    }

    req.dbUser = {
      uid: existingUser.uid,
      email: existingUser.email,
      name: existingUser.name,
      role: existingUser.role,
      org: existingUser.org,
      isAdmin: existingUser.role === 'Admin'
    };
    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token in Express middleware:', error);
    return res.status(401).json({ error: 'Unauthorized: Token is expired or invalid' });
  }
};

// Require authenticated user to be an Admin
export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.dbUser || !req.dbUser.isAdmin) {
    return res.status(403).json({ error: 'Forbidden: Admin access required. Please login with admin credentials.' });
  }
  next();
};
