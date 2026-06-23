"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createOrder } from "@/lib/channels/normalizeOrder";
import { inputClass } from "@/components/form";
import { buttonPrimaryClass, buttonSecondaryClass } from "@/components/page-header";
import { formatINR, round2 } from "@/lib/money";
import type {
  NormalizedOrder,
  NormalizedItem,
  NormalizedCustomer,
} from "@/lib/channels/types";
import type { OrderChannel, PaymentType, PaymentStatus } from "@/lib/types";

type ProductOption = {
  id: string;
  sku: string;
  name: string;
  price: number;
};
type CustomerOption = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  type: string;
  address_line: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
};

const CHANNELS: { value: OrderChannel; label: string }[] = [
  { value: "manual", label: "Manual / walk-in" },
  { value: "amazon", label: "Amazon" },
  { value: "instagram", label: "Instagram" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "phone", label: "Phone" },
  { value: "b2b", label: "B2B / dealer" },
];

const PAYMENT_TYPES: { value: PaymentType; label: string }[] = [
  { value: "prepaid", label: "Prepaid" },
  { value: "cod", label: "COD" },
  { value: "pending", label: "Pending" },
];

const PAYMENT_STATUSES: { value: PaymentStatus; label: string }[] = [
  { value: "unpaid", label: "Unpaid" },
  { value: "paid", label: "Paid" },
  { value: "partially_paid", label: "Partially paid" },
  { value: "refunded", label: "Refunded" },
];

type ItemRow = {
  key: number;
  productId: string;
  sku: string;
  name: string;
  qty: string;
  unitPrice: string;
  discount: string;
};

let rowSeq = 0;
const blankRow = (): ItemRow => ({
  key: rowSeq++,
  productId: "",
  sku: "",
  name: "",
  qty: "1",
  unitPrice: "",
  discount: "0",
});

export function OrderForm({
  products,
  customers,
}: {
  products: ProductOption[];
  customers: CustomerOption[];
}) {
  const router = useRouter();
  const productById = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products],
  );

  const [channel, setChannel] = useState<OrderChannel>("manual");
  const [sourceOrderId, setSourceOrderId] = useState("");

  const [customerMode, setCustomerMode] = useState<"existing" | "new">(
    customers.length > 0 ? "existing" : "new",
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState("");

  // Shared ship-to / customer fields (in "new" mode these also create the customer record).
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [custType, setCustType] = useState("b2c");
  const [gstin, setGstin] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [pincode, setPincode] = useState("");

  const [items, setItems] = useState<ItemRow[]>([blankRow()]);

  const [paymentType, setPaymentType] = useState<PaymentType>("prepaid");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("unpaid");
  const [shipping, setShipping] = useState("0");
  const [orderDiscount, setOrderDiscount] = useState("0");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<{ id: string; no: string } | null>(null);

  function pickCustomer(id: string) {
    setSelectedCustomerId(id);
    const c = customers.find((x) => x.id === id);
    if (c) {
      setName(c.name);
      setPhone(c.phone ?? "");
      setEmail(c.email ?? "");
      setAddress(c.address_line ?? "");
      setCity(c.city ?? "");
      setStateName(c.state ?? "");
      setPincode(c.pincode ?? "");
    }
  }

  function updateItem(key: number, patch: Partial<ItemRow>) {
    setItems((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function onPickProduct(key: number, productId: string) {
    if (!productId) {
      updateItem(key, { productId: "" });
      return;
    }
    const p = productById.get(productId);
    if (p) {
      updateItem(key, {
        productId,
        sku: p.sku,
        name: p.name,
        unitPrice: String(p.price),
      });
    }
  }

  const totals = useMemo(() => {
    let subtotal = 0;
    let lineDiscount = 0;
    for (const r of items) {
      const qty = Number(r.qty) || 0;
      const price = Number(r.unitPrice) || 0;
      const disc = Number(r.discount) || 0;
      if (qty <= 0) continue;
      subtotal = round2(subtotal + qty * price);
      lineDiscount = round2(lineDiscount + disc);
    }
    const ship = Number(shipping) || 0;
    const ordDisc = Number(orderDiscount) || 0;
    const discountTotal = round2(lineDiscount + ordDisc);
    const total = round2(subtotal - discountTotal + ship);
    return { subtotal, discountTotal, ship, total };
  }, [items, shipping, orderDiscount]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDuplicate(null);

    if (!name.trim()) {
      setError("Customer name is required.");
      return;
    }
    if (customerMode === "existing" && !selectedCustomerId) {
      setError("Pick a customer or switch to “New customer”.");
      return;
    }

    const lineItems: NormalizedItem[] = items
      .filter((r) => (Number(r.qty) || 0) > 0 && (r.productId || r.name.trim() || r.sku.trim()))
      .map((r) => ({
        product_id: r.productId || null,
        sku: r.sku.trim() || null,
        name: r.name.trim() || null,
        qty: Math.trunc(Number(r.qty) || 0),
        unit_price: Number(r.unitPrice) || 0,
        discount: Number(r.discount) || 0,
      }));

    if (lineItems.length === 0) {
      setError("Add at least one item with a quantity.");
      return;
    }

    const customer: NormalizedCustomer =
      customerMode === "existing"
        ? {
            id: selectedCustomerId,
            name: name.trim(),
            phone: phone.trim() || null,
            address_line: address.trim() || null,
            city: city.trim() || null,
            state: stateName.trim() || null,
            pincode: pincode.trim() || null,
          }
        : {
            name: name.trim(),
            phone: phone.trim() || null,
            email: email.trim() || null,
            type: custType === "b2b" ? "b2b" : "b2c",
            gstin: gstin.trim() || null,
            address_line: address.trim() || null,
            city: city.trim() || null,
            state: stateName.trim() || null,
            pincode: pincode.trim() || null,
          };

    const payload: NormalizedOrder = {
      channel,
      source_order_id: sourceOrderId.trim() || null,
      customer,
      items: lineItems,
      payment_type: paymentType,
      payment_status: paymentStatus,
      shipping_charge: Number(shipping) || 0,
      discount: Number(orderDiscount) || 0,
      notes: notes.trim() || null,
    };

    setSubmitting(true);
    const result = await createOrder(payload);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (result.duplicate) {
      setDuplicate({ id: result.order_id, no: result.order_no });
      return;
    }
    router.push(`/orders/${result.order_id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
      {/* Channel */}
      <fieldset className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
        <legend className="px-1 text-sm font-semibold text-gray-900">Channel</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="channel" className="mb-1 block text-sm font-medium text-gray-700">
              Sales channel
            </label>
            <select
              id="channel"
              value={channel}
              onChange={(e) => setChannel(e.target.value as OrderChannel)}
              className={inputClass}
            >
              {CHANNELS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="source_order_id"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Source order ID{" "}
              <span className="font-normal text-gray-400">
                (e.g. Amazon order #, optional)
              </span>
            </label>
            <input
              id="source_order_id"
              value={sourceOrderId}
              onChange={(e) => setSourceOrderId(e.target.value)}
              className={inputClass}
              placeholder="171-1234567-1234567"
            />
          </div>
        </div>
      </fieldset>

      {/* Customer */}
      <fieldset className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
        <legend className="px-1 text-sm font-semibold text-gray-900">Customer</legend>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="customerMode"
              checked={customerMode === "existing"}
              onChange={() => setCustomerMode("existing")}
              disabled={customers.length === 0}
            />
            Existing customer
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="customerMode"
              checked={customerMode === "new"}
              onChange={() => setCustomerMode("new")}
            />
            New customer
          </label>
        </div>

        {customerMode === "existing" ? (
          <div>
            <label htmlFor="customer" className="mb-1 block text-sm font-medium text-gray-700">
              Select customer
            </label>
            <select
              id="customer"
              value={selectedCustomerId}
              onChange={(e) => pickCustomer(e.target.value)}
              className={inputClass}
            >
              <option value="">— choose —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.phone ? ` · ${c.phone}` : ""}
                  {c.city ? ` · ${c.city}` : ""}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-400">
              Ship-to below is prefilled from the customer; edit it to ship elsewhere.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Type</label>
              <select
                value={custType}
                onChange={(e) => setCustType(e.target.value)}
                className={inputClass}
              >
                <option value="b2c">B2C (consumer)</option>
                <option value="b2b">B2B (dealer)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Email <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                GSTIN <span className="font-normal text-gray-400">(B2B, optional)</span>
              </label>
              <input
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        )}

        {/* Ship-to (shared) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Name <span className="text-red-600">*</span>
            </label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Address</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">City</label>
            <input value={city} onChange={(e) => setCity(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">State</label>
            <input value={stateName} onChange={(e) => setStateName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Pincode</label>
            <input value={pincode} onChange={(e) => setPincode(e.target.value)} className={inputClass} inputMode="numeric" />
          </div>
        </div>
      </fieldset>

      {/* Items */}
      <fieldset className="space-y-3 rounded-xl border border-gray-200 bg-white p-6">
        <legend className="px-1 text-sm font-semibold text-gray-900">Items</legend>
        <div className="space-y-3">
          {items.map((r) => {
            const qty = Number(r.qty) || 0;
            const price = Number(r.unitPrice) || 0;
            const disc = Number(r.discount) || 0;
            const lineTotal = round2(qty * price - disc);
            return (
              <div
                key={r.key}
                className="grid grid-cols-1 gap-3 rounded-lg border border-gray-100 bg-gray-50/60 p-3 sm:grid-cols-12"
              >
                <div className="sm:col-span-4">
                  <label className="mb-1 block text-xs font-medium text-gray-500">Product</label>
                  <select
                    value={r.productId}
                    onChange={(e) => onPickProduct(r.key, e.target.value)}
                    className={inputClass}
                  >
                    <option value="">— custom line —</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.sku} · {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-3">
                  <label className="mb-1 block text-xs font-medium text-gray-500">
                    Item name
                  </label>
                  <input
                    value={r.name}
                    onChange={(e) => updateItem(r.key, { name: e.target.value })}
                    className={inputClass}
                    placeholder="Item name"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="mb-1 block text-xs font-medium text-gray-500">Qty</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={r.qty}
                    onChange={(e) => updateItem(r.key, { qty: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-500">
                    Unit price
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={r.unitPrice}
                    onChange={(e) => updateItem(r.key, { unitPrice: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-2 flex items-end justify-between gap-2">
                  <div className="grow">
                    <label className="mb-1 block text-xs font-medium text-gray-500">
                      Discount
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={r.discount}
                      onChange={(e) => updateItem(r.key, { discount: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                </div>
                <div className="sm:col-span-12 flex items-center justify-between border-t border-gray-100 pt-2 text-sm">
                  <span className="text-gray-500">
                    Line total: <span className="font-medium text-gray-900">{formatINR(lineTotal)}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setItems((rows) => rows.filter((x) => x.key !== r.key))}
                    className="text-sm font-medium text-red-600 hover:underline disabled:text-gray-300"
                    disabled={items.length === 1}
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setItems((rows) => [...rows, blankRow()])}
          className={buttonSecondaryClass}
        >
          + Add item
        </button>
      </fieldset>

      {/* Payment + totals */}
      <fieldset className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
        <legend className="px-1 text-sm font-semibold text-gray-900">Payment & totals</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Payment type</label>
            <select
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value as PaymentType)}
              className={inputClass}
            >
              {PAYMENT_TYPES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Payment status</label>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
              className={inputClass}
            >
              {PAYMENT_STATUSES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Shipping charge</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={shipping}
              onChange={(e) => setShipping(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Order discount</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={orderDiscount}
              onChange={(e) => setOrderDiscount(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className={inputClass}
          />
        </div>

        <div className="space-y-1 border-t border-gray-100 pt-4 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>{formatINR(totals.subtotal)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Discount</span>
            <span>−{formatINR(totals.discountTotal)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Shipping</span>
            <span>{formatINR(totals.ship)}</span>
          </div>
          <div className="flex justify-between pt-1 text-base font-semibold text-gray-900">
            <span>Total</span>
            <span>{formatINR(totals.total)}</span>
          </div>
        </div>
      </fieldset>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      {duplicate && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          This order already exists as{" "}
          <Link href={`/orders/${duplicate.id}`} className="font-semibold underline">
            {duplicate.no}
          </Link>{" "}
          (same channel + source order ID). No duplicate was created.
        </p>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={submitting} className={`${buttonPrimaryClass} disabled:opacity-60`}>
          {submitting ? "Creating…" : "Create order"}
        </button>
        <Link href="/orders" className={buttonSecondaryClass}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
