import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  FacebookAuthProvider,
  GoogleAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  updateProfile,
  deleteUser,
  getAuth,
  type User,
} from "firebase/auth";
import { FirebaseError, getApps, initializeApp } from "firebase/app";
import { doc, setDoc, getDoc, serverTimestamp, deleteDoc } from "firebase/firestore";

import { auth, firestore, firebaseApp } from "../../lib/firebaseClient";
import { createLog } from "./logs.service";

export type AppUserRole = "customer" | "seller" | "admin";

export interface UserProfile {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  role?: AppUserRole;
  createdAt: Date;
  updatedAt: Date;
  emailVerified: boolean;
  phone?: string;
  address?: string;
  profileImage?: string;
  isProfileComplete?: boolean;
  needsRoleSelection?: boolean;
  isNewUser?: boolean;
  storeName?: string;
  shopName?: string;
  shopDescription?: string;
  savedAddresses?: SavedAddress[];
}

export interface SavedAddress {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  district: string;
  province: string;
  postalCode: string;
  isDefault: boolean;
}

export interface SignUpPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  storeName?: string;
  role?: AppUserRole;
}

const USERS_COLLECTION = "users";

export async function signUpUser(input: SignUpPayload) {
  const credential = await createUserWithEmailAndPassword(auth, input.email, input.password);
  const { user } = credential;

  const displayName = input.storeName?.trim() || `${input.firstName} ${input.lastName}`.trim();

  await updateProfile(user, {
    displayName,
  });

  const profileRef = doc(firestore, USERS_COLLECTION, user.uid);

  await setDoc(profileRef, {
    uid: user.uid,
    email: user.email,
    firstName: input.firstName,
    lastName: input.lastName,
    role: input.role ?? "customer",
    storeName: input.storeName ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    emailVerified: false,
  });

  await sendEmailVerification(user);

  // สร้าง log สำหรับการสมัครสมาชิก
  await createLog(
    user.uid,
    user.email || "",
    displayName,
    "REGISTER",
    `ผู้ใช้สมัครสมาชิกใหม่: ${user.email} (${input.role ?? "customer"})`,
    { 
      role: input.role ?? "customer", 
      storeName: input.storeName || null 
    }
  );

  return user;
}

export async function signInUser(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  
  // สร้าง log สำหรับผู้ใช้ทั่วไป
  await createLog(
    credential.user.uid,
    email,
    credential.user.displayName || "ผู้ใช้",
    "LOGIN",
    "ผู้ใช้เข้าสู่ระบบ",
    { emailVerified: credential.user.emailVerified }
  );
  
  return credential.user;
}

export async function signInWithFacebook() {
  const provider = new FacebookAuthProvider();
  // Note: 'email' scope requires App Review from Facebook
  // For Development Mode, only 'public_profile' works without review
  provider.addScope('public_profile');
  
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // ตรวจสอบว่ามี profile ใน Firestore หรือยัง
    const profileRef = doc(firestore, USERS_COLLECTION, user.uid);
    const profileSnap = await getDoc(profileRef);

    if (!profileSnap.exists()) {
      // สร้าง profile ใหม่สำหรับผู้ใช้ Facebook
      const nameParts = (user.displayName || '').split(' ');
      const firstName = nameParts[0] || 'ผู้ใช้';
      const lastName = nameParts.slice(1).join(' ') || 'Facebook';

      // ใช้ email จาก Facebook หรือสร้าง email จาก uid ถ้าไม่มี
      const userEmail = user.email || `facebook_${user.uid}@planthub.local`;

      await setDoc(profileRef, {
        uid: user.uid,
        email: userEmail,
        firstName,
        lastName,
        role: "customer",
        profileImage: user.photoURL,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        emailVerified: true, // Facebook accounts are pre-verified
        provider: 'facebook',
        facebookId: user.providerData[0]?.uid, // เก็บ Facebook User ID
      });

      // สร้าง log สำหรับการสมัครผ่าน Facebook
      await createLog(
        user.uid,
        userEmail,
        user.displayName || "ผู้ใช้ Facebook",
        "REGISTER",
        `ผู้ใช้สมัครสมาชิกผ่าน Facebook: ${user.displayName || user.uid}`,
        { provider: 'facebook', facebookId: user.providerData[0]?.uid }
      );
    } else {
      // สร้าง log สำหรับการเข้าสู่ระบบผ่าน Facebook
      await createLog(
        user.uid,
        user.email || `facebook_${user.uid}@planthub.local`,
        user.displayName || "ผู้ใช้ Facebook",
        "LOGIN",
        "ผู้ใช้เข้าสู่ระบบผ่าน Facebook",
        { provider: 'facebook', facebookId: user.providerData[0]?.uid }
      );
    }

    return user;
  } catch (error) {
    // Handle specific Facebook errors
    throwFriendlyPopupError(error);
  }
}

// แปลง error ของการล็อกอินแบบ popup ให้เป็นข้อความภาษาไทย
function throwFriendlyPopupError(error: unknown): never {
  const code = error instanceof FirebaseError ? error.code : undefined;
  if (code === 'auth/account-exists-with-different-credential') {
    throw new Error('มีบัญชีที่ใช้อีเมลนี้อยู่แล้ว กรุณาเข้าสู่ระบบด้วยวิธีเดิม');
  } else if (code === 'auth/popup-closed-by-user') {
    throw new Error('ยกเลิกการเข้าสู่ระบบ');
  } else if (code === 'auth/popup-blocked') {
    throw new Error('เบราว์เซอร์บล็อกหน้าต่างป๊อปอัพ กรุณาอนุญาตและลองใหม่อีกครั้ง');
  }
  throw error;
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  // เพิ่ม scope สำหรับ email และ profile
  provider.addScope('email');
  provider.addScope('profile');
  
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // ตรวจสอบว่ามี profile ใน Firestore หรือยัง
    const profileRef = doc(firestore, USERS_COLLECTION, user.uid);
    const profileSnap = await getDoc(profileRef);

    if (!profileSnap.exists()) {
      // สร้าง profile ใหม่สำหรับผู้ใช้ Google (ผู้ใช้ใหม่)
      const nameParts = (user.displayName || '').split(' ');
      const firstName = nameParts[0] || 'ผู้ใช้';
      const lastName = nameParts.slice(1).join(' ') || 'Google';

      // ใช้ email จาก Google (Google จะมี email เสมอ)
      const userEmail = user.email || `google_${user.uid}@planthub.local`;

      await setDoc(profileRef, {
        uid: user.uid,
        email: userEmail,
        firstName,
        lastName,
        role: "customer", // ตั้งค่าเริ่มต้นเป็น customer
        profileImage: user.photoURL,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        emailVerified: true, // Google accounts are pre-verified
        provider: 'google',
        googleId: user.providerData[0]?.uid, // เก็บ Google User ID
        isNewUser: true, // ระบุว่าเป็นผู้ใช้ใหม่
        needsRoleSelection: true, // ต้องเลือกประเภทผู้ใช้
      });

      // สร้าง log สำหรับการสมัครผ่าน Google
      await createLog(
        user.uid,
        userEmail,
        user.displayName || "ผู้ใช้ Google",
        "REGISTER",
        `ผู้ใช้สมัครสมาชิกผ่าน Google: ${user.displayName || user.uid}`,
        { provider: 'google', googleId: user.providerData[0]?.uid, isNewUser: true }
      );
    } else {
      // สร้าง log สำหรับการเข้าสู่ระบบผ่าน Google
      await createLog(
        user.uid,
        user.email || `google_${user.uid}@planthub.local`,
        user.displayName || "ผู้ใช้ Google",
        "LOGIN",
        "ผู้ใช้เข้าสู่ระบบผ่าน Google",
        { provider: 'google', googleId: user.providerData[0]?.uid }
      );
    }

    return user;
  } catch (error) {
    // Handle specific Google errors
    throwFriendlyPopupError(error);
  }
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function fetchUserProfile(uid: string) {
  const profileRef = doc(firestore, USERS_COLLECTION, uid);
  const snapshot = await getDoc(profileRef);
  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();

  return {
    ...data,
    createdAt: data.createdAt?.toDate?.() ?? new Date(),
    updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
  } as UserProfile;
}

export async function updateEmailVerificationFlag(uid: string, verified: boolean) {
  const profileRef = doc(firestore, USERS_COLLECTION, uid);
  await setDoc(profileRef, {
    emailVerified: verified,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function signOutUser() {
  const currentUser = auth.currentUser;
  
  // สร้าง log ก่อนออกจากระบบ
  if (currentUser) {
    await createLog(
      currentUser.uid,
      currentUser.email || "",
      currentUser.displayName || "ผู้ใช้",
      "LOGOUT",
      "ผู้ใช้ออกจากระบบ",
      { emailVerified: currentUser.emailVerified }
    );
  }
  
  await signOut(auth);
}

export async function resendVerificationEmail(user: User) {
  await sendEmailVerification(user);
}

export async function cancelAccount(user: User) {
  await deleteUser(user);
}

export const createUserByAdmin = async (
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  role: AppUserRole
): Promise<{ uid: string; email: string }> => {
  // สร้างบัญชีผ่าน Firebase app ตัวที่สอง เพื่อไม่ให้แอดมินที่ล็อกอินอยู่ถูกสลับเป็นผู้ใช้ใหม่
  const secondaryAuth = getSecondaryAuth();

  try {
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const user = userCredential.user;

    // บันทึกข้อมูลในนามแอดมิน (firestore ผูกกับ auth หลัก) ตาม firestore.rules
    await setDoc(doc(firestore, "users", user.uid), {
      uid: user.uid,
      email: email,
      firstName: firstName,
      lastName: lastName,
      role: role,
      emailVerified: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: "admin", // ระบุว่าแอดมินเป็นคนสร้าง
    });

    // ส่งอีเมลยืนยัน
    await sendEmailVerification(user);

    // ส่งอีเมลตั้งรหัสผ่านใหม่ (เพื่อให้ผู้ใช้ตั้งรหัสผ่านเอง)
    await sendPasswordResetEmail(auth, email);

    // สร้าง log
    await createLog(
      user.uid,
      email,
      `${firstName} ${lastName}`,
      "USER_CREATED",
      `แอดมินสร้างผู้ใช้ใหม่: ${email} (${role})`,
      { role, createdBy: "admin" }
    );

    return { uid: user.uid, email };
  } catch (error) {
    console.error("Error creating user by admin:", error);
    throw error;
  } finally {
    await signOut(secondaryAuth);
  }
};

function getSecondaryAuth() {
  const appName = "admin-user-creation";
  const secondaryApp =
    getApps().find((app) => app.name === appName) ?? initializeApp(firebaseApp.options, appName);
  return getAuth(secondaryApp);
}

// Email verification functions
export async function sendEmailVerificationToUser(): Promise<void> {
  if (!auth.currentUser) {
    throw new Error("No user logged in");
  }

  if (auth.currentUser.emailVerified) {
    throw new Error("Email already verified");
  }

  await sendEmailVerification(auth.currentUser);
}

export async function cancelRegistration(): Promise<void> {
  if (!auth.currentUser) {
    throw new Error("No user logged in");
  }

  const uid = auth.currentUser.uid;
  
  try {
    // Delete user profile from Firestore
    await deleteDoc(doc(firestore, USERS_COLLECTION, uid));
    
    // Delete user from Firebase Auth
    await deleteUser(auth.currentUser);
    
    // Sign out the user
    await signOut(auth);
  } catch (error) {
    console.error('Error canceling registration:', error);
    throw new Error('เกิดข้อผิดพลาดในการยกเลิกการสมัครสมาชิก');
  }
}