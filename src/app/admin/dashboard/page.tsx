'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Users, 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  BarChart3,
  PieChart,
  Activity,
  LogOut,
  Settings,
  UserCheck,
  DollarSign,
  FileText
} from "lucide-react";

import { useAuthContext } from "../../providers/AuthProvider";
import { collection, onSnapshot } from "firebase/firestore";
import { ref, onValue } from "firebase/database";
import { firestore, realtimeDb } from "@/lib/firebaseClient";

type DashboardStats = {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  totalSales: number;
  newUsersToday: number;
  newProductsToday: number;
  ordersToday: number;
  salesToday: number;
};

const formatCurrency = (value: number) => {
  if (!Number.isFinite(value)) {
    return "฿0";
  }

  const absValue = Math.abs(value);

  if (absValue >= 1000) {
    const compact = new Intl.NumberFormat("th-TH", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
    return `฿${compact}`;
  }

  return `฿${new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: absValue % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value)}`;
};

export default function AdminDashboard() {
  const router = useRouter();
  const { profile, signOut } = useAuthContext();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalProducts: 0,
    totalOrders: 0,
    totalSales: 0,
    newUsersToday: 0,
    newProductsToday: 0,
    ordersToday: 0,
    salesToday: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ตรวจสอบสิทธิ์แอดมิน
    if (profile?.role !== "admin") {
      router.push("/");
      return;
    }

    // ดึงข้อมูลสถิติ
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // ดึงข้อมูลผู้ใช้
    const usersRef = collection(firestore, "users");
    const unsubscribeUsers = onSnapshot(usersRef, (snapshot) => {
      const users = snapshot.docs.map(doc => doc.data() as Record<string, unknown>);
      const newUsersToday = users.filter((user: Record<string, unknown>) => {
        const createdAt = (user.createdAt as { toDate?: () => Date } | undefined)?.toDate?.() || new Date(user.createdAt as string);
        return createdAt >= today;
      }).length;

      setStats(prev => ({
        ...prev,
        totalUsers: users.length,
        newUsersToday,
      }));
    });

    // ดึงข้อมูลสินค้า
    const productsRef = ref(realtimeDb, "products");
    const unsubscribeProducts = onValue(productsRef, (snapshot) => {
      const products = snapshot.val() || {};
      const productList = Object.values(products) as Array<{ createdAt?: number }>;
      const newProductsToday = productList.filter((product) => {
        const createdAt = new Date(product.createdAt ?? 0);
        return createdAt >= today;
      }).length;

      setStats(prev => ({
        ...prev,
        totalProducts: productList.length,
        newProductsToday,
      }));
    });

    // ดึงข้อมูลออเดอร์
    const ordersRef = collection(firestore, "orders");
    const unsubscribeOrders = onSnapshot(ordersRef, (snapshot) => {
      const orders = snapshot.docs.map(doc => doc.data() as Record<string, unknown>);
      const ordersToday = orders.filter((order: Record<string, unknown>) => {
        const createdAt = (order.createdAt as { toDate?: () => Date } | undefined)?.toDate?.() || new Date(order.createdAt as string);
        return createdAt >= today;
      });

      const totalSales = orders.reduce((sum: number, order: Record<string, unknown>) => sum + ((order.total as number) || 0), 0);
      const salesToday = ordersToday.reduce((sum: number, order: Record<string, unknown>) => sum + ((order.total as number) || 0), 0);

      setStats(prev => ({
        ...prev,
        totalOrders: orders.length,
        totalSales,
        ordersToday: ordersToday.length,
        salesToday,
      }));
    });

    setLoading(false);

    return () => {
      unsubscribeUsers();
      unsubscribeProducts();
      unsubscribeOrders();
    };
  }, [profile, router]);

  const handleLogout = async () => {
    await signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
  <div className="mx-auto w-full max-w-6xl px-4 pb-16 space-y-8">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-6 sm:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              แผงควบคุมผู้ดูแลระบบ
            </span>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Admin Dashboard</h1>
            <p className="text-sm text-slate-600 sm:text-base">
              ภาพรวมระบบ PlantHub แบบเรียลไทม์ พร้อมเครื่องมือดูแลระบบครบถ้วนในที่เดียว
            </p>
          </div>
          <div className="flex w-full flex-col gap-4 sm:flex-row md:w-auto md:items-center">
            <div className="flex-1 rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 sm:flex-none sm:min-w-[220px]">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">ยินดีต้อนรับ</p>
              <p className="text-base font-semibold text-slate-900">
                {profile ? `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim() || "ผู้ดูแลระบบ" : "ผู้ดูแลระบบ"}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-lime-400 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:shadow-md sm:w-auto"
            >
              <LogOut className="h-4 w-4" />
              ออกจากระบบ
            </button>
          </div>
        </div>
      </div>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">ผู้ใช้ทั้งหมด</p>
              <p className="text-3xl font-bold text-slate-800">{stats.totalUsers.toLocaleString()}</p>
              <p className="text-xs text-emerald-600 mt-1">+{stats.newUsersToday} วันนี้</p>
            </div>
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">สินค้าทั้งหมด</p>
              <p className="text-3xl font-bold text-slate-800">{stats.totalProducts.toLocaleString()}</p>
              <p className="text-xs text-emerald-600 mt-1">+{stats.newProductsToday} วันนี้</p>
            </div>
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100">
              <Package className="h-8 w-8 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">ออเดอร์ทั้งหมด</p>
              <p className="text-3xl font-bold text-slate-800">{stats.totalOrders.toLocaleString()}</p>
              <p className="text-xs text-emerald-600 mt-1">+{stats.ordersToday} วันนี้</p>
            </div>
            <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100">
              <ShoppingCart className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">ยอดขายรวม</p>
              <p className="text-3xl font-bold text-slate-800 break-words">{formatCurrency(stats.totalSales)}</p>
              <p className="text-xs text-emerald-600 mt-1 break-words">{formatCurrency(stats.salesToday)} วันนี้</p>
            </div>
            <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100">
              <DollarSign className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-6 hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-50">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            จัดการผู้ใช้
          </h3>
          <div className="space-y-3">
            <button 
              onClick={() => router.push("/admin/users")}
              className="w-full text-left p-3 rounded-xl hover:bg-blue-50 transition group"
            >
              <div className="flex items-center gap-3">
                <UserCheck className="h-5 w-5 text-blue-600 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium">ดูผู้ใช้ทั้งหมด</span>
              </div>
            </button>
            <button 
              onClick={() => router.push("/admin/users/add")}
              className="w-full text-left p-3 rounded-xl hover:bg-emerald-50 transition group"
            >
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-emerald-600 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium">เพิ่มผู้ใช้ใหม่</span>
              </div>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-6 hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-50">
              <Package className="h-5 w-5 text-emerald-600" />
            </div>
            จัดการสินค้า
          </h3>
          <div className="space-y-3">
            <button 
              onClick={() => router.push("/admin/products")}
              className="w-full text-left p-3 rounded-xl hover:bg-purple-50 transition group"
            >
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-purple-600 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium">ดูสินค้าทั้งหมด</span>
              </div>
            </button>
            <button 
              onClick={() => router.push("/admin/top-products")}
              className="w-full text-left p-3 rounded-xl hover:bg-emerald-50 transition group"
            >
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-emerald-600 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium">สินค้าขายดี</span>
              </div>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-6 hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <div className="p-2 rounded-lg bg-orange-50">
              <ShoppingCart className="h-5 w-5 text-orange-600" />
            </div>
            จัดการออเดอร์
          </h3>
          <div className="space-y-3">
            <button 
              onClick={() => router.push("/admin/orders")}
              className="w-full text-left p-3 rounded-xl hover:bg-orange-50 transition group"
            >
              <div className="flex items-center gap-3">
                <ShoppingCart className="h-5 w-5 text-orange-600 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium">ดูออเดอร์ทั้งหมด</span>
              </div>
            </button>
            <button 
              onClick={() => router.push("/admin/pending-orders")}
              className="w-full text-left p-3 rounded-xl hover:bg-red-50 transition group"
            >
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-red-600 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium">ออเดอร์ที่รอการอนุมัติ</span>
              </div>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-6 hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <div className="p-2 rounded-lg bg-slate-50">
              <Settings className="h-5 w-5 text-slate-600" />
            </div>
            ระบบ & ตั้งค่า
          </h3>
          <div className="space-y-3">
            <button 
              onClick={() => router.push("/admin/logs")}
              className="w-full text-left p-3 rounded-xl hover:bg-slate-50 transition group"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-slate-600 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium">ดู Log ทั้งหมด</span>
              </div>
            </button>
            <button 
              onClick={() => router.push("/admin/settings")}
              className="w-full text-left p-3 rounded-xl hover:bg-gray-50 transition group"
            >
              <div className="flex items-center gap-3">
                <Settings className="h-5 w-5 text-gray-600 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium">การตั้งค่าระบบ</span>
              </div>
            </button>
          </div>
        </div>
        </div>

      {/* Charts Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-50">
                <BarChart3 className="h-5 w-5 text-emerald-600" />
              </div>
              ยอดขายรายเดือน
            </h3>
            <Link 
              href="/admin/top-products"
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              ดูรายละเอียด →
            </Link>
          </div>
          <div className="h-64 flex items-center justify-center bg-gradient-to-br from-emerald-50 to-lime-50 rounded-xl border border-emerald-100">
            <div className="text-center text-slate-500">
              <BarChart3 className="h-16 w-16 mx-auto mb-4 text-emerald-400" />
              <p className="font-medium">กราฟยอดขาย (กำลังพัฒนา)</p>
              <p className="text-xs text-slate-400 mt-2">จะเพิ่มกราฟแบบ Interactive ในอนาคต</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <div className="p-2 rounded-lg bg-purple-50">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              สินค้าขายดี 5 อันดับ
            </h3>
            <Link 
              href="/admin/top-products"
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              ดูทั้งหมด →
            </Link>
          </div>
          <div className="h-64 flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-100">
            <div className="text-center text-slate-500">
              <TrendingUp className="h-16 w-16 mx-auto mb-4 text-purple-400" />
              <p className="font-medium">รายการสินค้าขายดี (กำลังพัฒนา)</p>
              <p className="text-xs text-slate-400 mt-2">จะแสดง Top 5 สินค้าขายดี</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
