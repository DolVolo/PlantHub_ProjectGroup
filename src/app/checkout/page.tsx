'use client';

import { FormEvent, useMemo, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CreditCard, Truck, Banknote, QrCode, CalendarCheck, DollarSign, Receipt, FileText, ArrowLeft, MapPin, Check } from "lucide-react";
import { collection, query, where, getDocs } from "firebase/firestore";

import { useAuthContext } from "../providers/AuthProvider";
import { useCartStore } from "../../store/cartStore";
import type { CheckoutAddress, PaymentMethod } from "../../types/cart";
import { createOrder } from "../../services/firebase/orders.service";
import { firestore } from "@/lib/firebaseClient";

const PROMPTPAY_QR = "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/QR_code_for_mobile_English_Wikipedia.svg/250px-QR_code_for_mobile_English_Wikipedia.svg.png";

type Coupon = {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minPurchase: number;
  maxUses: number;
  usedCount: number;
  validFrom: Date;
  validUntil: Date;
  isActive: boolean;
};

interface SavedAddress {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  district: string;
  province: string;
  postalCode: string;
  isDefault: boolean;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { firebaseUser, profile } = useAuthContext();
  const { items, clearCart } = useCartStore();
  const cartSubtotal = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0), [items]);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [address, setAddress] = useState<CheckoutAddress>({
    fullName: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    district: "",
    province: "",
    postalCode: "",
  });
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentProofUrl, setPaymentProofUrl] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [saveThisAddress, setSaveThisAddress] = useState(false);

  const deliveryFee = items.length > 0 ? 40 : 0;

  // Load saved addresses from profile
  useEffect(() => {
    if (profile && profile.savedAddresses) {
      const addresses = profile.savedAddresses;
      setSavedAddresses(addresses);
      
      // Auto-select default address if exists
      const defaultAddr = addresses.find((addr: SavedAddress) => addr.isDefault);
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr.id);
        setAddress({
          fullName: defaultAddr.fullName,
          phone: defaultAddr.phone,
          addressLine1: defaultAddr.addressLine1,
          addressLine2: defaultAddr.addressLine2,
          district: defaultAddr.district,
          province: defaultAddr.province,
          postalCode: defaultAddr.postalCode,
        });
      } else if (addresses.length === 0) {
        setUseNewAddress(true);
      }
    } else {
      setUseNewAddress(true);
    }
  }, [profile]);

  // When user selects a saved address
  const handleSelectAddress = (addressId: string) => {
    const selectedAddr = savedAddresses.find(addr => addr.id === addressId);
    if (selectedAddr) {
      setSelectedAddressId(addressId);
      setUseNewAddress(false);
      setAddress({
        fullName: selectedAddr.fullName,
        phone: selectedAddr.phone,
        addressLine1: selectedAddr.addressLine1,
        addressLine2: selectedAddr.addressLine2,
        district: selectedAddr.district,
        province: selectedAddr.province,
        postalCode: selectedAddr.postalCode,
      });
    }
  };

  const discountAmount = useMemo(() => {
    if (!couponApplied || !appliedCoupon) return 0;
    
    if (appliedCoupon.discountType === 'percentage') {
      return cartSubtotal * (appliedCoupon.discountValue / 100);
    } else {
      return Math.min(appliedCoupon.discountValue, cartSubtotal);
    }
  }, [couponApplied, appliedCoupon, cartSubtotal]);

  const total = useMemo(() => {
    return Math.max(0, cartSubtotal - discountAmount) + deliveryFee;
  }, [cartSubtotal, discountAmount, deliveryFee]);

  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      setDiscountError("กรุณากรอกรหัสส่วนลด");
      return;
    }

    try {
      const couponsRef = collection(firestore, "coupons");
      const q = query(
        couponsRef,
        where("code", "==", couponCode.trim().toUpperCase()),
        where("isActive", "==", true)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        setDiscountError("รหัสส่วนลดไม่ถูกต้องหรือหมดอายุ");
        return;
      }

      const couponDoc = snapshot.docs[0];
      const couponData = couponDoc.data() as Coupon;
      
      // Check if coupon is still valid
      const now = new Date();
      const validFrom = couponData.validFrom instanceof Date ? couponData.validFrom : new Date(couponData.validFrom);
      const validUntil = couponData.validUntil instanceof Date ? couponData.validUntil : new Date(couponData.validUntil);
      
      if (now < validFrom || now > validUntil) {
        setDiscountError("คูปองหมดอายุแล้ว");
        return;
      }

      // Check usage limit
      if (couponData.usedCount >= couponData.maxUses) {
        setDiscountError("คูปองนี้ใช้ครบจำนวนแล้ว");
        return;
      }

      // Check minimum purchase
      if (cartSubtotal < couponData.minPurchase) {
        setDiscountError(`ยอดซื้อขั้นต่ำ ฿${couponData.minPurchase.toLocaleString('th-TH')}`);
        return;
      }

      setAppliedCoupon({
        ...couponData,
        id: couponDoc.id,
        validFrom,
        validUntil,
      });
      setCouponApplied(true);
      setDiscountError(null);
    } catch (error) {
      console.error("Error applying coupon:", error);
      setDiscountError("เกิดข้อผิดพลาดในการใช้คูปอง");
    }
  };

  const handleAddressChange = (field: keyof CheckoutAddress, value: string) => {
    setAddress((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!firebaseUser) {
      setError("กรุณาเข้าสู่ระบบก่อนทำการสั่งซื้อ");
      return;
    }

    if (items.length === 0) {
      setError("ตะกร้าสินค้าว่างเปล่า");
      return;
    }

    if (!address.fullName || !address.phone || !address.addressLine1 || !address.district || !address.province || !address.postalCode) {
      setError("กรุณากรอกข้อมูลที่อยู่ให้ครบถ้วน");
      return;
    }

    if ((paymentMethod === "promptpay" || paymentMethod === "bank_transfer") && !paymentProofUrl.trim()) {
      setError("กรุณากรอก URL ของสลิปการชำระเงิน");
      return;
    }

    try {
      setIsSubmitting(true);

      // Save address to profile if requested
      if (saveThisAddress && useNewAddress) {
        const { doc: docRef, updateDoc: updateDocRef, arrayUnion: arrayUnionRef } = await import("firebase/firestore");
        const userRef = docRef(firestore, "users", firebaseUser.uid);
        const newAddress = {
          id: Date.now().toString(),
          label: "ที่อยู่ใหม่",
          ...address,
          isDefault: savedAddresses.length === 0
        };
        await updateDocRef(userRef, {
          savedAddresses: arrayUnionRef(newAddress)
        });
      }

      await createOrder({
        buyerId: firebaseUser.uid,
        cartItems: items,
        subtotal: cartSubtotal,
        discountAmount,
        discountCode: couponApplied ? appliedCoupon?.code : undefined,
        total,
        paymentMethod,
        shippingAddress: address,
        paymentProofUrl: paymentProofUrl.trim() || null,
      });

      clearCart();
      router.push("/orders");
    } catch (err) {
      setError(err instanceof Error ? err.message : "ไม่สามารถสร้างคำสั่งซื้อได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!items.length) {
    return (
      <div className="min-h-screen bg-emerald-50/60 py-16">
        <div className="mx-auto w-full max-w-4xl rounded-3xl border border-emerald-100 bg-white py-16 text-center shadow-xl">
          <h1 className="text-3xl font-bold text-emerald-800">ตะกร้าสินค้าของคุณว่างเปล่า</h1>
          <p className="mt-4 text-slate-600">กรุณาเลือกสินค้าในหน้าแรกก่อนทำการชำระเงิน</p>
          <Link
            href="/"
            className="mt-8 inline-flex items-center rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:brightness-110"
          >
            ไปหน้าแรก
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-100 via-emerald-50 to-white py-12">
      <div className="mx-auto w-full max-w-6xl px-4">
        <div className="mb-6">
          <Link
            href="/cart"
            className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 transition hover:text-emerald-700"
          >
            <ArrowLeft className="h-4 w-4" /> กลับไปตะกร้าสินค้า
          </Link>
        </div>
        <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex-1 space-y-6">
          <div className="rounded-3xl border border-emerald-200 bg-white p-8 shadow-xl">
            <h2 className="text-2xl font-semibold text-emerald-800">ข้อมูลการจัดส่ง</h2>
            <p className="mt-1 text-sm text-slate-500">กรอกที่อยู่สำหรับการจัดส่งสินค้า</p>

            {/* Saved Addresses Selection */}
            {savedAddresses.length > 0 && (
              <div className="mt-6 space-y-3">
                <h3 className="text-sm font-semibold text-emerald-700">เลือกที่อยู่ที่บันทึกไว้</h3>
                <div className="grid grid-cols-1 gap-3">
                  {savedAddresses.map((savedAddr) => (
                    <button
                      key={savedAddr.id}
                      type="button"
                      onClick={() => handleSelectAddress(savedAddr.id)}
                      className={`relative w-full rounded-xl border-2 p-4 text-left transition ${
                        selectedAddressId === savedAddr.id && !useNewAddress
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-slate-200 bg-white hover:border-emerald-300"
                      }`}
                    >
                      {selectedAddressId === savedAddr.id && !useNewAddress && (
                        <div className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      )}
                      <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 pr-8">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-900">{savedAddr.label}</p>
                            {savedAddr.isDefault && (
                              <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-semibold text-white">
                                หลัก
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-700 mt-1">{savedAddr.fullName} · {savedAddr.phone}</p>
                          <p className="text-sm text-slate-600 mt-1">
                            {savedAddr.addressLine1}, {savedAddr.district}, {savedAddr.province} {savedAddr.postalCode}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setUseNewAddress(true);
                      setSelectedAddressId("");
                    }}
                    className={`w-full rounded-xl border-2 p-4 text-left transition ${
                      useNewAddress
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-slate-200 bg-white hover:border-emerald-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-emerald-600" />
                      <span className="font-semibold text-slate-900">ใช้ที่อยู่ใหม่</span>
                    </div>
                  </button>
                </div>
              </div>
            )}

            <form className={`${savedAddresses.length > 0 ? 'mt-6' : 'mt-6'} grid grid-cols-1 gap-4 md:grid-cols-2`} onSubmit={handleSubmit}>
              {/* Only show form if using new address or no saved addresses */}
              {(useNewAddress || savedAddresses.length === 0) && (
                <>
                  <div className="space-y-2">
                    <label htmlFor="fullName" className="text-sm font-medium text-emerald-700">
                      ชื่อ-นามสกุลผู้รับ
                    </label>
                    <input
                      id="fullName"
                      value={address.fullName}
                      onChange={(event) => handleAddressChange("fullName", event.target.value)}
                      className="w-full rounded-xl border border-emerald-200 bg-white px-4 py-3 text-slate-700 shadow-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="phone" className="text-sm font-medium text-emerald-700">
                      เบอร์โทรศัพท์
                    </label>
                    <input
                      id="phone"
                      value={address.phone}
                      onChange={(event) => handleAddressChange("phone", event.target.value)}
                      className="w-full rounded-xl border border-emerald-200 bg-white px-4 py-3 text-slate-700 shadow-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                      required
                    />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <label htmlFor="addressLine1" className="text-sm font-medium text-emerald-700">
                      ที่อยู่
                    </label>
                    <input
                      id="addressLine1"
                      value={address.addressLine1}
                      onChange={(event) => handleAddressChange("addressLine1", event.target.value)}
                      placeholder="บ้านเลขที่ หมู่ ถนน"
                      className="w-full rounded-xl border border-emerald-200 bg-white px-4 py-3 text-slate-700 shadow-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                      required
                    />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <label htmlFor="addressLine2" className="text-sm font-medium text-emerald-700">
                      อำเภอ/เขต
                    </label>
                    <input
                      id="addressLine2"
                      value={address.addressLine2 ?? ""}
                      onChange={(event) => handleAddressChange("addressLine2", event.target.value)}
                      className="w-full rounded-xl border border-emerald-200 bg-white px-4 py-3 text-slate-700 shadow-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="district" className="text-sm font-medium text-emerald-700">
                      ตำบล/แขวง
                    </label>
                    <input
                      id="district"
                      value={address.district}
                      onChange={(event) => handleAddressChange("district", event.target.value)}
                      className="w-full rounded-xl border border-emerald-200 bg-white px-4 py-3 text-slate-700 shadow-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="province" className="text-sm font-medium text-emerald-700">
                      จังหวัด
                    </label>
                    <input
                      id="province"
                      value={address.province}
                      onChange={(event) => handleAddressChange("province", event.target.value)}
                      className="w-full rounded-xl border border-emerald-200 bg-white px-4 py-3 text-slate-700 shadow-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="postalCode" className="text-sm font-medium text-emerald-700">
                      รหัสไปรษณีย์
                    </label>
                    <input
                      id="postalCode"
                      value={address.postalCode}
                      onChange={(event) => handleAddressChange("postalCode", event.target.value)}
                      className="w-full rounded-xl border border-emerald-200 bg-white px-4 py-3 text-slate-700 shadow-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                      required
                    />
                  </div>

                  {/* Save Address Checkbox */}
                  <div className="md:col-span-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={saveThisAddress}
                        onChange={(e) => setSaveThisAddress(e.target.checked)}
                        className="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-sm text-slate-700">บันทึกที่อยู่นี้สำหรับการซื้อครั้งต่อไป</span>
                    </label>
                  </div>
                </>
              )}

              <div className="md:col-span-2 space-y-2">
                <label htmlFor="note" className="text-sm font-medium text-emerald-700">
                  หมายเหตุเพิ่มเติม (ถ้ามี)
                </label>
                <textarea
                  id="note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-emerald-200 bg-white px-4 py-3 text-slate-700 shadow-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              <div className="md:col-span-2 mt-6">
                <h3 className="text-xl font-semibold text-emerald-800">รหัสส่วนลด</h3>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                  <input
                    value={couponCode}
                    onChange={(event) => setCouponCode(event.target.value)}
                    placeholder="กรอกรหัสคูปอง"
                    className="flex-1 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-slate-700 shadow-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                  />
                <button
                  type="button"
                  onClick={applyCoupon}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:brightness-110"
                >
                  <DollarSign className="h-4 w-4" /> ใช้รหัสส่วนลด
                </button>
                </div>
                {discountError && <p className="mt-2 text-sm text-rose-500">{discountError}</p>}
                {couponApplied && appliedCoupon && (
                  <p className="mt-2 text-sm text-emerald-600">
                    ใช้รหัส {appliedCoupon.code} ลด {appliedCoupon.discountType === 'percentage' ? `${appliedCoupon.discountValue}%` : `฿${appliedCoupon.discountValue}`} แล้ว 🎉
                  </p>
                )}
              </div>

              <div className="md:col-span-2 mt-6 space-y-4">
                <h3 className="text-xl font-semibold text-emerald-800">วิธีชำระเงิน</h3>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <label className={`flex cursor-pointer flex-col gap-3 rounded-3xl border p-4 transition ${paymentMethod === "cod" ? "border-emerald-500 bg-emerald-50 shadow-md" : "border-emerald-100"}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cod"
                      checked={paymentMethod === "cod"}
                      onChange={() => setPaymentMethod("cod")}
                      className="hidden"
                    />
                    <div className="flex items-center gap-3">
                      <Truck className="h-6 w-6 text-emerald-600" />
                      <span className="text-lg font-semibold text-emerald-800">เก็บเงินปลายทาง (COD)</span>
                    </div>
                    <span className="text-sm text-slate-500">ชำระเงินกับพนักงานจัดส่งเมื่อรับสินค้า</span>
                  </label>

                  <label className={`flex cursor-pointer flex-col gap-3 rounded-3xl border p-4 transition ${paymentMethod === "credit" ? "border-emerald-500 bg-emerald-50 shadow-md" : "border-emerald-100"}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="credit"
                      checked={paymentMethod === "credit"}
                      onChange={() => setPaymentMethod("credit")}
                      className="hidden"
                    />
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-6 w-6 text-emerald-600" />
                      <span className="text-lg font-semibold text-emerald-800">บัตรเครดิต/เดบิต</span>
                    </div>
                    <span className="text-sm text-slate-500">รองรับ Visa, MasterCard, UnionPay</span>
                  </label>

                  <label className={`flex cursor-pointer flex-col gap-3 rounded-3xl border p-4 transition ${paymentMethod === "promptpay" ? "border-emerald-500 bg-emerald-50 shadow-md" : "border-emerald-100"}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="promptpay"
                      checked={paymentMethod === "promptpay"}
                      onChange={() => setPaymentMethod("promptpay")}
                      className="hidden"
                    />
                    <div className="flex items-center gap-3">
                      <QrCode className="h-6 w-6 text-emerald-600" />
                      <span className="text-lg font-semibold text-emerald-800">พร้อมเพย์ (PromptPay)</span>
                    </div>
                    <span className="text-sm text-slate-500">สแกน QR เพื่อชำระเงินด้วย mobile banking</span>
                  </label>

                  <label className={`flex cursor-pointer flex-col gap-3 rounded-3xl border p-4 transition ${paymentMethod === "bank_transfer" ? "border-emerald-500 bg-emerald-50 shadow-md" : "border-emerald-100"}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="bank_transfer"
                      checked={paymentMethod === "bank_transfer"}
                      onChange={() => setPaymentMethod("bank_transfer")}
                      className="hidden"
                    />
                    <div className="flex items-center gap-3">
                      <Banknote className="h-6 w-6 text-emerald-600" />
                      <span className="text-lg font-semibold text-emerald-800">โอนผ่านธนาคาร</span>
                    </div>
                    <span className="text-sm text-slate-500">อัปโหลดสลิปเพื่อยืนยันการชำระเงิน</span>
                  </label>
                </div>

                {(paymentMethod === "promptpay" || paymentMethod === "bank_transfer") && (
                  <div className="mt-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
                    {paymentMethod === "promptpay" && (
                      <div className="flex flex-col items-center gap-4">
                        <p className="text-sm text-slate-600">สแกนเพื่อชำระเงิน</p>
                        <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-white p-4">
                      <Image src={PROMPTPAY_QR} alt="PromptPay QR" width={200} height={200} />
                        </div>
                      </div>
                    )}
                    <div className="mt-6 space-y-2">
                      <label htmlFor="paymentProofUrl" className="text-sm font-medium text-emerald-700">
                        URL ของสลิปการชำระเงิน
                      </label>
                      <input
                        id="paymentProofUrl"
                        type="url"
                        value={paymentProofUrl}
                        onChange={(event) => setPaymentProofUrl(event.target.value)}
                        placeholder="https://example.com/payment-proof.jpg"
                        className="w-full rounded-xl border border-emerald-200 bg-white px-4 py-3 text-slate-700 shadow-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                      />
                      <p className="text-xs text-slate-500">
                        กรุณาอัปโหลดสลิปไปยังบริการอัปโหลดรูปภาพ (เช่น Imgur, Google Drive) แล้วใส่ URL ที่นี่
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {error && <p className="md:col-span-2 text-sm text-rose-500">{error}</p>}

              <div className="md:col-span-2 mt-6 flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-full bg-gradient-to-br from-emerald-500 to-lime-400 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? "กำลังสร้างคำสั่งซื้อ..." : "ยืนยันการชำระเงิน"}
                </button>
                <Link href="/cart" className="text-center text-sm font-medium text-emerald-600 transition hover:text-emerald-700">
                  กลับไปแก้ไขตะกร้า
                </Link>
              </div>
            </form>
          </div>
        </div>

        <div className="w-full max-w-full rounded-3xl border border-emerald-200 bg-white p-6 shadow-xl lg:max-w-sm">
          <h2 className="text-xl font-semibold text-emerald-800">สรุปรายการสั่งซื้อ</h2>
          <div className="mt-4 space-y-3 border-b border-emerald-100 pb-4">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm text-slate-600">
                <span>{item.name} × {item.quantity}</span>
                <span>฿{(item.price * item.quantity).toLocaleString("th-TH")}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <div className="flex justify-between">
              <span>ยอดสินค้า</span>
              <span>฿{cartSubtotal.toLocaleString("th-TH")}</span>
            </div>
            <div className="flex justify-between">
              <span>ส่วนลด</span>
              <span className="text-emerald-600">-฿{discountAmount.toLocaleString("th-TH")}</span>
            </div>
            <div className="flex justify-between">
              <span>ค่าจัดส่ง</span>
              <span>฿{deliveryFee.toLocaleString("th-TH")}</span>
            </div>
            <div className="flex justify-between border-t border-emerald-100 pt-3 text-base font-semibold text-emerald-700">
              <span>ยอดชำระทั้งหมด</span>
              <span>฿{total.toLocaleString("th-TH")}</span>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
            🚚 จัดส่งภายใน 2-4 วันทำการ (ทั่วประเทศ) พร้อมอัปเดตสถานะผ่านอีเมลและหน้า Orders
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

