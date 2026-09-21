import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
  runTransaction,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";

import { firestore } from "../../lib/firebaseClient";

export interface CouponInput {
  code: string;
  description?: string;
  discountPercent?: number;
  discountAmount?: number;
  startDate?: Date | null;
  endDate?: Date | null;
  maxRedemptions?: number | null;
  minOrderAmount?: number | null;
  sellerId?: string | null;
}

export interface CouponRecord {
  id: string;
  code: string;
  description?: string;
  discountPercent?: number | null;
  discountAmount?: number | null;
  startDate?: Timestamp | null;
  endDate?: Timestamp | null;
  maxRedemptions?: number | null;
  currentRedemptions?: number;
  minOrderAmount?: number | null;
  sellerId?: string | null;
  active?: boolean;
}

export async function fetchCouponsBySeller(sellerId: string): Promise<CouponRecord[]> {
  const couponsRef = collection(firestore, "coupons");
  const q = query(couponsRef, where("sellerId", "==", sellerId));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnapshot) => ({
    id: docSnapshot.id,
    ...docSnapshot.data(),
  }) as CouponRecord);
}

export async function createCoupon(sellerId: string, data: CouponInput) {
  const couponsRef = collection(firestore, "coupons");

  await addDoc(couponsRef, {
    code: data.code.toUpperCase(),
    description: data.description ?? "",
    discountPercent: data.discountPercent ?? null,
    discountAmount: data.discountAmount ?? null,
    startDate: data.startDate ? data.startDate : null,
    endDate: data.endDate ? data.endDate : null,
    maxRedemptions: data.maxRedemptions ?? null,
    currentRedemptions: 0,
    minOrderAmount: data.minOrderAmount ?? null,
    sellerId,
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateCoupon(couponId: string, data: Partial<CouponInput> & { active?: boolean }) {
  const couponRef = doc(firestore, "coupons", couponId);
  await updateDoc(couponRef, {
    ...data,
    code: data.code ? data.code.toUpperCase() : undefined,
    updatedAt: serverTimestamp(),
  });
}

export async function redeemCoupon(code: string) {
  return await runTransaction(firestore, async (transaction) => {
    const couponsRef = collection(firestore, "coupons");
    const q = query(couponsRef, where("code", "==", code.toUpperCase()), where("active", "==", true));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      throw new Error("ไม่พบคูปองนี้ หรือคูปองถูกปิดใช้งานแล้ว");
    }

    const couponDoc = snapshot.docs[0];
    const couponData = couponDoc.data();

    const max = couponData.maxRedemptions;
    const current = couponData.currentRedemptions ?? 0;

    if (max && current >= max) {
      throw new Error("คูปองนี้ถูกใช้ครบจำนวนแล้ว");
    }

    transaction.update(couponDoc.ref, {
      currentRedemptions: current + 1,
      updatedAt: serverTimestamp(),
    });

    return {
      id: couponDoc.id,
      ...couponData,
    };
  });
}

