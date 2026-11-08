import { useState, useEffect, useRef, ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  updateProfile,
  deleteUser,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import { PERMISSIONS, ROLE_PERMISSIONS, ROLES } from '@/constants';
import { BUSINESS } from '@/config/business';
import { User } from '@/types';
import { getAuthErrorMessage } from '@/features/auth/authErrors';
import { AuthContext } from '@/features/auth/auth-context';

type ProfileLoadResult = {
  profile: User | null;
  inactive: boolean;
};


const userDocRef = (uid: string) => doc(db, `businesses/${BUSINESS.id}/users/${uid}`);
const ownerLockRef = () => doc(db, `businesses/${BUSINESS.id}/meta/owner`);

async function loadProfile(fbUser: FirebaseUser): Promise<ProfileLoadResult> {
  const snap = await getDoc(userDocRef(fbUser.uid));
  if (!snap.exists()) {
    return { profile: null, inactive: false };
  }

  const profile = snap.data() as User;
  if (profile.active === false) {
    return { profile: null, inactive: true };
  }

  return { profile, inactive: false };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const bootstrappingRef = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (!fbUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      if (bootstrappingRef.current) {
        setLoading(false);
        return;
      }

      try {
        const { profile, inactive } = await loadProfile(fbUser);
        if (profile) {
          setUser(profile);
          setAuthError(null);
        } else {
          setUser(null);
          setAuthError(getAuthErrorMessage(new Error(inactive ? 'ACCOUNT_DEACTIVATED' : 'MISSING_PROFILE')));
          await signOut(auth);
        }
      } catch (error) {
        console.error('Could not load user profile:', error);
        setUser(null);
        setAuthError(getAuthErrorMessage(error));
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const clearAuthError = () => setAuthError(null);

  const login = async (email: string, password: string) => {
    setAuthError(null);
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      const { profile, inactive } = await loadProfile(credential.user);
      if (!profile) {
        await signOut(auth);
        const message = getAuthErrorMessage(new Error(inactive ? 'ACCOUNT_DEACTIVATED' : 'MISSING_PROFILE'));
        setAuthError(message);
        throw new Error(message);
      }
      setFirebaseUser(credential.user);
      setUser(profile);
      setAuthError(null);
    } catch (error) {
      const message = getAuthErrorMessage(error);
      setAuthError(message);
      throw new Error(message);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setFirebaseUser(null);
    setAuthError(null);
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.role === ROLES.OWNER) return true;
    const permissions = Array.isArray(user.permissions)
      ? user.permissions
      : ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS] ?? [];
    return permissions.includes(permission);
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  };

  const bootstrapOwner = async (name: string) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('NO_SESSION');
    }

    const currentUserRef = userDocRef(currentUser.uid);
    const lockRef = ownerLockRef();

    await runTransaction(db, async (tx) => {
      const [lockSnap, profileSnap] = await Promise.all([tx.get(lockRef), tx.get(currentUserRef)]);
      const existingProfile = profileSnap.exists() ? (profileSnap.data() as Partial<User>) : null;

      if (lockSnap.exists() && lockSnap.data().uid !== currentUser.uid) {
        throw new Error('OWNER_ALREADY_INITIALIZED');
      }

      if (existingProfile && existingProfile.role !== ROLES.OWNER) {
        throw new Error('PROFILE_ALREADY_EXISTS');
      }

      const profile: Record<string, unknown> = {
        id: currentUser.uid,
        uid: currentUser.uid,
        businessId: BUSINESS.id,
        name: name || currentUser.displayName || 'Owner',
        email: (currentUser.email || '').toLowerCase(),
        role: ROLES.OWNER,
        permissions: Object.values(PERMISSIONS),
        active: true,
        updatedAt: serverTimestamp(),
      };

      if (!profileSnap.exists()) {
        profile.createdAt = serverTimestamp();
      }

      tx.set(currentUserRef, profile, { merge: true });

      if (!lockSnap.exists()) {
        tx.set(lockRef, {
          id: 'owner',
          businessId: BUSINESS.id,
          uid: currentUser.uid,
          email: (currentUser.email || '').toLowerCase(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    });

    const { profile } = await loadProfile(currentUser);
    if (!profile) {
      throw new Error('PROFILE_NOT_CREATED');
    }
    setFirebaseUser(currentUser);
    setUser(profile);
    setAuthError(null);
  };

  const signUpFirstTimeOwner = async (email: string, password: string, name: string) => {
    setAuthError(null);
    const normalizedEmail = email.trim().toLowerCase();
    const ownerName = name.trim();

    if (!ownerName) {
      throw new Error('Enter the owner full name.');
    }
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    if (auth.currentUser && auth.currentUser.email?.toLowerCase() !== normalizedEmail) {
      await signOut(auth);
    }

    let currentUser = auth.currentUser;
    let createdAuthUser = false;
    bootstrappingRef.current = true;

    try {
      if (!currentUser) {
        try {
          const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
          currentUser = credential.user;
          createdAuthUser = true;
        } catch (error: any) {
          if (error?.code === 'auth/email-already-in-use') {
            try {
              const credential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
              currentUser = credential.user;
            } catch {
              throw new Error(
                'An account with this email already exists. Enter its current password, or use Sign In instead.',
              );
            }
          } else {
            throw new Error(getAuthErrorMessage(error));
          }
        }
      }

      const activeUser = currentUser;
      if (!activeUser) {
        throw new Error('NO_SESSION');
      }

      await updateProfile(activeUser, { displayName: ownerName });
      await bootstrapOwner(ownerName);
    } catch (error) {
      if (createdAuthUser && currentUser) {
        try {
          await deleteUser(currentUser);
        } catch {
          await signOut(auth).catch(() => undefined);
        }
      } else {
        await signOut(auth).catch(() => undefined);
      }
      const message = getAuthErrorMessage(error);
      setAuthError(message);
      setUser(null);
      setFirebaseUser(null);
      throw new Error(message);
    } finally {
      bootstrappingRef.current = false;
    }
  };

  const createEmployee = async (email: string, password: string, name: string, role: string, permissions: string[]) => {
    const { authService } = await import('@/services');
    try {
      await authService.createEmployee(email, password, name, role, permissions);
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  };

  const isAuthenticated = Boolean(user);

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        authError,
        clearAuthError,
        login,
        logout,
        hasPermission,
        isAuthenticated,
        resetPassword,
        signUpFirstTimeOwner,
        bootstrapOwner,
        createEmployee,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

