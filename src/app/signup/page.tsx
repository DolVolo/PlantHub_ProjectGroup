'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthContext } from '../providers/AuthProvider';
import { signInWithGoogle } from '../../services/firebase/auth.service';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '../../lib/firebaseClient';
import { ArrowLeft, Mail, Store, ShoppingBag, Sparkles, Shield, Zap } from 'lucide-react';

export default function GoogleSignupPage() {
  const router = useRouter();
  const { signInGoogle } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignup = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const user = await signInGoogle();
      
      // ตรวจสอบว่าเป็นผู้ใช้ใหม่หรือไม่
      if (user) {
        // ตรวจสอบจาก profile ว่าเป็นผู้ใช้ใหม่หรือไม่
        const profileRef = doc(firestore, 'users', user.uid);
        const profileSnap = await getDoc(profileRef);
        
        if (profileSnap.exists()) {
          const profileData = profileSnap.data();
          
          // ถ้าเป็นผู้ใช้ใหม่และต้องเลือกประเภทผู้ใช้
          if (profileData.isNewUser && profileData.needsRoleSelection) {
            router.push('/signup/user-type');
          } else {
            // ผู้ใช้เก่า - เข้าสู่ระบบปกติ
            router.push('/');
          }
        } else {
          // ไม่มี profile - ไปหน้าคัดเลือกประเภท
          router.push('/signup/user-type');
        }
      }
    } catch (error) {
      console.error('Google signup error:', error);
      setError((error instanceof Error && error.message) || 'เกิดข้อผิดพลาดในการสมัครสมาชิก');
    } finally {
      setIsLoading(false);
    }
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
              href="/"
              className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              กลับไปหน้าแรก
            </Link>
            
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-lime-400 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              สมัครสมาชิก
            </h1>
            <p className="text-gray-600">
              เข้าร่วมชุมชน PlantHub พร้อมเริ่มต้นการซื้อขายพืช
            </p>
          </div>

          {/* Main Card */}
          <div className="bg-white rounded-3xl shadow-2xl border border-emerald-100 p-8">
            {/* Google Sign Up Button */}
            <button
              onClick={handleGoogleSignup}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 text-gray-700 font-semibold py-4 px-6 rounded-2xl transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-500"></div>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              <span>
                {isLoading ? 'กำลังสมัครสมาชิก...' : 'สมัครสมาชิกด้วย Google'}
              </span>
            </button>

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-red-600 text-sm text-center">{error}</p>
              </div>
            )}

            {/* Divider */}
            <div className="flex items-center my-6">
              <div className="flex-1 border-t border-gray-200"></div>
              <span className="px-4 text-gray-500 text-sm">หรือ</span>
              <div className="flex-1 border-t border-gray-200"></div>
            </div>

            {/* Features */}
            <div className="space-y-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-4">
                ทำไมต้องเลือก PlantHub?
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl">
                  <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <Shield className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">ปลอดภัย 100%</p>
                    <p className="text-sm text-gray-600">ระบบรักษาความปลอดภัยระดับสูง</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Zap className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">ซื้อขายง่าย</p>
                    <p className="text-sm text-gray-600">ระบบซื้อขายที่ใช้งานง่าย</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Store className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">ร้านค้าคุณภาพ</p>
                    <p className="text-sm text-gray-600">ร้านค้าที่ผ่านการคัดสรร</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Login Link */}
            <div className="text-center">
              <p className="text-gray-600 text-sm">
                มีบัญชีอยู่แล้ว?{' '}
                <Link
                  href="/login"
                  className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                >
                  เข้าสู่ระบบ
                </Link>
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-8">
            <p className="text-xs text-gray-500">
              การสมัครสมาชิกหมายความว่าคุณยอมรับ{' '}
              <Link href="/terms" className="text-emerald-600 hover:text-emerald-700">
                ข้อกำหนดการใช้งาน
              </Link>{' '}
              และ{' '}
              <Link href="/privacy" className="text-emerald-600 hover:text-emerald-700">
                นโยบายความเป็นส่วนตัว
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
