import "server-only";
import QRCode from "qrcode";

/**
 * Encode `text` (the order_no, plus the AWB when present) into a PNG data URL that
 * @react-pdf/renderer can embed directly in an <Image> on the label. Warehouse staff
 * scan it to pull up the order. Error-correction level "M" keeps it scannable after a
 * normal-printer print + tape.
 */
export async function makeQrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 256,
  });
}
