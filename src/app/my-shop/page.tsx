'use client';

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Plus, Eye, EyeOff, Edit3, Trash2, ArrowLeft, BarChart3, Package, Tag, TrendingUp, X, Save, Search, MessageCircle } from "lucide-react";
import { onValue, ref, remove, update } from "firebase/database";
import { collection, query, where, onSnapshot, type DocumentData } from "firebase/firestore";

import { useAuthContext } from "../providers/AuthProvider";
import { realtimeDb, firestore } from "@/lib/firebaseClient";

type ShopProduct = {
  id: string;
  name: string;
  price: number;
  cost?: number;
  imageUrl: string;
  stock: number;
  active: boolean;
  sellerId?: string;
  description?: string;
  createdAt?: number;
};

type EditForm = {
  name: string;
  description: string;
  price: string;
  stock: string;
  imageUrl: string;
};

export default function MyShopPage() {
  const router = useRouter();
  const { profile, initializing } = useAuthContext();
  const [products, setProducts] = useState<Record<string, ShopProduct>>({});
  const [orders, setOrders] = useState<DocumentData[]>([]);
  const [ready, setReady] = useState(false);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editForm, setEditForm] = useState<EditForm>({
    name: "",
    description: "",
    price: "",
    stock: "",
    imageUrl: "",
  });
  const [salesData, setSalesData] = useState({
    totalSales: 0,
    totalOrders: 0,
    activeCoupons: 0,
  });

  useEffect(() => {
    if (initializing) return;

    if (!profile) {
      router.replace("/login");
      return;
    }

    if (profile.role !== "seller" && profile.role !== "admin") {
      router.replace("/");
      return;
    }

    // Fetch products from Realtime Database
    const productsRef = ref(realtimeDb, "products");
    const unsubscribeProducts = onValue(productsRef, (snapshot) => {
      const value = snapshot.val() ?? {};
      setProducts(value);
      console.log("Products loaded:", Object.keys(value).length, "products");
    });

    // Fetch coupons from Firestore
    const couponsRef = collection(firestore, "coupons");
    const couponsQuery = query(couponsRef, where("sellerId", "==", profile.uid), where("isActive", "==", true));
    const unsubscribeCoupons = onSnapshot(couponsQuery, (snapshot) => {
      const activeCoupons = snapshot.docs.length;
      setSalesData(prev => ({
        ...prev,
        activeCoupons,
      }));
    });

    setReady(true);

    return () => {
      unsubscribeProducts();
      unsubscribeCoupons();
    };
  }, [initializing, profile, router]);

  // Separate effect to calculate sales data when products change
  useEffect(() => {
    if (initializing || !profile) return;

    // Fetch orders from Firestore
    const ordersRef = collection(firestore, "orders");
    const ordersQuery = query(ordersRef, where("sellerIds", "array-contains", profile.uid));
    const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => doc.data());
      setOrders(ordersData);
    
      const totalSales = ordersData.reduce((sum, order) => sum + (order.total || 0), 0);
      const totalOrders = ordersData.length;
      
      setSalesData(prev => ({
        ...prev,
        totalSales,
        totalOrders,
      }));
    });

    return () => unsubscribeOrders();
  }, [initializing, profile, products]);

  const myProducts = useMemo(() => {
    if (!profile) return [];
    return Object.entries(products)
      .filter(([_, product]) => product.sellerId === profile.uid)
      .map(([id, product]) => ({ ...product, id }));
  }, [products, profile]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return myProducts;
    
    const query = searchQuery.toLowerCase();
    return myProducts.filter(product => 
      product.name.toLowerCase().includes(query) ||
      (product.description && product.description.toLowerCase().includes(query)) ||
      product.price.toString().includes(query) ||
      product.stock.toString().includes(query)
    );
  }, [myProducts, searchQuery]);

  const toggleStatus = (id: string) => {
    const product = products[id];
    if (!product) return;

    update(ref(realtimeDb, `products/${id}`), {
      active: !product.active,
    });
  };

  const deleteProduct = (id: string) => {
    const product = products[id];
    if (!product) return;

    if (confirm(`ต้องการลบสินค้า "${product.name}" หรือไม่?`)) {
      remove(ref(realtimeDb, `products/${id}`));
    }
  };

  const startEdit = (product: ShopProduct) => {
    setEditingProduct(product.id);
    setEditForm({
      name: product.name,
      description: product.description || "",
      price: product.price.toString(),
      stock: product.stock.toString(),
      imageUrl: product.imageUrl,
    });
  };

  const cancelEdit = () => {
    setEditingProduct(null);
    setEditForm({
      name: "",
      description: "",
      price: "",
      stock: "",
      imageUrl: "",
    });
  };

  const saveEdit = async () => {
    if (!editingProduct) return;

    const priceValue = parseFloat(editForm.price);
    const stockValue = parseInt(editForm.stock);

    if (!editForm.name.trim()) {
      alert("กรุณากรอกชื่อสินค้า");
      return;
    }
    if (isNaN(priceValue) || priceValue <= 0) {
      alert("กรุณากรอกราคาที่ถูกต้อง");
      return;
    }
    if (isNaN(stockValue) || stockValue < 0) {
      alert("กรุณากรอกจำนวนสต็อกที่ถูกต้อง");
      return;
    }

    try {
      await update(ref(realtimeDb, `products/${editingProduct}`), {
        name: editForm.name.trim(),
        description: editForm.description.trim(),
        price: priceValue,
        stock: stockValue,
        imageUrl: editForm.imageUrl.trim(),
      });
      
      setEditingProduct(null);
      setEditForm({
        name: "",
        description: "",
        price: "",
        stock: "",
        imageUrl: "",
      });
    } catch (error) {
      console.error("Error updating product:", error);
      alert("ไม่สามารถบันทึกการแก้ไขได้");
    }
  };

  if (!ready) {
    return <div className="flex min-h-screen items-center justify-center bg-emerald-50">กำลังโหลด...</div>;
  }

  return (
    <div className="min-h-screen bg-emerald-50">
      <div className="mx-auto w-full max-w-6xl px-4 py-12">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 transition hover:text-emerald-700"
          >
            <ArrowLeft className="h-4 w-4" /> กลับไปหน้าแรก
          </Link>
        </div>
        <header className="flex flex-col gap-4 border-b border-emerald-100 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-emerald-800">ร้านของฉัน</h1>
            <p className="mt-1 text-sm text-slate-600">จัดการสินค้าและติดตามสถานะการขายได้จากที่นี่</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/add-product"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-emerald-500 to-lime-400 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:brightness-110"
            >
              <Plus className="h-4 w-4" /> เพิ่มสินค้าใหม่
            </Link>
          </div>
        </header>

        {/* Sales Dashboard */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-lg">
            <div className="flex flex-col items-center text-center">
              <div className="rounded-full bg-emerald-100 p-3 mb-3">
                <TrendingUp className="h-6 w-6 text-emerald-600" />
              </div>
              <p className="text-sm text-slate-500 mb-1">ยอดขายรวม</p>
              <p className="text-2xl font-bold text-emerald-800">฿{salesData.totalSales.toLocaleString('th-TH')}</p>
            </div>
          </div>

          <div className="rounded-3xl border border-purple-100 bg-white p-6 shadow-lg">
            <div className="flex flex-col items-center text-center">
              <div className="rounded-full bg-purple-100 p-3 mb-3">
                <Package className="h-6 w-6 text-purple-600" />
              </div>
              <p className="text-sm text-slate-500 mb-1">ออเดอร์ทั้งหมด</p>
              <p className="text-2xl font-bold text-purple-800">{salesData.totalOrders}</p>
            </div>
          </div>

          <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-lg">
            <div className="flex flex-col items-center text-center">
              <div className="rounded-full bg-orange-100 p-3 mb-3">
                <Tag className="h-6 w-6 text-orange-600" />
              </div>
              <p className="text-sm text-slate-500 mb-1">คูปองที่ใช้งาน</p>
              <p className="text-2xl font-bold text-orange-800">{salesData.activeCoupons}</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Link
            href="/my-shop/coupons"
            className="flex items-center gap-4 rounded-3xl border border-emerald-100 bg-white p-6 shadow-lg transition hover:shadow-xl"
          >
            <div className="rounded-full bg-emerald-100 p-3">
              <Tag className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-emerald-800">จัดการคูปอง</h3>
              <p className="text-sm text-slate-500">สร้างและจัดการคูปองส่วนลด</p>
            </div>
          </Link>

          <Link
            href="/my-shop/orders"
            className="flex items-center gap-4 rounded-3xl border border-emerald-100 bg-white p-6 shadow-lg transition hover:shadow-xl"
          >
            <div className="rounded-full bg-blue-100 p-3">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-800">ออเดอร์ทั้งหมด</h3>
              <p className="text-sm text-slate-500">ดูและจัดการคำสั่งซื้อ</p>
            </div>
          </Link>

          <Link
            href="/my-shop/reports"
            className="flex items-center gap-4 rounded-3xl border border-emerald-100 bg-white p-6 shadow-lg transition hover:shadow-xl"
          >
            <div className="rounded-full bg-purple-100 p-3">
              <BarChart3 className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-purple-800">รายงานการขาย</h3>
              <p className="text-sm text-slate-500">วิเคราะห์ยอดขายและกำไร</p>
            </div>
          </Link>

          <Link
            href="/my-shop/charts"
            className="flex items-center gap-4 rounded-3xl border border-emerald-100 bg-white p-6 shadow-lg transition hover:shadow-xl"
          >
            <div className="rounded-full bg-orange-100 p-3">
              <BarChart3 className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h3 className="font-semibold text-orange-800">กราฟยอดขาย</h3>
              <p className="text-sm text-slate-500">ดูกราฟยอดขายและสินค้าขายดี</p>
            </div>
          </Link>

          <Link
            href="/my-shop/chat"
            className="flex items-center gap-4 rounded-3xl border border-emerald-100 bg-white p-6 shadow-lg transition hover:shadow-xl"
          >
            <div className="rounded-full bg-green-100 p-3">
              <MessageCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-green-800">แชทร้านค้า</h3>
              <p className="text-sm text-slate-500">ตอบกลับลูกค้าและจัดการแชท</p>
            </div>
          </Link>
        </div>

        {myProducts.length > 0 && (
          <div className="mt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาสินค้า (ชื่อ, รายละเอียด, ราคา, สต็อก...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>
        )}

        {myProducts.length === 0 ? (
          <section className="mt-10 rounded-3xl border border-emerald-100 bg-white p-12 text-center shadow-lg">
            <p className="text-slate-600">คุณยังไม่มีสินค้าในร้าน</p>
            <Link
              href="/add-product"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-emerald-500 to-lime-400 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:brightness-110"
            >
              <Plus className="h-4 w-4" /> เพิ่มสินค้าแรกของคุณ
            </Link>
          </section>
        ) : (
          <section className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((product) => (
              <article key={product.id} className="overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-md transition hover:shadow-xl">
                {editingProduct === product.id ? (
                  // Edit Mode
                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-emerald-800">แก้ไขสินค้า</h3>
                      <button
                        onClick={cancelEdit}
                        className="rounded-full p-1 text-slate-400 hover:text-slate-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อสินค้า</label>
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                          placeholder="ชื่อสินค้า"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">รายละเอียด</label>
                        <textarea
                          value={editForm.description}
                          onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                          placeholder="รายละเอียดสินค้า"
                          rows={2}
                        />
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">ราคาขาย (฿)</label>
                          <input
                            type="number"
                            value={editForm.price}
                            onChange={(e) => setEditForm(prev => ({ ...prev, price: e.target.value }))}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                            placeholder="0"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">สต็อก</label>
                          <input
                            type="number"
                            value={editForm.stock}
                            onChange={(e) => setEditForm(prev => ({ ...prev, stock: e.target.value }))}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                            placeholder="0"
                            min="0"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">URL รูปภาพ</label>
                        <input
                          type="url"
                          value={editForm.imageUrl}
                          onChange={(e) => setEditForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                          placeholder="https://example.com/image.jpg"
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={saveEdit}
                        className="flex-1 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-600"
                      >
                        <Save className="mr-2 inline h-4 w-4" />
                        บันทึก
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
                      >
                        ยกเลิก
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <>
                    <div className="relative h-56 w-full">
                      {product.imageUrl ? (
                        <Image 
                          src={product.imageUrl} 
                          alt={product.name} 
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-slate-100">
                          <span className="text-slate-400">ไม่มีรูปภาพ</span>
                        </div>
                      )}
                      <span
                        className={`absolute right-4 top-4 rounded-full px-3 py-1 text-xs font-semibold ${product.active ? "bg-emerald-500/90 text-white" : "bg-slate-300 text-slate-700"}`}
                      >
                        {product.active ? "เปิดขาย" : "ปิดขาย"}
                      </span>
                    </div>

                    <div className="space-y-3 p-5">
                      <div>
                        <h2 className="text-lg font-semibold text-emerald-800">{product.name}</h2>
                        <p className="text-sm text-slate-500">สต็อก: {product.stock} ชิ้น</p>
                        {product.description && (
                          <p className="text-sm text-slate-600 mt-1">{product.description}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-500">ราคาขาย:</span>
                          <span className="text-lg font-bold text-emerald-600">฿{product.price.toLocaleString("th-TH")}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleStatus(product.id)}
                          className="flex-1 rounded-xl border border-emerald-300 px-4 py-2 text-sm font-medium text-emerald-600 transition hover:bg-emerald-50"
                        >
                          {product.active ? <><EyeOff className="mr-2 inline h-4 w-4" /> ปิดการขาย</> : <><Eye className="mr-2 inline h-4 w-4" /> เปิดการขาย</>}
                        </button>
                        <button 
                          onClick={() => startEdit(product)}
                          className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteProduct(product.id)}
                          className="rounded-xl border border-rose-200 px-4 py-2 text-sm text-rose-500 transition hover:bg-rose-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </article>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}

