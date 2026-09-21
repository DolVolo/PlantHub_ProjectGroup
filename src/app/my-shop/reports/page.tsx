'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BarChart3, TrendingUp, Package, DollarSign } from "lucide-react";
import { collection, query, where, onSnapshot } from "firebase/firestore";

import { useAuthContext } from "../../providers/AuthProvider";
import { firestore } from "@/lib/firebaseClient";
import type { OrderItemSnapshot } from "@/services/firebase/orders.service";

type SalesReport = {
  totalSales: number;
  totalOrders: number;
  totalProfit: number;
  averageOrderValue: number;
  topProducts: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
};

export default function ReportsPage() {
  const router = useRouter();
  const { profile, initializing } = useAuthContext();
  const [report, setReport] = useState<SalesReport>({
    totalSales: 0,
    totalOrders: 0,
    totalProfit: 0,
    averageOrderValue: 0,
    topProducts: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (initializing) return;

    if (!profile) {
      router.push("/login");
      return;
    }

    const ordersRef = collection(firestore, "orders");
    const q = query(ordersRef, where("sellerIds", "array-contains", profile.uid));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(doc => doc.data());
      
      // Calculate sales metrics
      const totalSales = orders.reduce((sum, order) => sum + (order.total || 0), 0);
      const totalOrders = orders.length;
      const totalProfit = totalSales * 0.3; // Assume 30% profit margin
      const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

      // Calculate top products
      const productStats: Record<string, { name: string; quantity: number; revenue: number }> = {};
      
      orders.forEach(order => {
        if (order.items) {
          order.items.forEach((item: OrderItemSnapshot) => {
            if (productStats[item.productId]) {
              productStats[item.productId].quantity += item.quantity;
              productStats[item.productId].revenue += item.price * item.quantity;
            } else {
              productStats[item.productId] = {
                name: item.name,
                quantity: item.quantity,
                revenue: item.price * item.quantity,
              };
            }
          });
        }
      });

      const topProducts = Object.values(productStats)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      setReport({
        totalSales,
        totalOrders,
        totalProfit,
        averageOrderValue,
        topProducts,
      });
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [initializing, profile, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-emerald-50">
      <div className="mx-auto w-full max-w-6xl px-4 py-12">
        <div className="mb-6">
          <Link
            href="/my-shop"
            className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 transition hover:text-emerald-700"
          >
            <ArrowLeft className="h-4 w-4" /> กลับไปร้านของฉัน
          </Link>
        </div>

        <header className="flex flex-col gap-4 border-b border-emerald-100 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-emerald-800">รายงานการขาย</h1>
            <p className="mt-1 text-sm text-slate-600">วิเคราะห์ยอดขาย กำไร และสินค้าขายดี</p>
          </div>
        </header>

        {/* Key Metrics */}
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-emerald-100 p-3">
                <TrendingUp className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">ยอดขายรวม</p>
                <p className="text-2xl font-bold text-emerald-800">
                  ฿{report.totalSales.toLocaleString('th-TH')}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-3">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">กำไรสุทธิ</p>
                <p className="text-2xl font-bold text-blue-800">
                  ฿{report.totalProfit.toLocaleString('th-TH')}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-purple-100 p-3">
                <Package className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">ออเดอร์ทั้งหมด</p>
                <p className="text-2xl font-bold text-purple-800">{report.totalOrders}</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-orange-100 p-3">
                <DollarSign className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">ยอดเฉลี่ยต่อออเดอร์</p>
                <p className="text-2xl font-bold text-orange-800">
                  ฿{report.averageOrderValue.toLocaleString('th-TH')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Top Products */}
        <div className="mt-8 rounded-3xl border border-emerald-100 bg-white p-8 shadow-lg">
          <h2 className="text-xl font-semibold text-emerald-800 mb-6">สินค้าขายดี</h2>
          
          {report.topProducts.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">ยังไม่มีข้อมูลการขาย</p>
              <p className="text-sm text-slate-500 mt-2">เมื่อมีออเดอร์ สินค้าขายดีจะแสดงที่นี่</p>
            </div>
          ) : (
            <div className="space-y-4">
              {report.topProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between p-4 rounded-xl border border-emerald-100 bg-emerald-50">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="font-semibold text-emerald-800">{product.name}</h3>
                      <p className="text-sm text-slate-500">ขายได้ {product.quantity} ชิ้น</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-emerald-600">
                      ฿{product.revenue.toLocaleString('th-TH')}
                    </p>
                    <p className="text-sm text-slate-500">รายได้</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sales Chart Placeholder */}
        <div className="mt-8 rounded-3xl border border-emerald-100 bg-white p-8 shadow-lg">
          <h2 className="text-xl font-semibold text-emerald-800 mb-6">กราฟยอดขาย</h2>
          <div className="flex items-center justify-center h-64 bg-slate-50 rounded-xl">
            <div className="text-center">
              <BarChart3 className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">กราฟยอดขายจะแสดงที่นี่</p>
              <p className="text-sm text-slate-500 mt-2">ฟีเจอร์นี้จะพัฒนาในอนาคต</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

