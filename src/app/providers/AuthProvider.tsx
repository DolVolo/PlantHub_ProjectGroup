'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { type User } from "firebase/auth";
import { useRouter } from "next/navigation";

import {
  signUpUser,
  signInUser,
  signInWithGoogle,
  signOutUser,
  resendVerificationEmail,
  cancelAccount,
  fetchUserProfile,
  updateEmailVerificationFlag,
  onAuthChange,
  sendEmailVerificationToUser,
  cancelRegistration,
  type SignUpPayload,
  type UserProfile,
} from "../../services/firebase/auth.service";
import { auth } from "@/lib/firebaseClient";

interface AuthContextValue {
  firebaseUser: User | null;
  profile: UserProfile | null;
  initializing: boolean;
  signUp: (payload: SignUpPayload) => Promise<User>;
  signIn: (email: string, password: string) => Promise<User>;
  signInGoogle: () => Promise<User>;
  signOut: () => Promise<void>;
  reloadUser: () => Promise<User | null>;
  resendVerification: () => Promise<void>;
  cancelRegistration: () => Promise<void>;
  sendEmailVerification: () => Promise<void>;
  cancelRegistrationNew: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [initializing, setInitializing] = useState(true);

  const hydrateProfile = useCallback(async (user: User | null) => {
    if (!user) {
      setProfile(null);
      return;
    }

    const existingProfile = await fetchUserProfile(user.uid);

    if (user.emailVerified && existingProfile && !existingProfile.emailVerified) {
      await updateEmailVerificationFlag(user.uid, true);
      setProfile({ ...existingProfile, emailVerified: true });
      return;
    }

    setProfile(existingProfile);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      setFirebaseUser(user);
      await hydrateProfile(user);
      setInitializing(false);
    });

    return unsubscribe;
  }, [hydrateProfile]);

  const signUp = useCallback(async (payload: SignUpPayload): Promise<User> => {
    const user = await signUpUser(payload);
    setFirebaseUser(user);
    await hydrateProfile(user);
    return user;
  }, [hydrateProfile]);

  const signIn = useCallback(async (email: string, password: string): Promise<User> => {
    const user = await signInUser(email, password);
    setFirebaseUser(user);
    await hydrateProfile(user);
    return user;
  }, [hydrateProfile]);

  const signInGoogle = useCallback(async (): Promise<User> => {
    const user = await signInWithGoogle();
    setFirebaseUser(user);
    await hydrateProfile(user);
    return user;
  }, [hydrateProfile]);

  const signOut = useCallback(async () => {
    await signOutUser();
    setFirebaseUser(null);
    setProfile(null);
  }, []);

  const reloadUser = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setFirebaseUser(null);
      setProfile(null);
      return null;
    }

    await currentUser.reload();
    const refreshed = auth.currentUser;
    setFirebaseUser(refreshed);
    await hydrateProfile(refreshed);
    return refreshed;
  }, [hydrateProfile]);

  const resendVerification = useCallback(async () => {
    if (!auth.currentUser) {
      throw new Error("ไม่พบผู้ใช้งานที่กำลังเข้าสู่ระบบ");
    }
    await resendVerificationEmail(auth.currentUser);
  }, []);

  const cancelRegistration = useCallback(async () => {
    if (!auth.currentUser) {
      throw new Error("ไม่พบผู้ใช้งานที่กำลังเข้าสู่ระบบ");
    }
    await cancelAccount(auth.currentUser);
    setFirebaseUser(null);
    setProfile(null);
  }, []);

  const sendEmailVerification = useCallback(async (): Promise<void> => {
    await sendEmailVerificationToUser();
  }, []);

  const cancelRegistrationNew = useCallback(async (): Promise<void> => {
    await cancelRegistration();
    setFirebaseUser(null);
    setProfile(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    firebaseUser,
    profile,
    initializing,
    signUp,
    signIn,
    signInGoogle,
    signOut,
    reloadUser,
    resendVerification,
    cancelRegistration,
    sendEmailVerification,
    cancelRegistrationNew,
  }), [firebaseUser, profile, initializing, signUp, signIn, signInGoogle, signOut, reloadUser, resendVerification, cancelRegistration, sendEmailVerification, cancelRegistrationNew]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }
  return context;
}

