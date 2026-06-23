// The single canonical order shape every channel maps into (manual form now; website
// intake + Amazon CSV later). Adapters produce a NormalizedOrder; createOrder persists it.
// See docs/03-channels.md.

import type {
  OrderChannel,
  PaymentType,
  PaymentStatus,
  CustomerType,
} from "@/lib/types";

export type NormalizedItem = {
  product_id?: string | null;
  sku?: string | null;
  name?: string | null;
  qty: number;
  unit_price: number;
  discount?: number;
  tax?: number;
};

export type NormalizedCustomer = {
  id?: string | null;
  name: string;
  phone?: string | null;
  email?: string | null;
  type?: CustomerType;
  gstin?: string | null;
  address_line?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
};

export type NormalizedOrder = {
  channel: OrderChannel;
  source_order_id?: string | null;
  customer: NormalizedCustomer;
  items: NormalizedItem[];
  payment_type: PaymentType;
  payment_status?: PaymentStatus;
  shipping_charge?: number;
  discount?: number;
  notes?: string | null;
  source_payload?: unknown;
};

export type CreateOrderResult =
  | { ok: true; order_id: string; order_no: string; duplicate: boolean }
  | { ok: false; error: string };
