// Display names for the courier_type enum. Lightweight (no heavy deps) so it can be
// imported from both the PDF document and client components without pulling
// @react-pdf/renderer into a client bundle.

import type { CourierType } from "@/lib/types";

export const COURIER_LABEL: Record<CourierType, string> = {
  speedpost: "India Post Speed Post",
  delhivery: "Delhivery",
  other: "Other courier",
};

/** The v1 A4 label template id stored on shipments.label_template. */
export const DEFAULT_LABEL_TEMPLATE = "speedpost_a4";
