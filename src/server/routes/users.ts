import { Router } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Initialize firebase-admin if not already initialized
if (!getApps().length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      initializeApp({
        credential: cert(serviceAccount),
        projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'ganesh-utsav-a6a5b'
      });
    } else {
      initializeApp({ projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'ganesh-utsav-a6a5b' });
    }
  } catch (e) {
    console.warn("Failed to initialize firebase-admin:", e);
  }
}

const router = Router();

// Middleware to verify Admin Token
const verifyAdminToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    if (decodedToken.email !== 'navyuvakganeshmitramandal14@gmail.com') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
    req.adminUser = decodedToken;
    next();
  } catch (error) {
    console.error("Error verifying admin token:", error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

// DELETE /api/users/:uid
router.delete('/:uid', verifyAdminToken, async (req: any, res: any) => {
  const targetUid = req.params.uid;
  try {
    await getAuth().deleteUser(targetUid);
    console.log(`Successfully deleted auth user: ${targetUid}`);
  } catch (error: any) {
    console.warn(`Could not delete Firebase Auth user (missing service account credentials?):`, error.message);
  }
  return res.json({ message: 'User deletion processed.' });
});

export default router;
