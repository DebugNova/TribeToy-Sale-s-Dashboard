import { STATUS_LABEL } from "@/lib/orders/transitions";
import type {
  OrderStatus,
  PaymentStatus,
  OrderChannel,
  FulfillmentState,
} from "@/lib/types";

function Badge({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}
    >
      {label}
    </span>
  );
}

const STATUS_STYLE: Record<OrderStatus, string> = {
  created: "bg-gray-100 text-gray-700",
  validated: "bg-blue-100 text-blue-700",
  payment_confirmed: "bg-indigo-100 text-indigo-700",
  cod_approved: "bg-indigo-100 text-indigo-700",
  reserved: "bg-amber-100 text-amber-800",
  packed: "bg-amber-100 text-amber-800",
  label_generated: "bg-violet-100 text-violet-700",
  dispatched: "bg-cyan-100 text-cyan-800",
  in_transit: "bg-cyan-100 text-cyan-800",
  delivered: "bg-green-100 text-green-700",
  returned: "bg-orange-100 text-orange-800",
  refunded: "bg-gray-200 text-gray-700",
  cancelled: "bg-red-100 text-red-700",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <Badge label={STATUS_LABEL[status]} className={STATUS_STYLE[status]} />;
}

const PAYMENT_STYLE: Record<PaymentStatus, string> = {
  unpaid: "bg-red-100 text-red-700",
  paid: "bg-green-100 text-green-700",
  partially_paid: "bg-amber-100 text-amber-800",
  refunded: "bg-gray-200 text-gray-700",
};

const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  unpaid: "Unpaid",
  paid: "Paid",
  partially_paid: "Partially paid",
  refunded: "Refunded",
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge label={PAYMENT_LABEL[status]} className={PAYMENT_STYLE[status]} />;
}

export const CHANNEL_LABEL: Record<OrderChannel, string> = {
  website: "Website",
  amazon: "Amazon",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  phone: "Phone",
  manual: "Manual",
  b2b: "B2B",
};

export function ChannelBadge({ channel }: { channel: OrderChannel }) {
  return (
    <Badge
      label={CHANNEL_LABEL[channel]}
      className="bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100"
    />
  );
}

const FULFILLMENT_LABEL: Record<FulfillmentState, string> = {
  pending: "Pending",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  returned: "Returned",
  cancelled: "Cancelled",
};

export function FulfillmentBadge({ status }: { status: FulfillmentState }) {
  return (
    <Badge label={FULFILLMENT_LABEL[status]} className="bg-gray-100 text-gray-600" />
  );
}
