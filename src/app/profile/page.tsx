'use client';

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Store as StoreIcon,
  Camera,
  Edit,
  Save,
  X,
  Plus,
  Trash2,
  Star
} from "lucide-react";
import { useAuthContext } from "../providers/AuthProvider";
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { firestore } from "@/lib/firebaseClient";

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

export default function ProfilePage() {
  const { profile, firebaseUser } = useAuthContext();
  const [isEditing, setIsEditing] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    shopName: "",
    shopDescription: "",
  });
  const [loading, setLoading] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);
  const [addressForm, setAddressForm] = useState<Omit<SavedAddress, 'id'>>({
    label: "",
    fullName: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    district: "",
    province: "",
    postalCode: "",
    isDefault: false
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        phone: profile.phone || "",
        address: profile.address || "",
        shopName: profile.shopName || "",
        shopDescription: profile.shopDescription || "",
      });
      setImageUrl(profile.profileImage || "");
      setSavedAddresses(profile.savedAddresses || []);
    }
  }, [profile]);

  const handleSave = async () => {
    if (!firebaseUser) return;
    
    try {
      setLoading(true);
      const userRef = doc(firestore, "users", firebaseUser.uid);
      await updateDoc(userRef, {
        ...formData,
        profileImage: imageUrl,
      });
      setIsEditing(false);
      alert("บันทึกข้อมูลสำเร็จ!");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAddress = async () => {
    if (!firebaseUser) return;
    
    try {
      setLoading(true);
      const userRef = doc(firestore, "users", firebaseUser.uid);
      
      if (editingAddress) {
        // Update existing address
        const updatedAddresses = savedAddresses.map(addr => 
          addr.id === editingAddress.id ? { ...addressForm, id: editingAddress.id } : addr
        );
        await updateDoc(userRef, { savedAddresses: updatedAddresses });
        setSavedAddresses(updatedAddresses);
      } else {
        // Add new address
        const newAddress = { ...addressForm, id: Date.now().toString() };
        await updateDoc(userRef, { 
          savedAddresses: arrayUnion(newAddress) 
        });
        setSavedAddresses([...savedAddresses, newAddress]);
      }
      
      // Reset form
      setAddressForm({
        label: "",
        fullName: "",
        phone: "",
        addressLine1: "",
        addressLine2: "",
        district: "",
        province: "",
        postalCode: "",
        isDefault: false
      });
      setShowAddressForm(false);
      setEditingAddress(null);
      alert("บันทึกที่อยู่สำเร็จ!");
    } catch (error) {
      console.error("Error saving address:", error);
      alert("เกิดข้อผิดพลาดในการบันทึกที่อยู่");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!firebaseUser || !confirm("คุณต้องการลบที่อยู่นี้หรือไม่?")) return;
    
    try {
      setLoading(true);
      const userRef = doc(firestore, "users", firebaseUser.uid);
      const addressToDelete = savedAddresses.find(addr => addr.id === addressId);
      
      await updateDoc(userRef, { 
        savedAddresses: arrayRemove(addressToDelete) 
      });
      setSavedAddresses(savedAddresses.filter(addr => addr.id !== addressId));
      alert("ลบที่อยู่สำเร็จ!");
    } catch (error) {
      console.error("Error deleting address:", error);
      alert("เกิดข้อผิดพลาดในการลบที่อยู่");
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefaultAddress = async (addressId: string) => {
    if (!firebaseUser) return;
    
    try {
      setLoading(true);
      const userRef = doc(firestore, "users", firebaseUser.uid);
      const updatedAddresses = savedAddresses.map(addr => ({
        ...addr,
        isDefault: addr.id === addressId
      }));
      
      await updateDoc(userRef, { savedAddresses: updatedAddresses });
      setSavedAddresses(updatedAddresses);
      alert("ตั้งเป็นที่อยู่หลักสำเร็จ!");
    } catch (error) {
      console.error("Error setting default address:", error);
      alert("เกิดข้อผิดพลาดในการตั้งที่อยู่หลัก");
    } finally {
      setLoading(false);
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">กรุณาเข้าสู่ระบบ</h1>
          <Link href="/login" className="mt-4 inline-block text-emerald-600 hover:underline font-medium">
            ไปที่หน้าเข้าสู่ระบบ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/40 via-white to-white">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
        <Link 
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-emerald-600 transition mb-8"
        >
          <ArrowLeft className="h-4 w-4" /> กลับสู่หน้าแรก
        </Link>

        <div className="bg-white rounded-3xl shadow-lg overflow-hidden border border-slate-100">
          {/* Header Section */}
          <div className="bg-gradient-to-br from-emerald-500 to-lime-400 h-32"></div>
          
          {/* Profile Content */}
          <div className="px-8 pb-8">
            {/* Profile Image */}
            <div className="relative -mt-16 mb-6">
              <div className="relative inline-block">
                <div className="h-32 w-32 rounded-full border-4 border-white bg-slate-100 overflow-hidden shadow-xl">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={`${profile.firstName} ${profile.lastName}`}
                      width={128}
                      height={128}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-400 to-lime-300">
                      <User className="h-16 w-16 text-white" />
                    </div>
                  )}
                </div>
                {isEditing && (
                  <button className="absolute bottom-0 right-0 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg hover:bg-emerald-700 transition">
                    <Camera className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Edit/Save Buttons */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">
                  {profile.firstName} {profile.lastName}
                </h1>
                <p className="text-slate-600 mt-1 capitalize">{profile.role}</p>
              </div>
              
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  <Edit className="h-4 w-4" /> แก้ไขโปรไฟล์
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <X className="h-4 w-4" /> ยกเลิก
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" /> {loading ? "กำลังบันทึก..." : "บันทึก"}
                  </button>
                </div>
              )}
            </div>

            {/* Profile Information */}
            <div className="space-y-6">
              {/* Email */}
              <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 flex-shrink-0">
                  <Mail className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium text-slate-500">อีเมล</label>
                  <p className="text-base font-semibold text-slate-900 mt-1">{profile.email}</p>
                </div>
              </div>

              {/* First Name */}
              <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 flex-shrink-0">
                  <User className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium text-slate-500">ชื่อ</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="mt-1 w-full rounded-lg border-2 border-slate-200 px-4 py-2 text-base font-semibold text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                    />
                  ) : (
                    <p className="text-base font-semibold text-slate-900 mt-1">{profile.firstName}</p>
                  )}
                </div>
              </div>

              {/* Last Name */}
              <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 flex-shrink-0">
                  <User className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium text-slate-500">นามสกุล</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="mt-1 w-full rounded-lg border-2 border-slate-200 px-4 py-2 text-base font-semibold text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                    />
                  ) : (
                    <p className="text-base font-semibold text-slate-900 mt-1">{profile.lastName}</p>
                  )}
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 flex-shrink-0">
                  <Phone className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium text-slate-500">เบอร์โทรศัพท์</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="กรุณาระบุเบอร์โทรศัพท์"
                      className="mt-1 w-full rounded-lg border-2 border-slate-200 px-4 py-2 text-base font-semibold text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                    />
                  ) : (
                    <p className="text-base font-semibold text-slate-900 mt-1">{profile.phone || "ยังไม่ได้ระบุ"}</p>
                  )}
                </div>
              </div>

              {/* Address */}
              <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 flex-shrink-0">
                  <MapPin className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium text-slate-500">ที่อยู่</label>
                  {isEditing ? (
                    <textarea
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="กรุณาระบุที่อยู่"
                      rows={3}
                      className="mt-1 w-full rounded-lg border-2 border-slate-200 px-4 py-2 text-base font-semibold text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                    />
                  ) : (
                    <p className="text-base font-semibold text-slate-900 mt-1 whitespace-pre-line">{profile.address || "ยังไม่ได้ระบุ"}</p>
                  )}
                </div>
              </div>

              {/* Shop Name - Only for sellers */}
              {(profile.role === 'seller' || profile.role === 'admin') && (
                <div className="flex items-start gap-4 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 flex-shrink-0">
                    <StoreIcon className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-medium text-slate-500">ชื่อร้านค้า</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.shopName}
                        onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                        placeholder="กรุณาระบุชื่อร้านค้า"
                        className="mt-1 w-full rounded-lg border-2 border-emerald-200 px-4 py-2 text-base font-semibold text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                      />
                    ) : (
                      <p className="text-base font-semibold text-slate-900 mt-1">{profile.shopName || "ยังไม่ได้ระบุ"}</p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">ชื่อนี้จะแสดงในการค้นหาและหน้าสินค้า</p>
                  </div>
                </div>
              )}

              {/* Shop Description - Only for sellers */}
              {(profile.role === 'seller' || profile.role === 'admin') && (
                <div className="flex items-start gap-4 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 flex-shrink-0">
                    <StoreIcon className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-medium text-slate-500">คำอธิบายร้านค้า</label>
                    {isEditing ? (
                      <textarea
                        value={formData.shopDescription}
                        onChange={(e) => setFormData({ ...formData, shopDescription: e.target.value })}
                        placeholder="บอกเล่าเกี่ยวกับร้านค้าของคุณ"
                        rows={3}
                        className="mt-1 w-full rounded-lg border-2 border-emerald-200 px-4 py-2 text-base font-semibold text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                      />
                    ) : (
                      <p className="text-base font-semibold text-slate-900 mt-1 whitespace-pre-line">{profile.shopDescription || "ยังไม่ได้ระบุ"}</p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">อธิบายเกี่ยวกับร้านและสินค้าของคุณ</p>
                  </div>
                </div>
              )}

              {/* Profile Image URL (for editing) */}
              {isEditing && (
                <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 flex-shrink-0">
                    <Camera className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-medium text-slate-500">URL รูปโปรไฟล์</label>
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://example.com/profile.jpg"
                      className="mt-1 w-full rounded-lg border-2 border-slate-200 px-4 py-2 text-base font-semibold text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>
                </div>
              )}

              {/* Saved Addresses Section */}
              <div className="mt-8 pt-6 border-t-2 border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-slate-900">ที่อยู่ที่บันทึกไว้</h2>
                  <button
                    onClick={() => {
                      setShowAddressForm(true);
                      setEditingAddress(null);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                  >
                    <Plus className="h-4 w-4" /> เพิ่มที่อยู่ใหม่
                  </button>
                </div>

                {/* Address Form */}
                {showAddressForm && (
                  <div className="mb-4 p-6 rounded-xl bg-emerald-50 border-2 border-emerald-200">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">
                      {editingAddress ? "แก้ไขที่อยู่" : "เพิ่มที่อยู่ใหม่"}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="ชื่อที่อยู่ (เช่น บ้าน, ที่ทำงาน)"
                        value={addressForm.label}
                        onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
                        className="rounded-lg border-2 border-slate-200 px-4 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                      />
                      <input
                        type="text"
                        placeholder="ชื่อ-นามสกุล ผู้รับ"
                        value={addressForm.fullName}
                        onChange={(e) => setAddressForm({ ...addressForm, fullName: e.target.value })}
                        className="rounded-lg border-2 border-slate-200 px-4 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                      />
                      <input
                        type="tel"
                        placeholder="เบอร์โทรศัพท์"
                        value={addressForm.phone}
                        onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                        className="rounded-lg border-2 border-slate-200 px-4 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                      />
                      <input
                        type="text"
                        placeholder="รหัสไปรษณีย์"
                        value={addressForm.postalCode}
                        onChange={(e) => setAddressForm({ ...addressForm, postalCode: e.target.value })}
                        className="rounded-lg border-2 border-slate-200 px-4 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                      />
                      <input
                        type="text"
                        placeholder="ที่อยู่บรรทัดที่ 1"
                        value={addressForm.addressLine1}
                        onChange={(e) => setAddressForm({ ...addressForm, addressLine1: e.target.value })}
                        className="md:col-span-2 rounded-lg border-2 border-slate-200 px-4 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                      />
                      <input
                        type="text"
                        placeholder="ที่อยู่บรรทัดที่ 2 (ถ้ามี)"
                        value={addressForm.addressLine2}
                        onChange={(e) => setAddressForm({ ...addressForm, addressLine2: e.target.value })}
                        className="md:col-span-2 rounded-lg border-2 border-slate-200 px-4 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                      />
                      <input
                        type="text"
                        placeholder="เขต/อำเภอ"
                        value={addressForm.district}
                        onChange={(e) => setAddressForm({ ...addressForm, district: e.target.value })}
                        className="rounded-lg border-2 border-slate-200 px-4 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                      />
                      <input
                        type="text"
                        placeholder="จังหวัด"
                        value={addressForm.province}
                        onChange={(e) => setAddressForm({ ...addressForm, province: e.target.value })}
                        className="rounded-lg border-2 border-slate-200 px-4 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                      <button
                        onClick={handleSaveAddress}
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <Save className="h-4 w-4" /> บันทึก
                      </button>
                      <button
                        onClick={() => {
                          setShowAddressForm(false);
                          setEditingAddress(null);
                          setAddressForm({
                            label: "",
                            fullName: "",
                            phone: "",
                            addressLine1: "",
                            addressLine2: "",
                            district: "",
                            province: "",
                            postalCode: "",
                            isDefault: false
                          });
                        }}
                        className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <X className="h-4 w-4" /> ยกเลิก
                      </button>
                    </div>
                  </div>
                )}

                {/* Address List */}
                <div className="space-y-3">
                  {savedAddresses.length === 0 ? (
                    <p className="text-center text-slate-500 py-8">ยังไม่มีที่อยู่ที่บันทึกไว้</p>
                  ) : (
                    savedAddresses.map((address) => (
                      <div
                        key={address.id}
                        className={`p-4 rounded-xl border-2 ${
                          address.isDefault
                            ? "border-emerald-500 bg-emerald-50"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-slate-900">{address.label}</h3>
                              {address.isDefault && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-semibold text-white">
                                  <Star className="h-3 w-3 fill-current" /> ที่อยู่หลัก
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-700 font-medium">{address.fullName}</p>
                            <p className="text-sm text-slate-600">{address.phone}</p>
                            <p className="text-sm text-slate-600 mt-1">
                              {address.addressLine1}
                              {address.addressLine2 && `, ${address.addressLine2}`}
                            </p>
                            <p className="text-sm text-slate-600">
                              {address.district}, {address.province} {address.postalCode}
                            </p>
                          </div>
                          <div className="flex flex-col gap-2 ml-4">
                            {!address.isDefault && (
                              <button
                                onClick={() => handleSetDefaultAddress(address.id)}
                                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                              >
                                ตั้งเป็นหลัก
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setEditingAddress(address);
                                setAddressForm(address);
                                setShowAddressForm(true);
                              }}
                              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                            >
                              แก้ไข
                            </button>
                            <button
                              onClick={() => handleDeleteAddress(address.id)}
                              className="text-xs text-rose-600 hover:text-rose-700 font-medium"
                            >
                              ลบ
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Shop Link for Sellers/Admins */}
              {(profile.role === "seller" || profile.role === "admin") && (
                <Link
                  href="/my-shop"
                  className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-br from-emerald-500 to-lime-400 text-white hover:brightness-110 transition shadow-lg"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 flex-shrink-0">
                    <StoreIcon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">ไปที่ร้านของฉัน</p>
                    <p className="text-sm text-white/80">จัดการสินค้าและคำสั่งซื้อ</p>
                  </div>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
