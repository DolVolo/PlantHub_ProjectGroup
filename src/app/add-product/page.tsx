'use client';

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { push, ref, set } from "firebase/database";
import { toast } from "react-hot-toast";
import { ArrowLeft } from "lucide-react";

import { useAuthContext } from "../providers/AuthProvider";
import { realtimeDb } from "@/lib/firebaseClient";

interface ProductForm {
  imageUrl: string;
  name: string;
  description: string;
  stock: string;
  price: string;
  cost: string;
  category: string;
}

const categories = [
  { value: "indoor", label: "ต้นไม้ในร่ม" },
  { value: "outdoor", label: "ต้นไม้กลางแจ้ง" },
  { value: "flowers", label: "ดอกไม้" },
  { value: "herbs", label: "ผักสวนครัว" },
  { value: "succulents", label: "ไม้อวบน้ำ" },
];

const defaultForm: ProductForm = {
  imageUrl: "",
  name: "",
  description: "",
  stock: "0",
  price: "0",
  cost: "0",
  category: "indoor",
};

export default function AddProductPage() {
  const router = useRouter();
  const { profile } = useAuthContext();
  const [form, setForm] = useState<ProductForm>(defaultForm);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field: keyof ProductForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const stockValue = Number(form.stock);
      const priceValue = Number(form.price);
      const costValue = Number(form.cost);

      if (Number.isNaN(stockValue) || Number.isNaN(priceValue) || Number.isNaN(costValue)) {
        toast.error("กรุณากรอกจำนวน ราคา และต้นทุนเป็นตัวเลข");
        setSubmitting(false);
        return;
      }

      const productRef = push(ref(realtimeDb, "products"));
      await set(productRef, {
        imageUrl: form.imageUrl.trim(),
        name: form.name.trim(),
        description: form.description.trim(),
        stock: stockValue,
        price: priceValue,
        cost: costValue,
        category: form.category,
        sellerId: profile?.uid ?? "guest",
        active: true,
        createdAt: Date.now(),
      });

      toast.success("บันทึกสินค้าเรียบร้อยแล้ว");
      setForm(defaultForm);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "ไม่สามารถบันทึกสินค้าได้");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-emerald-50">
      <div className="mx-auto w-full max-w-3xl px-4 py-12">
        <div className="mb-6">
          <Link
            href="/my-shop"
            className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 transition hover:text-emerald-700"
          >
            <ArrowLeft className="h-4 w-4" /> กลับไปร้านของฉัน
          </Link>
        </div>
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-emerald-800">เพิ่มสินค้าใหม่</h1>
          <p className="mt-2 text-sm text-slate-600">กรอกข้อมูลและบันทึกสินค้าเข้าสู่ร้านของคุณ</p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-emerald-100 bg-white p-8 shadow-lg space-y-5"
        >
          <div className="space-y-2">
            <label htmlFor="imageUrl" className="text-sm font-medium text-emerald-700">
              URL รูปภาพสินค้า
            </label>
            <input
              id="imageUrl"
              type="url"
              required
              placeholder="https://..."
              value={form.imageUrl}
              onChange={(event) => handleChange("imageUrl", event.target.value)}
              className="w-full rounded-xl border border-emerald-200 px-4 py-3 text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium text-emerald-700">
              ชื่อสินค้า
            </label>
            <input
              id="name"
              required
              value={form.name}
              onChange={(event) => handleChange("name", event.target.value)}
              className="w-full rounded-xl border border-emerald-200 px-4 py-3 text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium text-emerald-700">
              รายละเอียดสินค้า
            </label>
            <textarea
              id="description"
              rows={4}
              required
              value={form.description}
              onChange={(event) => handleChange("description", event.target.value)}
              className="w-full rounded-xl border border-emerald-200 px-4 py-3 text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="category" className="text-sm font-medium text-emerald-700">
              หมวดหมู่สินค้า
            </label>
            <select
              id="category"
              required
              value={form.category}
              onChange={(event) => handleChange("category", event.target.value)}
              className="w-full rounded-xl border border-emerald-200 px-4 py-3 text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 bg-white"
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              เลือกหมวดหมู่ที่เหมาะสมเพื่อช่วยให้ลูกค้าค้นหาสินค้าได้ง่ายขึ้น
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <label htmlFor="stock" className="text-sm font-medium text-emerald-700">
                จำนวนคงเหลือ (ชิ้น)
              </label>
              <input
                id="stock"
                type="number"
                min={0}
                required
                value={form.stock}
                onChange={(event) => handleChange("stock", event.target.value)}
                className="w-full rounded-xl border border-emerald-200 px-4 py-3 text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="cost" className="text-sm font-medium text-emerald-700">
                ต้นทุน (บาท)
              </label>
              <input
                id="cost"
                type="number"
                min={0}
                step="0.01"
                required
                value={form.cost}
                onChange={(event) => handleChange("cost", event.target.value)}
                className="w-full rounded-xl border border-emerald-200 px-4 py-3 text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="price" className="text-sm font-medium text-emerald-700">
                ราคาขาย (บาท)
              </label>
              <input
                id="price"
                type="number"
                min={0}
                step="0.01"
                required
                value={form.price}
                onChange={(event) => handleChange("price", event.target.value)}
                className="w-full rounded-xl border border-emerald-200 px-4 py-3 text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              className="rounded-full border border-slate-300 px-6 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
              onClick={() => setForm(defaultForm)}
              disabled={submitting}
            >
              ล้างข้อมูล
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-emerald-500 to-lime-400 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:brightness-110 disabled:opacity-60"
            >
              {submitting ? "กำลังบันทึก..." : "บันทึกสินค้า"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

