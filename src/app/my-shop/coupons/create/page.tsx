'use client';

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

import { useAuthContext } from "../../../providers/AuthProvider";
import { firestore } from "@/lib/firebaseClient";

interface CouponForm {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: string;
  minPurchase: string;
  maxUses: string;
  validFrom: string;
  validUntil: string;
}

const defaultForm: CouponForm = {
  code: "",
  discountType: "percentage",
  discountValue: "",
  minPurchase: "",
  maxUses: "",
  validFrom: "",
  validUntil: "",
};

export default function CreateCouponPage() {
  const router = useRouter();
  const { profile } = useAuthContext();
  const [form, setForm] = useState<CouponForm>(defaultForm);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field: keyof CouponForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const discountValue = Number(form.discountValue);
      const minPurchase = Number(form.minPurchase);
      const maxUses = Number(form.maxUses);

      if (Number.isNaN(discountValue) || Number.isNaN(minPurchase) || Number.isNaN(maxUses)) {
        alert("กรุณากรอกตัวเลขให้ถูกต้อง");
        setSubmitting(false);
        return;
      }

      if (discountValue <= 0 || minPurchase < 0 || maxUses <= 0) {
        alert("กรุณากรอกค่าที่มากกว่า 0");
        setSubmitting(false);
        return;
      }

      if (form.discountType === 'percentage' && discountValue > 100) {
        alert("ส่วนลดเปอร์เซ็นต์ไม่สามารถเกิน 100%");
        setSubmitting(false);
        return;
      }

      const validFrom = new Date(form.validFrom);
      const validUntil = new Date(form.validUntil);

      if (validUntil <= validFrom) {
        alert("วันหมดอายุต้องมากกว่าวันเริ่มต้น");
        setSubmitting(false);
        return;
      }

      await addDoc(collection(firestore, "coupons"), {
        code: form.code.trim().toUpperCase(),
        discountType: form.discountType,
        discountValue,
        minPurchase,
        maxUses,
        usedCount: 0,
        validFrom,
        validUntil,
        isActive: true,
        sellerId: profile?.uid,
        createdAt: serverTimestamp(),
      });

      alert("สร้างคูปองเรียบร้อยแล้ว");
      router.push("/my-shop/coupons");
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "ไม่สามารถสร้างคูปองได้");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-emerald-50">
      <div className="mx-auto w-full max-w-3xl px-4 py-12">
        <div className="mb-6">
          <Link
            href="/my-shop/coupons"
            className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 transition hover:text-emerald-700"
          >
            <ArrowLeft className="h-4 w-4" /> กลับไปจัดการคูปอง
          </Link>
        </div>

        <header className="mb-8">
          <h1 className="text-3xl font-bold text-emerald-800">สร้างคูปองใหม่</h1>
          <p className="mt-2 text-sm text-slate-600">กรอกข้อมูลคูปองส่วนลดสำหรับลูกค้า</p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-emerald-100 bg-white p-8 shadow-lg space-y-6"
        >
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="code" className="text-sm font-medium text-emerald-700">
                รหัสคูปอง *
              </label>
              <input
                id="code"
                type="text"
                required
                value={form.code}
                onChange={(event) => handleChange("code", event.target.value.toUpperCase())}
                placeholder="เช่น SAVE50"
                className="w-full rounded-xl border border-emerald-200 px-4 py-3 text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="discountType" className="text-sm font-medium text-emerald-700">
                ประเภทส่วนลด *
              </label>
              <select
                id="discountType"
                value={form.discountType}
                onChange={(event) => handleChange("discountType", event.target.value as 'percentage' | 'fixed')}
                className="w-full rounded-xl border border-emerald-200 px-4 py-3 text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
              >
                <option value="percentage">เปอร์เซ็นต์ (%)</option>
                <option value="fixed">จำนวนเงิน (฿)</option>
              </select>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="discountValue" className="text-sm font-medium text-emerald-700">
                {form.discountType === 'percentage' ? 'เปอร์เซ็นต์ส่วนลด (%)' : 'จำนวนเงินส่วนลด (฿)'} *
              </label>
              <input
                id="discountValue"
                type="number"
                min="0"
                max={form.discountType === 'percentage' ? 100 : undefined}
                required
                value={form.discountValue}
                onChange={(event) => handleChange("discountValue", event.target.value)}
                placeholder={form.discountType === 'percentage' ? "เช่น 20" : "เช่น 100"}
                className="w-full rounded-xl border border-emerald-200 px-4 py-3 text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="minPurchase" className="text-sm font-medium text-emerald-700">
                ยอดซื้อขั้นต่ำ (฿) *
              </label>
              <input
                id="minPurchase"
                type="number"
                min="0"
                required
                value={form.minPurchase}
                onChange={(event) => handleChange("minPurchase", event.target.value)}
                placeholder="เช่น 500"
                className="w-full rounded-xl border border-emerald-200 px-4 py-3 text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
              />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="maxUses" className="text-sm font-medium text-emerald-700">
                จำนวนสิทธิ์สูงสุด *
              </label>
              <input
                id="maxUses"
                type="number"
                min="1"
                required
                value={form.maxUses}
                onChange={(event) => handleChange("maxUses", event.target.value)}
                placeholder="เช่น 100"
                className="w-full rounded-xl border border-emerald-200 px-4 py-3 text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="validFrom" className="text-sm font-medium text-emerald-700">
                วันที่เริ่มต้น *
              </label>
              <input
                id="validFrom"
                type="date"
                required
                value={form.validFrom}
                onChange={(event) => handleChange("validFrom", event.target.value)}
                className="w-full rounded-xl border border-emerald-200 px-4 py-3 text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="validUntil" className="text-sm font-medium text-emerald-700">
              วันที่หมดอายุ *
            </label>
            <input
              id="validUntil"
              type="date"
              required
              value={form.validUntil}
              onChange={(event) => handleChange("validUntil", event.target.value)}
              className="w-full rounded-xl border border-emerald-200 px-4 py-3 text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-6">
            <Link
              href="/my-shop/coupons"
              className="rounded-full border border-slate-300 px-6 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
              ยกเลิก
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-emerald-500 to-lime-400 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:brightness-110 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {submitting ? "กำลังสร้าง..." : "สร้างคูปอง"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

