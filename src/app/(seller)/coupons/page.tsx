'use client';

import { useEffect, useState } from "react";
import { format } from "date-fns";

import { useAuthContext } from "../../providers/AuthProvider";
import {
  createCoupon,
  fetchCouponsBySeller,
  updateCoupon,
  type CouponInput,
  type CouponRecord,
} from "../../../services/firebase/coupons.service";

interface CouponFormState extends Omit<CouponInput, "startDate" | "endDate"> {
  startDate?: string;
  endDate?: string;
  maxRedemptions?: number | null;
  minOrderAmount?: number | null;
  discountType: "percent" | "amount";
}

const defaultForm: CouponFormState = {
  code: "",
  description: "",
  discountPercent: 10,
  discountAmount: undefined,
  startDate: "",
  endDate: "",
  maxRedemptions: null,
  minOrderAmount: null,
  sellerId: null,
  discountType: "percent",
};

export default function SellerCouponsPage() {
  const { profile } = useAuthContext();
  const [coupons, setCoupons] = useState<CouponRecord[]>([]);
  const [form, setForm] = useState<CouponFormState>(defaultForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.uid) return;
    const load = async () => {
      setLoading(true);
      try {
        const result = await fetchCouponsBySeller(profile.uid);
        setCoupons(result);
      } catch (err) {
        setError("ไม่สามารถดึงข้อมูลคูปองได้");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [profile?.uid]);

  const handleChange = <K extends keyof CouponFormState>(field: K, value: CouponFormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile?.uid) return;

    setError(null);
    setSuccess(null);

    try {
      const payload: CouponInput = {
        code: form.code,
        description: form.description,
        discountPercent: form.discountType === "percent" ? Number(form.discountPercent) : undefined,
        discountAmount: form.discountType === "amount" ? Number(form.discountAmount) : undefined,
        startDate: form.startDate ? new Date(form.startDate) : null,
        endDate: form.endDate ? new Date(form.endDate) : null,
        maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : null,
        minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : null,
        sellerId: profile.uid,
      };

      await createCoupon(profile.uid, payload);
      setSuccess("สร้างคูปองเรียบร้อยแล้ว");
      setForm(defaultForm);
      const result = await fetchCouponsBySeller(profile.uid);
      setCoupons(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "สร้างคูปองไม่สำเร็จ");
    }
  };

  const toggleActive = async (couponId: string, active: boolean) => {
    try {
      await updateCoupon(couponId, { active });
      if (profile?.uid) {
        const result = await fetchCouponsBySeller(profile.uid);
        setCoupons(result);
      }
    } catch (err) {
      setError("ไม่สามารถอัปเดตสถานะคูปองได้");
    }
  };

  return (
    <div className="min-h-screen bg-emerald-50/60 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4">
        <div>
          <h1 className="text-3xl font-bold text-emerald-800">จัดการคูปอง</h1>
          <p className="mt-1 text-sm text-slate-600">สร้างและควบคุมโปรโมชั่นสำหรับลูกค้าของคุณ</p>
        </div>

        <section className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-emerald-800">สร้างคูปองใหม่</h2>

          <form onSubmit={handleSubmit} className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              รหัสคูปอง
              <input
                value={form.code}
                onChange={(event) => handleChange("code", event.target.value)}
                required
                className="rounded-xl border border-emerald-200 px-4 py-3 text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-600">
              รายละเอียด
              <input
                value={form.description}
                onChange={(event) => handleChange("description", event.target.value)}
                className="rounded-xl border border-emerald-200 px-4 py-3 text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
              />
            </label>

            <div className="flex flex-col gap-2 text-sm text-slate-600">
              ประเภทส่วนลด
              <div className="flex gap-4">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="discountType"
                    value="percent"
                    checked={form.discountType === "percent"}
                    onChange={() => handleChange("discountType", "percent")}
                  />
                  เปอร์เซ็นต์ (%)
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="discountType"
                    value="amount"
                    checked={form.discountType === "amount"}
                    onChange={() => handleChange("discountType", "amount")}
                  />
                  จำนวนเงิน (บาท)
                </label>
              </div>
            </div>

            {form.discountType === "percent" ? (
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                ส่วนลด (%)
                <input
                  type="number"
                  value={form.discountPercent}
                  min={1}
                  max={100}
                  onChange={(event) => handleChange("discountPercent", Number(event.target.value))}
                  className="rounded-xl border border-emerald-200 px-4 py-3 text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                />
              </label>
            ) : (
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                ส่วนลด (บาท)
                <input
                  type="number"
                  value={form.discountAmount ?? 0}
                  min={1}
                  onChange={(event) => handleChange("discountAmount", Number(event.target.value))}
                  className="rounded-xl border border-emerald-200 px-4 py-3 text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                />
              </label>
            )}

            <label className="flex flex-col gap-2 text-sm text-slate-600">
              ยอดสั่งซื้อขั้นต่ำ (บาท)
              <input
                type="number"
                value={form.minOrderAmount ?? ""}
                onChange={(event) => handleChange("minOrderAmount", event.target.value ? Number(event.target.value) : null)}
                className="rounded-xl border border-emerald-200 px-4 py-3 text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-600">
              จำกัดจำนวนสิทธิ์
              <input
                type="number"
                value={form.maxRedemptions ?? ""}
                onChange={(event) => handleChange("maxRedemptions", event.target.value ? Number(event.target.value) : null)}
                className="rounded-xl border border-emerald-200 px-4 py-3 text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-600">
              วันที่เริ่มใช้
              <input
                type="date"
                value={form.startDate ?? ""}
                onChange={(event) => handleChange("startDate", event.target.value)}
                className="rounded-xl border border-emerald-200 px-4 py-3 text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-600">
              วันที่สิ้นสุด
              <input
                type="date"
                value={form.endDate ?? ""}
                onChange={(event) => handleChange("endDate", event.target.value)}
                className="rounded-xl border border-emerald-200 px-4 py-3 text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
              />
            </label>

            {error && <p className="md:col-span-2 text-sm text-rose-500">{error}</p>}
            {success && <p className="md:col-span-2 text-sm text-emerald-600">{success}</p>}

            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-emerald-500 to-lime-400 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:brightness-110"
              >
                สร้างคูปอง
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-emerald-800">รายการคูปองของฉัน</h2>

          {loading ? (
            <div className="flex h-36 items-center justify-center text-emerald-600">กำลังโหลดข้อมูล...</div>
          ) : coupons.length === 0 ? (
            <div className="flex h-36 items-center justify-center text-slate-500">ยังไม่มีคูปอง</div>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full divide-y divide-emerald-100 text-sm">
                <thead className="bg-emerald-50/70 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-left">รหัส</th>
                    <th className="px-4 py-3 text-left">ส่วนลด</th>
                    <th className="px-4 py-3 text-left">ยอดขั้นต่ำ</th>
                    <th className="px-4 py-3 text-left">ระยะเวลา</th>
                    <th className="px-4 py-3 text-left">ใช้ไปแล้ว</th>
                    <th className="px-4 py-3 text-left">สถานะ</th>
                    <th className="px-4 py-3 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-100 text-slate-600">
                  {coupons.map((coupon) => (
                    <tr key={coupon.id}>
                      <td className="px-4 py-3 font-semibold text-emerald-700">{coupon.code}</td>
                      <td className="px-4 py-3">
                        {coupon.discountPercent
                          ? `${coupon.discountPercent}%`
                          : `฿${coupon.discountAmount?.toLocaleString("th-TH")}`}
                      </td>
                      <td className="px-4 py-3">
                        {coupon.minOrderAmount
                          ? `฿${coupon.minOrderAmount.toLocaleString("th-TH")}`
                          : "–"}
                      </td>
                      <td className="px-4 py-3">
                        {coupon.startDate ? format(coupon.startDate.toDate(), "dd/MM/yyyy") : "-"} –
                        {coupon.endDate ? format(coupon.endDate.toDate(), "dd/MM/yyyy") : "ไม่จำกัด"}
                      </td>
                      <td className="px-4 py-3">
                        {coupon.currentRedemptions ?? 0}
                        {coupon.maxRedemptions ? ` / ${coupon.maxRedemptions}` : ""}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${coupon.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}
                        >
                          {coupon.active ? "ใช้งาน" : "ปิดใช้งาน"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          className="text-sm font-medium text-emerald-600 transition hover:text-emerald-700"
                          onClick={() => toggleActive(coupon.id, !coupon.active)}
                        >
                          {coupon.active ? "ปิด" : "เปิด"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}


