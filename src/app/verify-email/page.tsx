'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '../providers/AuthProvider';
import { Mail, CheckCircle, XCircle, RefreshCw, Trash2, ArrowLeft } from 'lucide-react';

export default function VerifyEmailPage() {
  const { firebaseUser, profile, initializing, sendEmailVerification, cancelRegistrationNew } = useAuthContext();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  useEffect(() => {
    if (!initializing && !firebaseUser) {
      router.push('/login');
      return;
    }

    if (firebaseUser) {
      setEmailVerified(firebaseUser.emailVerified);
    }
  }, [firebaseUser, initializing, router]);

  useEffect(() => {
    // Check if user is already verified and has a role
    if (firebaseUser && firebaseUser.emailVerified && profile?.role) {
      router.push('/');
      return;
    }
  }, [firebaseUser, profile, router]);

  const handleResendEmail = async () => {
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      await sendEmailVerification();
      setSuccess('ส่งอีเมลยืนยันเรียบร้อยแล้ว กรุณาตรวจสอบอีเมลของคุณ');
    } catch (err) {
      setError((err instanceof Error && err.message) || 'เกิดข้อผิดพลาดในการส่งอีเมลยืนยัน');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckEmailVerification = async () => {
    if (!firebaseUser) return;
    
    setError('');
    setSuccess('');
    setIsCheckingEmail(true);

    try {
      // Reload user to get latest email verification status
      await firebaseUser.reload();
      
      if (firebaseUser.emailVerified) {
        setEmailVerified(true);
        setSuccess('ยืนยันอีเมลเรียบร้อยแล้ว! กำลังพาไปหน้าแรก...');
        
        // Redirect to home page after 2 seconds
        setTimeout(() => {
          router.push('/');
        }, 2000);
      } else {
        setError('ยังไม่ได้ยืนยันอีเมล กรุณาตรวจสอบอีเมลของคุณ');
      }
    } catch {
      setError('เกิดข้อผิดพลาดในการตรวจสอบสถานะอีเมล');
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const handleCancelRegistration = async () => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะยกเลิกการสมัครสมาชิก? การกระทำนี้ไม่สามารถย้อนกลับได้')) {
      return;
    }

    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      await cancelRegistrationNew();
      router.push('/register');
    } catch (err) {
      setError((err instanceof Error && err.message) || 'เกิดข้อผิดพลาดในการยกเลิกการสมัครสมาชิก');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.push('/login');
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (!firebaseUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">ยืนยันอีเมล</h1>
          <p className="text-gray-600">กรุณายืนยันอีเมลของคุณเพื่อใช้งานระบบ</p>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          {/* Email Info */}
          <div className="mb-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900">{firebaseUser.email}</p>
                  <p className="text-sm text-gray-500">อีเมลที่สมัครสมาชิก</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {emailVerified ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-sm text-green-600 font-medium">ยืนยันแล้ว</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-500" />
                    <span className="text-sm text-red-600 font-medium">ยังไม่ยืนยัน</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Status Message */}
          {emailVerified ? (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <p className="text-green-800 font-medium">อีเมลยืนยันเรียบร้อยแล้ว!</p>
              </div>
              <p className="text-green-700 text-sm mt-1">
                คุณสามารถใช้งานระบบได้แล้ว กำลังพาไปหน้าแรก...
              </p>
            </div>
          ) : (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-yellow-500" />
                <p className="text-yellow-800 font-medium">รอยืนยันอีเมล</p>
              </div>
              <p className="text-yellow-700 text-sm mt-1">
                กรุณาตรวจสอบอีเมลของคุณและคลิกลิงก์ยืนยันที่ส่งไป
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-500" />
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <p className="text-green-800">{success}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {!emailVerified && (
              <>
                <button
                  onClick={handleCheckEmailVerification}
                  disabled={isCheckingEmail || isLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isCheckingEmail ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <CheckCircle className="w-5 h-5" />
                  )}
                  ยืนยันอีเมลแล้ว
                </button>

                <button
                  onClick={handleResendEmail}
                  disabled={isLoading || isCheckingEmail}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Mail className="w-5 h-5" />
                  )}
                  ส่งอีเมลอีกครั้ง
                </button>
              </>
            )}

            {emailVerified && (
              <button
                onClick={() => router.push('/')}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <CheckCircle className="w-5 h-5" />
                ยืนยันอีเมลแล้ว - ไปหน้าแรก
              </button>
            )}

            <button
              onClick={handleCancelRegistration}
              disabled={isLoading || isCheckingEmail}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Trash2 className="w-5 h-5" />
              )}
              ยกเลิกการสมัครสมาชิก
            </button>

            <button
              onClick={handleBackToLogin}
              disabled={isLoading || isCheckingEmail}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              กลับไปหน้าเข้าสู่ระบบ
            </button>
          </div>

          {/* Instructions */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">คำแนะนำ:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• ตรวจสอบกล่องจดหมายและโฟลเดอร์ Spam</li>
              <li>• คลิกลิงก์ยืนยันในอีเมลที่ส่งไป</li>
              <li>• กดปุ่ม &ldquo;ยืนยันอีเมลแล้ว&rdquo; หลังจากคลิกลิงก์ในอีเมล</li>
              <li>• หากไม่พบอีเมล ให้กดปุ่ม &ldquo;ส่งอีเมลอีกครั้ง&rdquo;</li>
              <li>• หลังจากยืนยันแล้ว จะพาไปหน้าแรก</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
