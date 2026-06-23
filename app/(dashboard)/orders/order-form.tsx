"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createOrder } from "@/lib/channels/normalizeOrder";
import { inputClass, FieldLabel } from "@/components/form";
import { Select } from "@/components/select";
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

// Branded section card + compact item-field label, matching settings-form / FieldLabel so the
// whole page reads as one design system (rounded card, soft shadow, mobile-first padding).
const sectionClass =
  "space-y-4 rounded-2xl border border-line bg-white p-4 shadow-sm shadow-black/[0.03] sm:p-6";
const legendClass = "px-1 text-sm font-bold text-[#332f29]";
const itemLabelClass = "mb-1 block text-xs font-semibold text-[#7a7066]";

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
    <form onSubmit={handleSubmit} className="max-w-4xl space-y-5 sm:space-y-6">
      {/* Channel */}
      <fieldset className={sectionClass}>
        <legend className={legendClass}>Channel</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="channel">Sales channel</FieldLabel>
            <Select
              id="channel"
              value={channel}
              onValueChange={(v) => setChannel(v as OrderChannel)}
              options={CHANNELS.map((c) => ({ value: c.value, label: c.label }))}
              ariaLabel="Sales channel"
            />
          </div>
          <div>
            <FieldLabel htmlFor="source_order_id" hint="(e.g. Amazon order #, optional)">
              Source order ID
            </FieldLabel>
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
      <fieldset className={sectionClass}>
        <legend className={legendClass}>Customer</legend>

        {/* Branded segmented toggle (replaces native radios) */}
        <div
          role="radiogroup"
          aria-label="Customer source"
          className="inline-flex w-full max-w-xs gap-1 rounded-xl border border-line bg-cream-100 p-1"
        >
          <button
            type="button"
            role="radio"
            aria-checked={customerMode === "existing"}
            onClick={() => setCustomerMode("existing")}
            disabled={customers.length === 0}
            className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              customerMode === "existing"
                ? "bg-white text-brand-700 shadow-sm"
                : "text-[#7a7066] hover:text-[#3a352f] disabled:cursor-not-allowed disabled:text-[#c4bbae] disabled:hover:text-[#c4bbae]"
            }`}
          >
            Existing customer
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={customerMode === "new"}
            onClick={() => setCustomerMode("new")}
            className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              customerMode === "new"
                ? "bg-white text-brand-700 shadow-sm"
                : "text-[#7a7066] hover:text-[#3a352f]"
            }`}
          >
            New customer
          </button>
        </div>

        {customerMode === "existing" ? (
          <div>
            <FieldLabel htmlFor="customer">Select customer</FieldLabel>
            <Select
              id="customer"
              value={selectedCustomerId}
              onValueChange={(v) => pickCustomer(v)}
              searchable
              placeholder="— choose —"
              ariaLabel="Select customer"
              options={[
                { value: "", label: "— choose —" },
                ...customers.map((c) => ({
                  value: c.id,
                  label: c.name,
                  hint: [c.phone, c.city].filter(Boolean).join(" · ") || undefined,
                })),
              ]}
            />
            <p className="mt-1.5 text-xs text-[#a89e90]">
              Ship-to below is prefilled from the customer; edit it to ship elsewhere.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="cust-type">Type</FieldLabel>
              <Select
                id="cust-type"
                value={custType}
                onValueChange={setCustType}
                ariaLabel="Customer type"
                options={[
                  { value: "b2c", label: "B2C (consumer)" },
                  { value: "b2b", label: "B2B (dealer)" },
                ]}
              />
            </div>
            <div>
              <FieldLabel htmlFor="cust-email" hint="(optional)">
                Email
              </FieldLabel>
              <input
                id="cust-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <FieldLabel htmlFor="cust-gstin" hint="(B2B, optional)">
                GSTIN
              </FieldLabel>
              <input
                id="cust-gstin"
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
            <FieldLabel htmlFor="ship-name">
              Name <span className="text-red-600">*</span>
            </FieldLabel>
            <input id="ship-name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required />
          </div>
          <div>
            <FieldLabel htmlFor="ship-phone">Phone</FieldLabel>
            <input id="ship-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} inputMode="tel" />
          </div>
        </div>
        <div>
          <FieldLabel htmlFor="ship-address">Address</FieldLabel>
          <input id="ship-address" value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <FieldLabel htmlFor="ship-city">City</FieldLabel>
            <input id="ship-city" value={city} onChange={(e) => setCity(e.target.value)} className={inputClass} />
          </div>
          <div>
            <FieldLabel htmlFor="ship-state">State</FieldLabel>
            <input id="ship-state" value={stateName} onChange={(e) => setStateName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <FieldLabel htmlFor="ship-pincode">Pincode</FieldLabel>
            <input id="ship-pincode" value={pincode} onChange={(e) => setPincode(e.target.value)} className={inputClass} inputMode="numeric" />
          </div>
        </div>
      </fieldset>

      {/* Items */}
      <fieldset className={sectionClass}>
        <legend className={legendClass}>Items</legend>
        <div className="space-y-3">
          {items.map((r, i) => {
            const qty = Number(r.qty) || 0;
            const price = Number(r.unitPrice) || 0;
            const disc = Number(r.discount) || 0;
            const lineTotal = round2(qty * price - disc);
            return (
              <div
                key={r.key}
                className="rounded-xl border border-line bg-cream-50/70 p-3 sm:p-4"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-[#9a9084]">
                    Item {i + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => setItems((rows) => rows.filter((x) => x.key !== r.key))}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-[#c4bbae] disabled:hover:bg-transparent"
                    disabled={items.length === 1}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                    </svg>
                    Remove
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                  <div className="sm:col-span-7">
                    <label htmlFor={`item-${r.key}-product`} className={itemLabelClass}>Product</label>
                    <Select
                      id={`item-${r.key}-product`}
                      value={r.productId}
                      onValueChange={(v) => onPickProduct(r.key, v)}
                      searchable
                      placeholder="— custom line —"
                      ariaLabel="Product"
                      options={[
                        { value: "", label: "— custom line —" },
                        ...products.map((p) => ({ value: p.id, label: `${p.sku} · ${p.name}` })),
                      ]}
                    />
                  </div>
                  <div className="sm:col-span-5">
                    <label htmlFor={`item-${r.key}-name`} className={itemLabelClass}>Item name</label>
                    <input
                      id={`item-${r.key}-name`}
                      value={r.name}
                      onChange={(e) => updateItem(r.key, { name: e.target.value })}
                      className={inputClass}
                      placeholder="Custom item name"
                    />
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-3">
                  <div>
                    <label htmlFor={`item-${r.key}-qty`} className={itemLabelClass}>Qty</label>
                    <input
                      id={`item-${r.key}-qty`}
                      type="number"
                      min="1"
                      step="1"
                      value={r.qty}
                      onChange={(e) => updateItem(r.key, { qty: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor={`item-${r.key}-price`} className={itemLabelClass}>Unit price (₹)</label>
                    <input
                      id={`item-${r.key}-price`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={r.unitPrice}
                      onChange={(e) => updateItem(r.key, { unitPrice: e.target.value })}
                      className={inputClass}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label htmlFor={`item-${r.key}-discount`} className={itemLabelClass}>Discount (₹)</label>
                    <input
                      id={`item-${r.key}-discount`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={r.discount}
                      onChange={(e) => updateItem(r.key, { discount: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-end gap-2 border-t border-line pt-3 text-sm">
                  <span className="text-[#7a7066]">Line total</span>
                  <span className="font-semibold text-[#332f29]">{formatINR(lineTotal)}</span>
                </div>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setItems((rows) => [...rows, blankRow()])}
          className={`${buttonSecondaryClass} w-full sm:w-auto`}
        >
          + Add item
        </button>
      </fieldset>

      {/* Payment + totals */}
      <fieldset className={sectionClass}>
        <legend className={legendClass}>Payment &amp; totals</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="payment-type">Payment type</FieldLabel>
            <Select
              id="payment-type"
              value={paymentType}
              onValueChange={(v) => setPaymentType(v as PaymentType)}
              options={PAYMENT_TYPES.map((p) => ({ value: p.value, label: p.label }))}
              ariaLabel="Payment type"
            />
          </div>
          <div>
            <FieldLabel htmlFor="payment-status">Payment status</FieldLabel>
            <Select
              id="payment-status"
              value={paymentStatus}
              onValueChange={(v) => setPaymentStatus(v as PaymentStatus)}
              options={PAYMENT_STATUSES.map((p) => ({ value: p.value, label: p.label }))}
              ariaLabel="Payment status"
            />
          </div>
          <div>
            <FieldLabel htmlFor="shipping">Shipping charge (₹)</FieldLabel>
            <input
              id="shipping"
              type="number"
              min="0"
              step="0.01"
              value={shipping}
              onChange={(e) => setShipping(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <FieldLabel htmlFor="order-discount">Order discount (₹)</FieldLabel>
            <input
              id="order-discount"
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
          <FieldLabel htmlFor="notes">Notes</FieldLabel>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className={inputClass}
          />
        </div>

        {/* Highlighted order summary */}
        <dl className="space-y-1.5 rounded-xl border border-line bg-cream-50/70 p-4 text-sm">
          <div className="flex justify-between text-[#7a7066]">
            <dt>Subtotal</dt>
            <dd className="font-medium text-[#3a352f]">{formatINR(totals.subtotal)}</dd>
          </div>
          <div className="flex justify-between text-[#7a7066]">
            <dt>Discount</dt>
            <dd className="font-medium text-[#3a352f]">−{formatINR(totals.discountTotal)}</dd>
          </div>
          <div className="flex justify-between text-[#7a7066]">
            <dt>Shipping</dt>
            <dd className="font-medium text-[#3a352f]">{formatINR(totals.ship)}</dd>
          </div>
          <div className="mt-1 flex justify-between border-t border-line pt-2.5 text-base font-bold text-[#332f29]">
            <dt>Total</dt>
            <dd>{formatINR(totals.total)}</dd>
          </div>
        </dl>
      </fieldset>

      {error && (
        <p className="rounded-xl border-l-4 border-red-400 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
      {duplicate && (
        <p className="rounded-xl border-l-4 border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This order already exists as{" "}
          <Link href={`/orders/${duplicate.id}`} className="font-semibold underline">
            {duplicate.no}
          </Link>{" "}
          (same channel + source order ID). No duplicate was created.
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={submitting}
          className={`${buttonPrimaryClass} w-full sm:w-auto`}
        >
          {submitting ? "Creating…" : "Create order"}
        </button>
        <Link href="/orders" className={`${buttonSecondaryClass} w-full sm:w-auto`}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
