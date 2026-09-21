'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthContext } from '../../providers/AuthProvider';
import { doc, updateDoc } from 'firebase/firestore';
import { firestore } from '../../../lib/firebaseClient';
import { ArrowLeft, Store, CheckCircle, Sparkles, Shield, Zap } from 'lucide-react';

export default function SellerRegistrationPage() {
  const router = useRouter();
  const { firebaseUser, profile } = useAuthContext();
  const [shopName, setShopName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!shopName.trim()) {
      setError('กรุณากรอกชื่อร้านค้า');
      return;
    }

    if (!firebaseUser) {
      setError('ไม่พบข้อมูลผู้ใช้');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // อัปเดตข้อมูลผู้ใช้ใน Firestore
      const userRef = doc(firestore, 'users', firebaseUser.uid);
      await updateDoc(userRef, {
        role: 'seller',
        shopName: shopName.trim(),
        isShopSetup: true,
        needsRoleSelection: false,
        isNewUser: false,
        updatedAt: new Date(),
      });

      // พาไปหน้าแรก
      router.push('/');
    } catch (error) {
      console.error('Seller registration error:', error);
      setError((error instanceof Error && error.message) || 'เกิดข้อผิดพลาดในการสมัครสมาชิก');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23dbeafe%22%20fill-opacity%3D%220.1%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50"></div>
      
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4 py-12">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <Link
              href="/signup/user-type"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              กลับไปหน้าก่อนหน้า
            </Link>
            
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-400 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Store className="w-10 h-10 text-white" />
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              สร้างร้านค้าของคุณ
            </h1>
            <p className="text-gray-600">
              กรอกข้อมูลร้านค้าเพื่อเริ่มต้นการขาย
            </p>
          </div>

          {/* Main Card */}
          <div className="bg-white rounded-3xl shadow-2xl border border-blue-100 p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Shop Name Input */}
              <div>
                <label htmlFor="shopName" className="block text-sm font-semibold text-gray-700 mb-2">
                  ชื่อร้านค้า *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Store className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="shopName"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="เช่น ร้านต้นไม้สวย, ร้านพืชผักออร์แกนิก"
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    disabled={isLoading}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  ชื่อร้านค้าจะแสดงให้ลูกค้าเห็น คุณสามารถเปลี่ยนได้ในภายหลัง
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-red-600 text-sm text-center">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!shopName.trim() || isLoading}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-400 text-white font-semibold py-4 px-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>กำลังสร้างร้านค้า...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-3">
                    <CheckCircle className="w-5 h-5" />
                    <span>สร้างร้านค้า</span>
                  </div>
                )}
              </button>
            </form>

            {/* Features */}
            <div className="mt-8 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-4">
                สิ่งที่คุณจะได้รับ
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Store className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">ร้านค้าออนไลน์</p>
                    <p className="text-sm text-gray-600">สร้างร้านค้าออนไลน์ของคุณเอง</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl">
                  <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <Zap className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">จัดการสินค้า</p>
                    <p className="text-sm text-gray-600">เพิ่ม แก้ไข และจัดการสินค้าได้ง่าย</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Shield className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">ระบบปลอดภัย</p>
                    <p className="text-sm text-gray-600">ระบบชำระเงินและข้อมูลที่ปลอดภัย</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-8">
            <p className="text-xs text-gray-500">
              คุณสามารถแก้ไขข้อมูลร้านค้าได้ในภายหลัง
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
