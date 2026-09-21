import { jsPDF } from "jspdf";

export type InvoiceOrder = {
  id: string;
  createdAt?: Date;
  items?: Array<{ name?: string; price?: number; quantity?: number }>;
  subtotal?: number;
  discountAmount?: number;
  discountCode?: string | null;
  deliveryFee?: number;
  total?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  shippingAddress?: {
    fullName?: string;
    phone?: string;
    addressLine1?: string;
    addressLine2?: string;
    district?: string;
    province?: string;
    postalCode?: string;
  };
};

// Base64-encoded TTF files; jsPDF's built-in fonts have no Thai glyphs
export type InvoiceFonts = { regular: string; bold: string };

const FONT_FAMILY = "Sarabun";
const FONT_URLS = {
  regular: "/fonts/Sarabun-Regular.ttf",
  bold: "/fonts/Sarabun-Bold.ttf",
};

const PAGE_MARGIN = 20;
const LINE_HEIGHT_PER_PT = 0.55;

const PAYMENT_METHOD_TH: Record<string, string> = {
  cod: "เก็บเงินปลายทาง",
  credit: "บัตรเครดิต/เดบิต",
  promptpay: "พร้อมเพย์",
  bank_transfer: "โอนผ่านธนาคาร",
};

const PAYMENT_STATUS_TH: Record<string, string> = {
  pending: "รอชำระเงิน",
  awaiting_confirmation: "รอตรวจสอบการชำระเงิน",
  paid: "ชำระเงินแล้ว",
};

const formatBaht = (value: number) =>
  `฿${value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type TextOptions = { size?: number; bold?: boolean; align?: "left" | "center" | "right"; muted?: boolean };

export function buildInvoicePdf(order: InvoiceOrder, fonts: InvoiceFonts): jsPDF {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  pdf.addFileToVFS("Sarabun-Regular.ttf", fonts.regular);
  pdf.addFont("Sarabun-Regular.ttf", FONT_FAMILY, "normal");
  pdf.addFileToVFS("Sarabun-Bold.ttf", fonts.bold);
  pdf.addFont("Sarabun-Bold.ttf", FONT_FAMILY, "bold");

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const right = pageWidth - PAGE_MARGIN;
  const contentWidth = right - PAGE_MARGIN;
  let y = PAGE_MARGIN;

  const applyStyle = ({ size = 11, bold = false, muted = false }: TextOptions) => {
    pdf.setFont(FONT_FAMILY, bold ? "bold" : "normal");
    pdf.setFontSize(size);
    pdf.setTextColor(muted ? 110 : 20);
    return size * LINE_HEIGHT_PER_PT;
  };

  const ensureSpace = (height: number) => {
    if (y + height > pageHeight - PAGE_MARGIN) {
      pdf.addPage();
      y = PAGE_MARGIN;
    }
  };

  const write = (text: string, options: TextOptions = {}) => {
    const lineHeight = applyStyle(options);
    const align = options.align ?? "left";
    const x = align === "center" ? pageWidth / 2 : align === "right" ? right : PAGE_MARGIN;
    const lines: string[] = pdf.splitTextToSize(text, contentWidth);
    for (const line of lines) {
      ensureSpace(lineHeight);
      pdf.text(line, x, y, { align });
      y += lineHeight;
    }
  };

  // Label on the left (wrapped if long), value right-aligned on the first line
  const row = (label: string, value: string, options: TextOptions = {}) => {
    const lineHeight = applyStyle(options);
    const labelWidth = contentWidth - pdf.getTextWidth(value) - 6;
    const labelLines: string[] = pdf.splitTextToSize(label, labelWidth);
    ensureSpace(lineHeight);
    pdf.text(value, right, y, { align: "right" });
    labelLines.forEach((line, index) => {
      if (index > 0) {
        ensureSpace(lineHeight);
      }
      pdf.text(line, PAGE_MARGIN, y);
      y += lineHeight;
    });
  };

  const divider = () => {
    ensureSpace(6);
    y += 1;
    pdf.setDrawColor(210);
    pdf.line(PAGE_MARGIN, y, right, y);
    y += 6;
  };

  const createdAt = order.createdAt ? order.createdAt.toLocaleString("th-TH") : "-";
  const subtotal = order.subtotal ?? 0;
  const discountAmount = order.discountAmount ?? 0;
  const total = order.total ?? 0;
  // Orders don't store the delivery fee, so derive it from the totals
  const deliveryFee = order.deliveryFee ?? Math.max(0, total - Math.max(0, subtotal - discountAmount));
  const address = order.shippingAddress ?? {};

  write("PlantHub", { size: 20, bold: true, align: "center" });
  write("ใบเสร็จรับเงิน / INVOICE", { size: 14, bold: true, align: "center" });
  y += 4;

  row(`เลขที่ใบเสร็จ: ${order.id}`, `วันที่: ${createdAt}`, { size: 10, muted: true });
  divider();

  write("ข้อมูลลูกค้า", { size: 12, bold: true });
  write(address.fullName || "-");
  write(address.addressLine1 || "-");
  if (address.addressLine2) {
    write(address.addressLine2);
  }
  write([address.district, address.province, address.postalCode].filter(Boolean).join(" ") || "-");
  write(`โทรศัพท์: ${address.phone || "-"}`);
  divider();

  write("รายการสินค้า", { size: 12, bold: true });
  y += 1;
  const items = order.items ?? [];
  if (items.length === 0) {
    write("ไม่มีรายการสินค้า", { muted: true });
  }
  items.forEach((item, index) => {
    const price = item.price ?? 0;
    const quantity = item.quantity ?? 0;
    row(`${index + 1}. ${item.name || "สินค้า"}`, formatBaht(price * quantity));
    write(`จำนวน ${quantity} × ${formatBaht(price)}`, { size: 9, muted: true });
    y += 1;
  });
  divider();

  row("ยอดสินค้า", formatBaht(subtotal));
  row(order.discountCode ? `ส่วนลด (${order.discountCode})` : "ส่วนลด", `-${formatBaht(discountAmount)}`);
  row("ค่าจัดส่ง", formatBaht(deliveryFee));
  y += 1;
  row("ยอดชำระทั้งหมด", formatBaht(total), { size: 13, bold: true });
  divider();

  const paymentMethod = order.paymentMethod ?? "";
  const paymentStatus = order.paymentStatus ?? "";
  row("วิธีชำระเงิน", PAYMENT_METHOD_TH[paymentMethod] ?? (paymentMethod || "-"));
  row("สถานะการชำระเงิน", PAYMENT_STATUS_TH[paymentStatus] ?? (paymentStatus || "-"));

  y += 8;
  write("ใบเสร็จนี้จัดทำโดยระบบอัตโนมัติของ PlantHub", { size: 9, muted: true, align: "center" });

  return pdf;
}

async function fetchFontAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load font: ${url}`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

let fontsPromise: Promise<InvoiceFonts> | null = null;

export function loadInvoiceFonts(): Promise<InvoiceFonts> {
  if (!fontsPromise) {
    fontsPromise = Promise.all([fetchFontAsBase64(FONT_URLS.regular), fetchFontAsBase64(FONT_URLS.bold)])
      .then(([regular, bold]) => ({ regular, bold }))
      .catch((error) => {
        fontsPromise = null;
        throw error;
      });
  }
  return fontsPromise;
}

export async function downloadInvoicePdf(order: InvoiceOrder) {
  const fonts = await loadInvoiceFonts();
  buildInvoicePdf(order, fonts).save(`invoice-${order.id}.pdf`);
}
