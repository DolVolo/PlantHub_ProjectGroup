'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Send, User } from "lucide-react";
import { FirebaseError } from "firebase/app";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebaseClient";
import { toast } from "react-hot-toast";

export default function SendPasswordResetPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!email.trim()) {
      setError("กรุณากรอกอีเมล");
      setLoading(false);
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      toast.success(`ส่งอีเมลตั้งรหัสผ่านไปยัง ${email} แล้ว`);
      setEmail("");
    } catch (err) {
      console.error("Error sending password reset email:", err);
      const code = err instanceof FirebaseError ? err.code : undefined;
      let errorMessage = "ไม่สามารถส่งอีเมลได้";
      if (code === "auth/user-not-found") {
        errorMessage = "ไม่พบผู้ใช้ที่ใช้อีเมลนี้";
      } else if (code === "auth/invalid-email") {
        errorMessage = "รูปแบบอีเมลไม่ถูกต้อง";
      }
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-8">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-emerald-700 p-2 rounded-lg hover:bg-emerald-50"
          >
            <ArrowLeft className="h-4 w-4" />
            กลับ
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">ส่งอีเมลตั้งรหัสผ่าน</h1>
            <p className="text-slate-600">ส่งลิงก์ตั้งรหัสผ่านใหม่ให้ผู้ใช้</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-8 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-emerald-50">
            <Mail className="h-6 w-6 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">ข้อมูลผู้ใช้</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
              อีเมลผู้ใช้
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800"
                placeholder="user@example.com"
                required
              />
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.push("/admin/users")}
              className="flex-1 px-6 py-3 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-lime-400 text-white rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  กำลังส่ง...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  ส่งอีเมล
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <h3 className="text-sm font-medium text-blue-800 mb-2">คำแนะนำ:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• ผู้ใช้จะได้รับอีเมลที่มีลิงก์ตั้งรหัสผ่านใหม่</li>
            <li>• ลิงก์จะหมดอายุใน 1 ชั่วโมง</li>
            <li>• ผู้ใช้สามารถคลิกลิงก์เพื่อตั้งรหัสผ่านใหม่ได้</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
