'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Clock, 
  Search, 
  ArrowLeft,
  Package,
  CheckCircle,
  XCircle,
  Eye,
  AlertCircle
} from "lucide-react";

import { useAuthContext } from "../../providers/AuthProvider";
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebaseClient";

type Order = {
  id: string;
  buyerId: string;
  buyerName?: string;
  items: Array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
    image?: string;
  }>;
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  shippingAddress: {
    fullName: string;
    addressLine1: string;
    addressLine2?: string;
    district: string;
    province: string;
    postalCode: string;
    phone: string;
  };
  createdAt: Date;
  updatedAt: Date;
};

export default function PendingOrdersPage() {
  const router = useRouter();
  const { profile } = useAuthContext();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.role !== "admin") {
      router.push("/");
      return;
    }

    try {
      const ordersRef = collection(firestore, "orders");
      const unsubscribe = onSnapshot(
        ordersRef, 
        (snapshot) => {
          console.log('📦 Pending orders loaded:', snapshot.docs.length);
          
          const orderData = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate?.() || new Date(),
              updatedAt: data.updatedAt?.toDate?.() || new Date(),
            };
          }) as Order[];
          
          // กรองเฉพาะออเดอร์ที่รอการอนุมัติ
          const pendingOrders = orderData.filter(order => 
            order.status === 'pending' || order.status === 'paid'
          );
          
          console.log('⏳ Filtered pending orders:', pendingOrders.length);
          setOrders(pendingOrders);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error("❌ Error fetching pending orders:", err);
          setError(`เกิดข้อผิดพลาด: ${err.message}`);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error("❌ Error setting up listener:", err);
      setError(`ไม่สามารถเชื่อมต่อฐานข้อมูลได้: ${err instanceof Error ? err.message : String(err)}`);
      setLoading(false);
    }
  }, [profile, router]);

  const filteredOrders = orders.filter(order => {
    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) return true;

    const orderId = order.id?.toLowerCase?.() ?? "";
    const buyerName = order.buyerName?.toLowerCase?.() ?? "";
    const paymentStatus = order.paymentStatus?.toLowerCase?.() ?? "";
    const status = order.status?.toLowerCase?.() ?? "";
    const paymentMethod = order.paymentMethod?.toLowerCase?.() ?? "";
    const itemsText = order.items
      ?.map(item => item?.name?.toLowerCase?.() ?? "")
      .filter(Boolean)
      .join(" ");

    return (
      orderId.includes(keyword) ||
      buyerName.includes(keyword) ||
      paymentStatus.includes(keyword) ||
      status.includes(keyword) ||
      paymentMethod.includes(keyword) ||
      itemsText.includes(keyword)
    );
  });

  const handleApproveOrder = async (orderId: string) => {
    if (confirm("ต้องการอนุมัติออเดอร์นี้หรือไม่?")) {
      try {
        await updateDoc(doc(firestore, "orders", orderId), {
          status: "shipped",
          updatedAt: new Date(),
        });
        alert("อนุมัติออเดอร์สำเร็จ!");
      } catch (error) {
        console.error("Error approving order:", error);
        alert("ไม่สามารถอนุมัติออเดอร์ได้");
      }
    }
  };

  const handleRejectOrder = async (orderId: string) => {
    if (confirm("ต้องการปฏิเสธออเดอร์นี้หรือไม่?")) {
      try {
        await updateDoc(doc(firestore, "orders", orderId), {
          status: "canceled",
          updatedAt: new Date(),
        });
        alert("ปฏิเสธออเดอร์สำเร็จ!");
      } catch (error) {
        console.error("Error rejecting order:", error);
        alert("ไม่สามารถปฏิเสธออเดอร์ได้");
      }
    }
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

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">เกิดข้อผิดพลาด</h2>
          <p className="text-slate-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
          >
            ลองใหม่
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/admin/dashboard")}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition"
              >
                <ArrowLeft className="h-4 w-4" />
                กลับ
              </button>
              <h1 className="text-xl font-semibold text-slate-800">ออเดอร์ที่รอการอนุมัติ</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาออเดอร์ด้วย ID, ชื่อลูกค้า, หรือชื่อสินค้า..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div key={order.id} className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                {/* Order Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-lg font-semibold text-slate-900">
                      ออเดอร์ #{order.id.slice(-8)}
                    </h3>
                    <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      order.status === 'paid' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {order.status === 'pending' ? 'รอดำเนินการ' :
                       order.status === 'paid' ? 'ชำระเงินแล้ว' : order.status}
                    </span>
                    <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                      order.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      order.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {order.paymentStatus === 'pending' ? 'รอชำระเงิน' :
                       order.paymentStatus === 'paid' ? 'ชำระเงินแล้ว' : order.paymentStatus}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-slate-500">ลูกค้า</p>
                      <p className="font-medium text-slate-900">{order.buyerName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">ยอดรวม</p>
                      <p className="font-semibold text-emerald-600">
                        ฿{order.total.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">วิธีการชำระ</p>
                      <p className="font-medium text-slate-900">
                        {order.paymentMethod === 'cod' ? 'เก็บเงินปลายทาง' :
                         order.paymentMethod === 'credit' ? 'บัตรเครดิต' :
                         order.paymentMethod === 'promptpay' ? 'พร้อมเพย์' :
                         order.paymentMethod === 'bank_transfer' ? 'โอนธนาคาร' : order.paymentMethod}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">วันที่สั่งซื้อ</p>
                      <p className="font-medium text-slate-900">
                        {order.createdAt.toLocaleDateString('th-TH')}
                      </p>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="mb-4">
                    <p className="text-sm text-slate-500 mb-2">รายการสินค้า:</p>
                    <div className="space-y-2">
                      {order.items.map((item, index) => (
                        <div key={index} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                          {item.image && (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-10 h-10 object-cover rounded"
                            />
                          )}
                          <div className="flex-1">
                            <p className="font-medium text-slate-900">{item.name}</p>
                            <p className="text-sm text-slate-500">
                              ฿{item.price.toLocaleString()} × {item.quantity} ชิ้น
                            </p>
                          </div>
                          <p className="font-semibold text-slate-900">
                            ฿{(item.price * item.quantity).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Shipping Address */}
                  <div>
                    <p className="text-sm text-slate-500 mb-2">ที่อยู่จัดส่ง:</p>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="font-medium text-slate-900">{order.shippingAddress.fullName}</p>
                      <p className="text-sm text-slate-600">
                        {order.shippingAddress.addressLine1}
                        {order.shippingAddress.addressLine2 && `, ${order.shippingAddress.addressLine2}`}
                      </p>
                      <p className="text-sm text-slate-600">
                        {order.shippingAddress.district} {order.shippingAddress.province} {order.shippingAddress.postalCode}
                      </p>
                      <p className="text-sm text-slate-600">โทร: {order.shippingAddress.phone}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="lg:w-64">
                  <div className="space-y-3">
                    <button 
                      onClick={() => handleApproveOrder(order.id)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
                    >
                      <CheckCircle className="h-4 w-4" />
                      อนุมัติออเดอร์
                    </button>
                    <button 
                      onClick={() => handleRejectOrder(order.id)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                    >
                      <XCircle className="h-4 w-4" />
                      ปฏิเสธออเดอร์
                    </button>
                    <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition">
                      <Eye className="h-4 w-4" />
                      ดูรายละเอียด
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <Clock className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">ไม่มีออเดอร์ที่รอการอนุมัติ</p>
          </div>
        )}

        {/* Summary Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">รอดำเนินการ</p>
                <p className="text-2xl font-bold text-slate-900">
                  {orders.filter(o => o.status === 'pending').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">ชำระเงินแล้ว</p>
                <p className="text-2xl font-bold text-slate-900">
                  {orders.filter(o => o.status === 'paid').length}
                </p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">ยอดรวม</p>
                <p className="text-2xl font-bold text-slate-900">
                  ฿{orders.reduce((sum, order) => sum + order.total, 0).toLocaleString()}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-emerald-600" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
