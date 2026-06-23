// A4 shipping-label PDF document (see docs/05-label-spec.md). The label sits in a bordered,
// cut-out-friendly block in the upper portion of an A4 page so it prints on a normal printer
// and can be cut and taped to the parcel. Rendered to a buffer server-side in lib/labels/pdf.ts
// via @react-pdf/renderer's renderToBuffer — this module must never be imported by client code.
//
// Uses the built-in Helvetica family only (no Font.register) so generation needs no network
// fetch and never fails on a cold serverless invocation.

import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

export type LabelParty = {
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  phone: string | null;
};

export type LabelItem = {
  sku: string | null;
  name: string | null;
  qty: number;
};

export type LabelProps = {
  sender: LabelParty;
  recipient: LabelParty;
  orderNo: string;
  courierLabel: string;
  awb: string | null;
  items: LabelItem[];
  /** Pre-formatted, e.g. "250 g". null when no product weights are known. */
  weight: string | null;
  /** Pre-formatted dispatch date, e.g. "22 Jun 2026". null when not set. */
  dispatchDate: string | null;
  qrDataUrl: string;
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingHorizontal: 36,
    paddingBottom: 36,
    backgroundColor: "#ffffff",
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#111827",
  },
  box: {
    alignSelf: "center",
    width: 340,
    borderWidth: 1.5,
    borderColor: "#111827",
    borderStyle: "solid",
    borderRadius: 4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#111827",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerBrand: {
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    letterSpacing: 1,
  },
  headerRight: { color: "#ffffff", fontSize: 8 },
  section: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#111827",
    borderBottomStyle: "solid",
  },
  sectionLast: { paddingHorizontal: 12, paddingVertical: 8 },
  tag: {
    fontSize: 7,
    color: "#6b7280",
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
    marginBottom: 3,
    textTransform: "uppercase",
  },
  senderName: { fontFamily: "Helvetica-Bold", fontSize: 11, marginBottom: 1 },
  recipientName: { fontFamily: "Helvetica-Bold", fontSize: 14, marginBottom: 2 },
  line: { fontSize: 9, marginBottom: 1, lineHeight: 1.3 },
  toRow: { flexDirection: "row", justifyContent: "space-between" },
  toLeft: { flex: 1, paddingRight: 8 },
  qrWrap: { width: 96, alignItems: "center" },
  qr: { width: 92, height: 92 },
  qrCaption: { fontSize: 7, marginTop: 2, fontFamily: "Helvetica-Bold" },
  metaGrid: { flexDirection: "row", flexWrap: "wrap" },
  metaCell: { width: "50%", marginBottom: 5 },
  metaLabel: {
    fontSize: 7,
    color: "#6b7280",
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  metaValue: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  itemRow: { fontSize: 9, marginBottom: 1 },
  weightLine: { fontSize: 9, marginTop: 3, fontFamily: "Helvetica-Bold" },
  footer: {
    alignSelf: "center",
    marginTop: 8,
    fontSize: 7,
    color: "#9ca3af",
  },
});

function cityStateLine(p: LabelParty): string {
  return [p.city, p.state].filter(Boolean).join(", ");
}

export function LabelDocument({
  sender,
  recipient,
  orderNo,
  courierLabel,
  awb,
  items,
  weight,
  dispatchDate,
  qrDataUrl,
}: LabelProps) {
  const recipientCityState = cityStateLine(recipient);
  return (
    <Document
      title={`Shipping label ${orderNo}`}
      author="TribeToy Dashboard"
      subject={`Parcel label for order ${orderNo}`}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.box}>
          {/* Header band */}
          <View style={styles.header}>
            <Text style={styles.headerBrand}>TRIBETOY</Text>
            <Text style={styles.headerRight}>{courierLabel}</Text>
          </View>

          {/* FROM (sender) */}
          <View style={styles.section}>
            <Text style={styles.tag}>From (Sender)</Text>
            <Text style={styles.senderName}>{sender.name}</Text>
            {sender.address ? <Text style={styles.line}>{sender.address}</Text> : null}
            {cityStateLine(sender) ? (
              <Text style={styles.line}>{cityStateLine(sender)}</Text>
            ) : null}
            <Text style={styles.line}>
              {[
                sender.pincode ? `PIN ${sender.pincode}` : null,
                sender.phone ? `Ph: ${sender.phone}` : null,
              ]
                .filter(Boolean)
                .join("   ")}
            </Text>
          </View>

          {/* TO (recipient) + QR */}
          <View style={styles.section}>
            <View style={styles.toRow}>
              <View style={styles.toLeft}>
                <Text style={styles.tag}>To (Deliver To)</Text>
                <Text style={styles.recipientName}>{recipient.name}</Text>
                {recipient.address ? (
                  <Text style={styles.line}>{recipient.address}</Text>
                ) : null}
                {recipientCityState ? (
                  <Text style={styles.line}>{recipientCityState}</Text>
                ) : null}
                {recipient.pincode ? (
                  <Text style={styles.line}>PIN: {recipient.pincode}</Text>
                ) : null}
                {recipient.phone ? (
                  <Text style={styles.line}>Ph: {recipient.phone}</Text>
                ) : null}
              </View>
              <View style={styles.qrWrap}>
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <Image style={styles.qr} src={qrDataUrl} />
                <Text style={styles.qrCaption}>{orderNo}</Text>
              </View>
            </View>
          </View>

          {/* Order / shipment meta */}
          <View style={styles.section}>
            <View style={styles.metaGrid}>
              <View style={styles.metaCell}>
                <Text style={styles.metaLabel}>Order No.</Text>
                <Text style={styles.metaValue}>{orderNo}</Text>
              </View>
              <View style={styles.metaCell}>
                <Text style={styles.metaLabel}>Courier</Text>
                <Text style={styles.metaValue}>{courierLabel}</Text>
              </View>
              <View style={styles.metaCell}>
                <Text style={styles.metaLabel}>AWB / Tracking</Text>
                <Text style={styles.metaValue}>{awb || "—"}</Text>
              </View>
              <View style={styles.metaCell}>
                <Text style={styles.metaLabel}>Dispatch Date</Text>
                <Text style={styles.metaValue}>{dispatchDate || "—"}</Text>
              </View>
            </View>
          </View>

          {/* Parcel contents */}
          <View style={styles.sectionLast}>
            <Text style={styles.tag}>Parcel Contents</Text>
            {items.length === 0 ? (
              <Text style={styles.itemRow}>—</Text>
            ) : (
              items.map((it, i) => (
                <Text key={i} style={styles.itemRow}>
                  {it.qty} × {it.sku || it.name || "Item"}
                  {it.sku && it.name ? ` (${it.name})` : ""}
                </Text>
              ))
            )}
            <Text style={styles.weightLine}>
              Total weight: {weight || "—"}
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Generated by TribeToy Dashboard · cut along the border and affix to the parcel.
        </Text>
      </Page>
    </Document>
  );
}
