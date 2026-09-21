'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Users, 
  ArrowLeft,
  UserPlus,
  Mail,
  User,
  Shield
} from "lucide-react";

import { FirebaseError } from "firebase/app";

import { useAuthContext } from "../../../providers/AuthProvider";
import { createUserByAdmin } from "@/services/firebase/auth.service";
import { toast } from "react-hot-toast";

type UserForm = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'customer' | 'seller' | 'admin';
};

export default function AddUserPage() {
  const router = useRouter();
  const { profile } = useAuthContext();
  const [form, setForm] = useState<UserForm>({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    role: "customer",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!form.email || !form.password || !form.firstName || !form.lastName) {
      setError("กรุณากรอกข้อมูลให้ครบถ้วน");
      setLoading(false);
      return;
    }

    try {
      // สร้างผู้ใช้ผ่านฟังก์ชัน admin
      await createUserByAdmin(
        form.email,
        form.password,
        form.firstName,
        form.lastName,
        form.role
      );

      toast.success("เพิ่มผู้ใช้สำเร็จ! อีเมลยืนยันและลิงก์ตั้งรหัสผ่านถูกส่งไปยังผู้ใช้แล้ว");
      router.push("/admin/users");
    } catch (err) {
      console.error("Error adding user:", err);

      // แสดงข้อความ error ที่เป็นมิตร
      const code = err instanceof FirebaseError ? err.code : undefined;
      let errorMessage = "ไม่สามารถเพิ่มผู้ใช้ได้ กรุณาลองใหม่อีกครั้ง";
      if (code === "auth/email-already-in-use") {
        errorMessage = "อีเมลนี้ถูกใช้งานแล้ว";
      } else if (code === "auth/weak-password") {
        errorMessage = "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร";
      } else if (code === "auth/invalid-email") {
        errorMessage = "รูปแบบอีเมลไม่ถูกต้อง";
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (profile?.role !== "admin") {
    router.push("/");
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/admin/users")}
            className="flex items-center gap-2 text-slate-600 hover:text-emerald-700 transition p-2 rounded-lg hover:bg-emerald-50"
          >
            <ArrowLeft className="h-4 w-4" />
            กลับ
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">เพิ่มผู้ใช้ใหม่</h1>
            <p className="text-slate-600">สร้างบัญชีผู้ใช้ใหม่ในระบบ</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-8 max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <UserPlus className="h-6 w-6 text-emerald-600" />
            <h2 className="text-2xl font-bold text-slate-900">ข้อมูลผู้ใช้ใหม่</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 mb-2">
                  ชื่อ
                </label>
                <input
                  type="text"
                  id="firstName"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800"
                  placeholder="กรอกชื่อ"
                  required
                />
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-slate-700 mb-2">
                  นามสกุล
                </label>
                <input
                  type="text"
                  id="lastName"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800"
                  placeholder="กรอกนามสกุล"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                อีเมล
              </label>
              <input
                type="email"
                id="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800"
                placeholder="example@email.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                รหัสผ่าน
              </label>
              <input
                type="password"
                id="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800"
                placeholder="รหัสผ่านอย่างน้อย 6 ตัวอักษร"
                minLength={6}
                required
              />
            </div>


            <div>
              <label htmlFor="role" className="block text-sm font-medium text-slate-700 mb-2">
                ประเภทผู้ใช้
              </label>
              <select
                id="role"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as UserForm["role"] })}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800"
              >
                <option value="customer">ผู้ซื้อ</option>
                <option value="seller">ผู้ขาย</option>
                <option value="admin">แอดมิน</option>
              </select>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
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
                className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-lime-400 text-white rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? "กำลังเพิ่ม..." : "เพิ่มผู้ใช้"}
              </button>
            </div>
          </form>
        </div>
    </div>
  );
}
