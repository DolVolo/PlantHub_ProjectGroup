'use client';

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore";

import { firestore } from "@/lib/firebaseClient";

interface SellerOrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  costPrice?: number;
  sellerId?: string;
}

interface SellerOrder {
  id: string;
  total: number;
  status: string;
  status_th: string;
  paymentMethod: string;
  updatedAt: Date | null;
  items: SellerOrderItem[];
}

function statusToThai(status: string) {
  const dict: Record<string, string> = {
    pending: "รอจัดการ",
    awaiting_payment: "รอชำระเงิน",
    paid: "ชำระแล้ว",
    processing: "กำลังเตรียมสินค้า",
    shipping: "กำลังจัดส่ง",
    completed: "สำเร็จ",
    cancelled: "ยกเลิก",
    refunded: "คืนเงินแล้ว",
  };
  return dict[status] ?? status;
}

export function useSellerOrders(sellerId: string) {
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sellerId) {
      setOrders([]);
      setLoading(false);
      return;
    }

    const ordersRef = collection(firestore, "orders");
    const q = query(ordersRef, where("sellerIds", "array-contains", sellerId), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedOrders = snapshot.docs.map((docSnapshot) => {
          const data = docSnapshot.data();
          return {
            id: docSnapshot.id,
            total: data.total ?? 0,
            status: data.status ?? "pending",
            status_th: statusToThai(data.status ?? "pending"),
            paymentMethod: data.paymentMethod ?? "-",
            updatedAt: data.updatedAt?.toDate?.() ?? null,
            items: (data.items ?? []).filter((item: SellerOrderItem) => item.sellerId === sellerId),
          } satisfies SellerOrder;
        });
        setOrders(fetchedOrders);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError("ไม่สามารถดึงข้อมูลคำสั่งซื้อได้");
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [sellerId]);

  return { orders, loading, error };
}

