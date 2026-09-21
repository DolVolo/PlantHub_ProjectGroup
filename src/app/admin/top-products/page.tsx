'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  TrendingUp, 
  Search, 
  ArrowLeft,
  Package,
  ShoppingCart
} from "lucide-react";

import { useAuthContext } from "../../providers/AuthProvider";
import { ref, onValue } from "firebase/database";
import { collection, getDocs } from "firebase/firestore";
import { realtimeDb, firestore } from "@/lib/firebaseClient";

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string;
  sellerId: string;
  active: boolean;
  createdAt: number;
};

type ProductSales = {
  product: Product;
  totalSold: number;
  totalRevenue: number;
  orderCount: number;
};

export default function TopProductsPage() {
  const router = useRouter();
  const { profile } = useAuthContext();
  const [topProducts, setTopProducts] = useState<ProductSales[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (profile?.role !== "admin") {
      router.push("/");
      return;
    }

    const fetchTopProducts = async () => {
      try {
        // ดึงข้อมูลสินค้า
        const productsRef = ref(realtimeDb, "products");
        const productsSnapshot = await new Promise((resolve) => {
          onValue(productsRef, (snapshot) => {
            resolve(snapshot.val() || {});
          }, { onlyOnce: true });
        });

        const products = productsSnapshot as Record<string, Product>;

        // ดึงข้อมูลออเดอร์ (อ่านครั้งเดียว)
        const ordersSnapshot = await getDocs(collection(firestore, "orders"));
        const orders = ordersSnapshot.docs.map((orderDoc) => orderDoc.data());

        // คำนวณยอดขายของแต่ละสินค้า
        const productSales: Record<string, ProductSales> = {};

        orders.forEach(order => {
          if (order.items && Array.isArray(order.items)) {
            order.items.forEach((item: { productId: string; price: number; quantity: number }) => {
              const productId = item.productId;
              if (products[productId]) {
                if (!productSales[productId]) {
                  productSales[productId] = {
                    product: products[productId],
                    totalSold: 0,
                    totalRevenue: 0,
                    orderCount: 0,
                  };
                }
                productSales[productId].totalSold += item.quantity;
                productSales[productId].totalRevenue += item.price * item.quantity;
                productSales[productId].orderCount += 1;
              }
            });
          }
        });

        // เรียงตามยอดขายและเอา Top 10
        const sortedProducts = Object.values(productSales)
          .sort((a, b) => b.totalSold - a.totalSold)
          .slice(0, 10);

        setTopProducts(sortedProducts);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching top products:", error);
        setLoading(false);
      }
    };

    fetchTopProducts();
  }, [profile, router]);

  const filteredProducts = topProducts.filter(item =>
    item.product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 md:gap-4 h-14 md:h-16">
            <button
              onClick={() => router.push("/admin/dashboard")}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">กลับ</span>
            </button>
            <h1 className="text-lg md:text-xl font-semibold text-slate-800">สินค้าขายดี</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        {/* Search */}
        <div className="mb-4 md:mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาสินค้า..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 md:py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm md:text-base"
            />
          </div>
        </div>

        {/* Top Products List */}
        <div className="space-y-3 md:space-y-4">
          {filteredProducts.map((item, index) => (
            <div key={item.product.id} className="bg-white rounded-xl shadow-sm p-4 md:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4">
                {/* Rank */}
                <div className="flex-shrink-0">
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-white font-bold text-sm md:text-base ${
                    index === 0 ? 'bg-yellow-500' :
                    index === 1 ? 'bg-gray-400' :
                    index === 2 ? 'bg-orange-500' :
                    'bg-slate-500'
                  }`}>
                    {index + 1}
                  </div>
                </div>

                {/* Product Image */}
                <div className="flex-shrink-0">
                  {item.product.imageUrl ? (
                    <img
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      className="w-14 h-14 md:w-16 md:h-16 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-14 h-14 md:w-16 md:h-16 bg-slate-100 rounded-lg flex items-center justify-center">
                      <Package className="h-6 w-6 md:h-8 md:w-8 text-slate-400" />
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-base md:text-lg font-semibold text-slate-900 mb-1 truncate">
                    {item.product.name}
                  </h3>
                  <p className="text-xs md:text-sm text-slate-600 mb-2 line-clamp-2">
                    {item.product.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm text-slate-500">
                    <span className="whitespace-nowrap">ราคา: ฿{item.product.price.toLocaleString()}</span>
                    <span className="whitespace-nowrap">สต็อก: {item.product.stock} ชิ้น</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      item.product.active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {item.product.active ? 'เปิดขาย' : 'ปิดขาย'}
                    </span>
                  </div>
                </div>

                {/* Sales Stats */}
                <div className="flex-shrink-0 w-full sm:w-auto sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 mt-2 sm:mt-0">
                  <div className="space-y-1 flex sm:flex-col justify-between sm:justify-start items-center sm:items-end">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4 text-emerald-600" />
                      <span className="text-base md:text-lg font-bold text-emerald-600">
                        {item.totalSold} ชิ้น
                      </span>
                    </div>
                    <div className="text-xs md:text-sm text-slate-600">
                      ยอดขาย: ฿{item.totalRevenue.toLocaleString()}
                    </div>
                    <div className="text-xs md:text-sm text-slate-600">
                      ออเดอร์: {item.orderCount} ครั้ง
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <TrendingUp className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-sm md:text-base text-slate-500">ไม่พบสินค้าที่ตรงกับเงื่อนไข</p>
          </div>
        )}

        {/* Summary Stats */}
        <div className="mt-6 md:mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-slate-600">สินค้าที่มียอดขาย</p>
                <p className="text-xl md:text-2xl font-bold text-slate-900">{topProducts.length}</p>
              </div>
              <Package className="h-6 w-6 md:h-8 md:w-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-slate-600">ยอดขายรวม</p>
                <p className="text-lg md:text-2xl font-bold text-slate-900">
                  ฿{topProducts.reduce((sum, item) => sum + item.totalRevenue, 0).toLocaleString()}
                </p>
              </div>
              <TrendingUp className="h-6 w-6 md:h-8 md:w-8 text-emerald-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-slate-600">จำนวนขายรวม</p>
                <p className="text-xl md:text-2xl font-bold text-slate-900">
                  {topProducts.reduce((sum, item) => sum + item.totalSold, 0)} ชิ้น
                </p>
              </div>
              <ShoppingCart className="h-6 w-6 md:h-8 md:w-8 text-purple-600" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
