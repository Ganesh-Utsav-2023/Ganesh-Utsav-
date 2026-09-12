import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebaseConfig.ts';
import { User } from '../types/index.ts';
import { setStoredToken, clearStoredToken, getStoredToken } from '../lib/api.ts';
import { AUTHORIZED_ADMIN_EMAIL, isAuthorizedAdminEmail } from '../utils/devoteeUtils.ts';

export { AUTHORIZED_ADMIN_EMAIL, isAuthorizedAdminEmail };

export function formatAuthError(error: any): string {
  const code = error?.code || '';
  const message = error?.message || '';

  let userMsg = '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      userMsg = 'Invalid email or password.';
      break;
    case 'auth/wrong-password':
      userMsg = 'Incorrect password.';
      break;
    case 'auth/user-not-found':
      userMsg = 'Admin account does not exist in the new Firebase project (ganesh-utsav-a6a5b).';
      break;
    case 'auth/invalid-email':
      userMsg = 'Please enter a valid email address.';
      break;
    case 'auth/too-many-requests':
      userMsg = 'Too many unsuccessful attempts. Access disabled temporarily.';
      break;
    case 'auth/user-disabled':
      userMsg = 'This user account has been disabled in Firebase Console.';
      break;
    case 'auth/operation-not-allowed':
      userMsg = 'Email/Password sign-in method is not enabled in Firebase Console.';
      break;
    case 'auth/network-request-failed':
      userMsg = 'Network connection error. Please check your internet connection.';
      break;
    case 'auth/unauthorized-domain': {
      const hostname = typeof window !== 'undefined' ? window.location.hostname : 'current domain';
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      userMsg = `Domain '${hostname}' (origin: '${origin}') is not listed in Firebase Console Authorized Domains. Please add '${hostname}' in Firebase Console → Authentication → Settings → Authorized domains for project 'ganesh-utsav-a6a5b'.`;
      break;
    }
    case 'auth/api-key-not-valid':
    case 'auth/invalid-api-key':
      userMsg = 'Invalid Firebase API key.';
      break;
    case 'auth/popup-closed-by-user':
      userMsg = 'Google sign-in popup was closed before completing authentication.';
      break;
    case 'auth/popup-blocked':
      userMsg = 'Pop-up window was blocked by your browser settings. Please allow pop-ups for this site or open the app in a new tab to sign in.';
      break;
    case 'auth/email-already-in-use':
      userMsg = 'An account with this email address already exists.';
      break;
    case 'auth/weak-password':
      userMsg = 'Password should be at least 6 characters.';
      break;
    case 'permission-denied':
      userMsg = 'Firestore database permission denied. Access rules updated, please try again.';
      break;
    default:
      userMsg = message || 'Authentication failed.';
      break;
  }

  if (code) {
    return `${userMsg} (${code})`;
  }
  return userMsg;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (data: { full_name: string; email: string; phone: string; password: string; confirm_password?: string }) => Promise<User>;
  loginWithGoogle: () => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [loading, setLoading] = useState<boolean>(true);

  // Synchronize Firebase Auth State
  useEffect(() => {
    getRedirectResult(auth).then((res) => {
      if (res?.user) {
        console.log("Redirect auth resolved for:", res.user.email);
      }
    }).catch((err) => {
      console.warn("getRedirectResult note:", err?.message || err);
    });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setToken(null);
        clearStoredToken();
        setLoading(false);
        return;
      }

      try {
        const idToken = await firebaseUser.getIdToken();
        setStoredToken(idToken);
        setToken(idToken);

        const email = (firebaseUser.email || '').trim().toLowerCase();
        const role = isAuthorizedAdminEmail(email) ? 'admin' : 'user';
        const nowIso = new Date().toISOString();

        let profile: User = {
          id: firebaseUser.uid,
          uid: firebaseUser.uid,
          full_name: firebaseUser.displayName || email.split('@')[0] || 'Devotee',
          displayName: firebaseUser.displayName || email.split('@')[0] || 'Devotee',
          email: email,
          phone: firebaseUser.phoneNumber || '',
          role: role as 'admin' | 'user',
          provider: firebaseUser.providerData[0]?.providerId || 'password',
          status: 'Active',
          created_at: nowIso,
          updated_at: nowIso,
        };

        try {
          const userRef = doc(db, 'users', firebaseUser.uid);
          
          // Setup real-time listener for user profile
          const unsubProfile = onSnapshot(userRef, async (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              if (data.accountStatus === 'BLOCKED') {
                unsubProfile();
                await auth.signOut();
                setUser(null);
                setToken(null);
                clearStoredToken();
                // Can't throw here to stop the flow easily but we cleared the user.
              } else {
                setUser((prev) => prev ? {
                  ...prev,
                  status: data.accountStatus || data.status || 'ACTIVE',
                  accountStatus: data.accountStatus || 'ACTIVE'
                } as User : null);
              }
            }
          });
          
          const userSnap = await getDoc(userRef);

          if (!userSnap.exists()) {
            await setDoc(userRef, {
              uid: firebaseUser.uid,
              displayName: profile.displayName,
              full_name: profile.full_name,
              email: profile.email,
              phone: profile.phone,
              role: role,
              provider: profile.provider,
              accountStatus: 'ACTIVE',
              createdAt: nowIso,
              updatedAt: nowIso,
            }, { merge: true });
          } else {
            const data = userSnap.data();
            profile = {
              id: firebaseUser.uid,
              uid: firebaseUser.uid,
              full_name: data.full_name || data.displayName || firebaseUser.displayName || email.split('@')[0] || 'Devotee',
              displayName: data.displayName || firebaseUser.displayName || email.split('@')[0] || 'Devotee',
              email: email,
              phone: data.phone || firebaseUser.phoneNumber || '',
              role: role as 'admin' | 'user',
              provider: data.provider || firebaseUser.providerData[0]?.providerId || 'password',
              accountStatus: data.accountStatus || 'ACTIVE',
              created_at: data.created_at || data.createdAt || nowIso,
              updated_at: nowIso,
            };

            if (data.role !== role) {
              await setDoc(userRef, { role, updatedAt: nowIso }, { merge: true });
            }
          }
          
          if (profile.accountStatus === 'BLOCKED') {
            await auth.signOut();
            throw new Error('Your account has been blocked by the administrator.');
          }
        } catch (dbErr: any) {
          if (dbErr.message === 'Your account has been blocked by the administrator.') {
            throw dbErr;
          }
          console.warn("Firestore user profile sync warning (proceeding with Auth profile):", dbErr);
        }

        setUser(profile);
      } catch (err: any) {
        console.error("Firebase Authentication Error:", err);
        console.error("Firebase Error Code:", err?.code);
        console.error("Firebase Error Message:", err?.message);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const refreshUser = useCallback(async () => {
    const currentFBUser = auth.currentUser;
    if (currentFBUser) {
      const email = (currentFBUser.email || '').trim().toLowerCase();
      const role = isAuthorizedAdminEmail(email) ? 'admin' : 'user';
      const userSnap = await getDoc(doc(db, 'users', currentFBUser.uid));
      if (userSnap.exists()) {
        const data = userSnap.data();
        const accountStatus = data.accountStatus || data.status || 'ACTIVE';
        if (accountStatus === 'BLOCKED') {
          await auth.signOut();
          setUser(null);
          setToken(null);
          clearStoredToken();
          return;
        }
        setUser({
          id: currentFBUser.uid,
          uid: currentFBUser.uid,
          full_name: data.full_name || data.displayName || currentFBUser.displayName || 'Devotee',
          displayName: data.displayName || currentFBUser.displayName || 'Devotee',
          email: email,
          phone: data.phone || '',
          role: role as 'admin' | 'user',
          provider: data.provider || 'password',
          status: accountStatus,
          accountStatus: accountStatus as 'ACTIVE' | 'BLOCKED',
          created_at: data.created_at || data.createdAt || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const normalizedEmail = email.trim().toLowerCase();

    console.log("AUTH DIAGNOSTIC:", {
      method: "signInWithEmailAndPassword",
      projectId: auth.app.options.projectId,
      email: normalizedEmail,
      authInitialized: Boolean(auth),
    });

    try {
      const res = await signInWithEmailAndPassword(auth, normalizedEmail, password);
      const firebaseUser = res.user;
      const idToken = await firebaseUser.getIdToken();
      setStoredToken(idToken);
      setToken(idToken);

      const userEmail = (firebaseUser.email || '').trim().toLowerCase();
      const isExactAdmin = userEmail === "navyuvakganeshmitramandal14@gmail.com";
      const role = isExactAdmin ? 'admin' : 'user';
      const nowIso = new Date().toISOString();

      let profile: User = {
        id: firebaseUser.uid,
        uid: firebaseUser.uid,
        full_name: firebaseUser.displayName || userEmail.split('@')[0],
        displayName: firebaseUser.displayName || userEmail.split('@')[0],
        email: userEmail,
        phone: '',
        role: role as 'admin' | 'user',
        provider: 'password',
        status: 'ACTIVE',
        created_at: nowIso,
        updated_at: nowIso,
      };

      try {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          profile = {
            id: firebaseUser.uid,
            uid: firebaseUser.uid,
            full_name: data.full_name || data.displayName || profile.full_name,
            displayName: data.displayName || profile.displayName,
            email: userEmail,
            phone: data.phone || '',
            role: role as 'admin' | 'user',
            provider: 'password',
            status: data.accountStatus || data.status || 'ACTIVE',
            created_at: data.created_at || data.createdAt || nowIso,
            updated_at: nowIso,
          };
          
          if (profile.status === 'BLOCKED') {
            await auth.signOut();
            throw new Error('Your account has been blocked by the administrator.');
          }
        } else {
          await setDoc(userRef, {
            uid: firebaseUser.uid,
            displayName: profile.displayName,
            full_name: profile.full_name,
            email: profile.email,
            phone: profile.phone,
            role: role,
            provider: 'password',
            status: 'ACTIVE',
            accountStatus: 'ACTIVE',
            createdAt: nowIso,
            updatedAt: nowIso,
          }, { merge: true });
        }
      } catch (dbErr: any) {
        if (dbErr.message === 'Your account has been blocked by the administrator.') {
          throw dbErr;
        }
        console.warn("Firestore profile sync warning during login:", dbErr);
      }

      setUser(profile);
      return profile;
    } catch (err: any) {
      console.error("Firebase Authentication Error:", err);
      console.error("Firebase Error Code:", err?.code);
      console.error("Firebase Error Message:", err?.message);
      throw new Error(formatAuthError(err));
    }
  };

  const signup = async (data: {
    full_name: string;
    email: string;
    phone: string;
    password: string;
    confirm_password?: string;
  }): Promise<User> => {
    const normalizedEmail = (data.email || '').trim().toLowerCase();
    const cleanName = (data.full_name || '').trim();
    const cleanPhone = (data.phone || '').trim();

    console.log("AUTH DIAGNOSTIC:", {
      method: "createUserWithEmailAndPassword",
      projectId: auth.app.options.projectId,
      email: normalizedEmail,
      authInitialized: Boolean(auth),
    });

    try {
      const res = await createUserWithEmailAndPassword(auth, normalizedEmail, data.password);
      const firebaseUser = res.user;

      if (cleanName) {
        await updateProfile(firebaseUser, { displayName: cleanName });
      }

      const idToken = await firebaseUser.getIdToken();
      setStoredToken(idToken);
      setToken(idToken);

      const userEmail = (firebaseUser.email || '').trim().toLowerCase();
      const isExactAdmin = userEmail === "navyuvakganeshmitramandal14@gmail.com";
      const role = isExactAdmin ? 'admin' : 'user';
      const nowIso = new Date().toISOString();

      const profile: User = {
        id: firebaseUser.uid,
        uid: firebaseUser.uid,
        full_name: cleanName,
        displayName: cleanName,
        email: userEmail,
        phone: cleanPhone,
        role: role as 'admin' | 'user',
        provider: 'password',
        status: 'ACTIVE',
        accountStatus: 'ACTIVE',
        created_at: nowIso,
        updated_at: nowIso,
      };

      try {
        await setDoc(doc(db, 'users', firebaseUser.uid), {
          uid: firebaseUser.uid,
          displayName: cleanName,
          full_name: cleanName,
          email: userEmail,
          phone: cleanPhone,
          role: role,
          provider: 'password',
          status: 'ACTIVE',
          accountStatus: 'ACTIVE',
          createdAt: nowIso,
          updatedAt: nowIso,
        }, { merge: true });
      } catch (dbErr) {
        console.warn("Firestore profile sync warning during signup:", dbErr);
      }

      setUser(profile);
      return profile;
    } catch (err: any) {
      console.error("Firebase Authentication Error:", err);
      console.error("Firebase Error Code:", err?.code);
      console.error("Firebase Error Message:", err?.message);
      throw new Error(formatAuthError(err));
    }
  };

  const loginWithGoogle = async (): Promise<User> => {
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';

    console.log("AUTH DIAGNOSTIC:", {
      method: "signInWithPopup",
      projectId: auth.app.options.projectId,
      providerId: googleProvider.providerId,
      origin: currentOrigin,
      hostname: currentHostname,
      authInitialized: Boolean(auth),
    });

    try {
      let res;
      try {
        res = await signInWithPopup(auth, googleProvider);
      } catch (popupErr: any) {
        if (popupErr?.code === 'auth/popup-blocked') {
          console.warn("Popup blocked by browser/iframe. Triggering signInWithRedirect fallback...");
          try {
            await signInWithRedirect(auth, googleProvider);
            return new Promise<User>(() => {});
          } catch (redirectErr) {
            console.error("signInWithRedirect fallback error:", redirectErr);
            throw popupErr;
          }
        }
        throw popupErr;
      }

      const firebaseUser = res.user;
      const idToken = await firebaseUser.getIdToken();
      setStoredToken(idToken);
      setToken(idToken);

      const userEmail = (firebaseUser.email || '').trim().toLowerCase();
      const isExactAdmin = userEmail === "navyuvakganeshmitramandal14@gmail.com";
      const role = isExactAdmin ? 'admin' : 'user';
      const nowIso = new Date().toISOString();

      let profile: User = {
        id: firebaseUser.uid,
        uid: firebaseUser.uid,
        full_name: firebaseUser.displayName || userEmail.split('@')[0] || 'Devotee',
        displayName: firebaseUser.displayName || userEmail.split('@')[0] || 'Devotee',
        email: userEmail,
        phone: firebaseUser.phoneNumber || '',
        role: role as 'admin' | 'user',
        provider: 'google.com',
        status: 'Active',
        created_at: nowIso,
        updated_at: nowIso,
      };

      try {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          profile = {
            id: firebaseUser.uid,
            uid: firebaseUser.uid,
            full_name: data.full_name || data.displayName || profile.full_name,
            displayName: data.displayName || profile.displayName,
            email: userEmail,
            phone: data.phone || firebaseUser.phoneNumber || '',
            role: role as 'admin' | 'user',
            provider: 'google.com',
            status: data.accountStatus || data.status || 'ACTIVE',
            created_at: data.created_at || data.createdAt || nowIso,
            updated_at: nowIso,
          };

          if (profile.status === 'BLOCKED') {
            await auth.signOut();
            throw new Error('Your account has been blocked by the administrator.');
          }
        } else {
          await setDoc(userRef, {
            uid: firebaseUser.uid,
            displayName: profile.displayName,
            full_name: profile.full_name,
            email: profile.email,
            phone: profile.phone,
            role: role,
            provider: 'google.com',
            status: 'ACTIVE',
            accountStatus: 'ACTIVE',
            createdAt: nowIso,
            updatedAt: nowIso,
          }, { merge: true });
        }
      } catch (dbErr: any) {
        if (dbErr.message === 'Your account has been blocked by the administrator.') {
          throw dbErr;
        }
        console.warn("Firestore profile sync warning during google login:", dbErr);
      }

      setUser(profile);
      return profile;
    } catch (err: any) {
      console.error("Firebase Authentication Error:", err);
      console.error("Firebase Error Code:", err?.code);
      console.error("Firebase Error Message:", err?.message);
      console.error("Current Window Origin:", currentOrigin);
      console.error("Current Window Hostname:", currentHostname);
      throw new Error(formatAuthError(err));
    }
  };

  const logout = async () => {
    await signOut(auth);
    clearStoredToken();
    setToken(null);
    setUser(null);
  };

  const isAdmin = Boolean(
    user &&
    user.email?.toLowerCase() === 'navyuvakganeshmitramandal14@gmail.com' &&
    user.role === 'admin'
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAdmin,
        login,
        signup,
        loginWithGoogle,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
