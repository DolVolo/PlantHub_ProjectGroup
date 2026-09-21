import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
        <p className="text-gray-600 mb-8">ไม่พบหน้าที่คุณกำลังมองหา</p>
        <Link href="/" className="bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700">
          กลับหน้าหลัก
        </Link>
      </div>
    </div>
  );
}
