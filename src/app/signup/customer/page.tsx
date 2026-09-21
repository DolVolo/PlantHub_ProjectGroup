'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthContext } from '../../providers/AuthProvider';
import { doc, updateDoc } from 'firebase/firestore';
import { firestore } from '../../../lib/firebaseClient';
import { ArrowLeft, ShoppingBag, CheckCircle, Heart, Star, Gift, Truck } from 'lucide-react';

export default function CustomerRegistrationPage() {
  const router = useRouter();
  const { firebaseUser, profile } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const setupCustomer = async () => {
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
          role: 'customer',
          isProfileComplete: true,
          needsRoleSelection: false,
          isNewUser: false,
          updatedAt: new Date(),
        });

        // รอสักครู่เพื่อให้ผู้ใช้เห็นหน้าเสร็จสิ้น
        setTimeout(() => {
          router.push('/');
        }, 2000);
      } catch (error) {
        console.error('Customer registration error:', error);
        setError((error instanceof Error && error.message) || 'เกิดข้อผิดพลาดในการสมัครสมาชิก');
        setIsLoading(false);
      }
    };

    setupCustomer();
  }, [firebaseUser, router]);

  const features = [
    {
      icon: ShoppingBag,
      title: 'ซื้อสินค้าได้ง่าย',
      description: 'ค้นหาและซื้อพืชที่คุณต้องการได้อย่างง่ายดาย',
      color: 'emerald'
    },
    {
      icon: Heart,
      title: 'รายการโปรด',
      description: 'บันทึกสินค้าที่ชอบไว้ในรายการโปรด',
      color: 'pink'
    },
    {
      icon: Star,
      title: 'รีวิวสินค้า',
      description: 'ให้คะแนนและรีวิวสินค้าที่ซื้อ',
      color: 'yellow'
    },
    {
      icon: Truck,
      title: 'ติดตามการจัดส่ง',
      description: 'ติดตามสถานะการจัดส่งแบบเรียลไทม์',
      color: 'blue'
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      emerald: 'bg-emerald-50 text-emerald-600',
      pink: 'bg-pink-50 text-pink-600',
      yellow: 'bg-yellow-50 text-yellow-600',
      blue: 'bg-blue-50 text-blue-600'
    };
    return colors[color as keyof typeof colors];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-lime-50">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23d1fae5%22%20fill-opacity%3D%220.1%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50"></div>
      
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4 py-12">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <Link
              href="/signup/user-type"
              className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              กลับไปหน้าก่อนหน้า
            </Link>
            
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-lime-400 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <ShoppingBag className="w-10 h-10 text-white" />
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              ยินดีต้อนรับ!
            </h1>
            <p className="text-gray-600">
              การสมัครสมาชิกเสร็จสิ้นแล้ว
            </p>
          </div>

          {/* Main Card */}
          <div className="bg-white rounded-3xl shadow-2xl border border-emerald-100 p-8">
            {/* Success Message */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                สมัครสมาชิกสำเร็จ!
              </h2>
              <p className="text-gray-600">
                ตอนนี้คุณสามารถเริ่มต้นการซื้อสินค้าได้แล้ว
              </p>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto mb-4"></div>
                <p className="text-gray-600">กำลังเตรียมข้อมูล...</p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl mb-6">
                <p className="text-red-600 text-sm text-center">{error}</p>
              </div>
            )}

            {/* Features */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-4">
                สิ่งที่คุณสามารถทำได้
              </h3>
              
              <div className="space-y-3">
                {features.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <div key={index} className="flex items-center gap-3 p-3 rounded-xl">
                      <div className={`w-8 h-8 ${getColorClasses(feature.color)} rounded-lg flex items-center justify-center`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{feature.title}</p>
                        <p className="text-sm text-gray-600">{feature.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Continue Button */}
            <div className="mt-8">
              <button
                onClick={() => router.push('/')}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-emerald-500 to-lime-400 text-white font-semibold py-4 px-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
              >
                <div className="flex items-center justify-center gap-3">
                  <Gift className="w-5 h-5" />
                  <span>เริ่มต้นการซื้อสินค้า</span>
                </div>
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-8">
            <p className="text-xs text-gray-500">
              หากมีคำถาม สามารถติดต่อทีมสนับสนุนได้ตลอด 24 ชั่วโมง
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
