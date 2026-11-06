import { createContext } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import type { User } from '@/types';

export interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  isAuthenticated: boolean;
  resetPassword: (email: string) => Promise<void>;
  signUpFirstTimeOwner: (email: string, password: string, name: string) => Promise<void>;
  bootstrapOwner: (name: string) => Promise<void>;
  createEmployee: (
    email: string,
    password: string,
    name: string,
    role: string,
    permissions: string[],
  ) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
