import { OrderRecord, OrderItemRecord } from '../types/marketplace';
import {
  SupportedCurrency,
  SupportedLanguage,
  ExchangeRateMap,
  DEFAULT_EXCHANGE_RATES,
  formatMoney,
} from './marketplace-rules';

export interface OrderPdfGeneratorOptions {
  currency?: SupportedCurrency;
  rates?: ExchangeRateMap;
  language?: SupportedLanguage;
}

/**
 * Normalise et encode une chaîne UTF-8 vers WinAnsi (ISO-8859-1 / CP1252)
 * compatible avec les polices PDF standard Type1 (Helvetica / Helvetica-Bold),
 * tout en échappant les délimiteurs PDF `(`, `)` et `\`.
 */
export function escapePdfWinAnsiText(input: string): string {
  const sanitized = (input || '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u00A0/g, ' ')
    .replace(/\u202F/g, ' ')
    .replace(/€/g, 'EUR');

  let out = '';
  for (let i = 0; i < sanitized.length; i++) {
    const code = sanitized.charCodeAt(i);
    if (code === 0x28 || code === 0x29 || code === 0x5c) {
      out += '\\' + sanitized[i];
    } else if (code >= 0x20 && code <= 0x7e) {
      out += sanitized[i];
    } else if (code >= 0xa0 && code <= 0xff) {
      out += '\\' + code.toString(8).padStart(3, '0');
    } else {
      // Fallback sans accent si caractère hors plage WinAnsi (ex: Arabe ou symbole spécial)
      const normalized = sanitized[i].normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (normalized && normalized.charCodeAt(0) >= 0x20 && normalized.charCodeAt(0) <= 0x7e) {
        out += normalized;
      }
    }
  }
  return out;
}

function formatPaymentStatusLabel(rawStatus?: string): string {
  const up = (rawStatus || 'PENDING').toUpperCase();
  if (up === 'PAID' || up === 'CAPTURED') return 'PAYE (PAID) - Regle a la livraison';
  if (up === 'FAILED') return 'ECHEC (FAILED)';
  return 'EN ATTENTE (PENDING) - A payer a la reception';
}

function formatOrderStatusLabel(rawStatus?: string): string {
  const map: Record<string, string> = {
    confirmed: 'Confirmee',
    preparing: 'En preparation atelier',
    shipped: 'En cours de livraison',
    delivered: 'Livree',
    cancelled: 'Annulee',
    return_requested: 'Retour demande',
  };
  return map[(rawStatus || '').toLowerCase()] || rawStatus || 'Confirmee';
}

/**
 * Construit les octets binaires d'un document PDF 1.4 valide (A4 Portrait)
 * contenant le récapitulatif complet de la commande et le bordereau COD.
 */
export function buildOrderSummaryPdfBytes(
  order: OrderRecord,
  items: OrderItemRecord[],
  options: OrderPdfGeneratorOptions = {}
): Uint8Array {
  const currency = options.currency || order.currency || 'MAD';
  const rates = options.rates || DEFAULT_EXCHANGE_RATES;
  const language: SupportedLanguage = options.language || 'fr';

  const fmt = (amountMad: number) => formatMoney(amountMad, currency, rates, language);

  const orderDate = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : new Date().toLocaleDateString('fr-FR');

  const ops: string[] = [];

  const drawText = (
    text: string,
    x: number,
    y: number,
    size = 10,
    bold = false,
    rgb: [number, number, number] = [0.11, 0.1, 0.09]
  ) => {
    const fontKey = bold ? '/F2' : '/F1';
    ops.push(
      `BT ${fontKey} ${size} Tf ${rgb[0].toFixed(2)} ${rgb[1].toFixed(2)} ${rgb[2].toFixed(2)} rg ${x.toFixed(2)} ${y.toFixed(2)} Td (${escapePdfWinAnsiText(text)}) Tj ET`
    );
  };

  const drawRectFill = (
    x: number,
    y: number,
    w: number,
    h: number,
    rgb: [number, number, number]
  ) => {
    ops.push(
      `${rgb[0].toFixed(2)} ${rgb[1].toFixed(2)} ${rgb[2].toFixed(2)} rg ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`
    );
  };

  const drawLine = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    width = 0.6,
    rgb: [number, number, number] = [0.85, 0.84, 0.82]
  ) => {
    ops.push(
      `${width.toFixed(2)} w ${rgb[0].toFixed(2)} ${rgb[1].toFixed(2)} ${rgb[2].toFixed(2)} RG ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`
    );
  };

  // 1. Bandeau d'en-tête Maison Atlas
  drawRectFill(0, 760, 595.28, 81.89, [0.11, 0.1, 0.09]);
  drawText('MAISON ATLAS', 42, 804, 18, true, [0.98, 0.97, 0.96]);
  drawText(
    'Marketplace Multi-Vendeurs Certifiee · Maroc & International',
    42,
    785,
    9,
    false,
    [0.78, 0.76, 0.73]
  );
  drawText('RECAPITULATIF DE COMMANDE COD', 355, 804, 11, true, [0.98, 0.97, 0.96]);
  drawText(`Ref : ${order.orderNumber}`, 355, 785, 10, false, [0.88, 0.86, 0.83]);

  // 2. Bloc Métadonnées Commande & Paiement COD
  drawRectFill(42, 668, 511, 74, [0.97, 0.96, 0.94]);
  drawText('DETAILS DE LA COMMANDE', 54, 724, 9, true, [0.42, 0.4, 0.38]);
  drawText(`Numero de commande : ${order.orderNumber}`, 54, 708, 10, true);
  drawText(`Date d'emission : ${orderDate}`, 54, 693, 9.5, false);
  drawText(
    `Statut logistique : ${formatOrderStatusLabel(order.orderStatus)}`,
    54,
    678,
    9.5,
    false
  );

  drawText('PAIEMENT & LIVRAISON', 310, 724, 9, true, [0.42, 0.4, 0.38]);
  drawText('Mode : COD - Paiement a la livraison', 310, 708, 10, true, [0.05, 0.45, 0.3]);
  drawText(`Statut paiement : ${formatPaymentStatusLabel(order.paymentStatus)}`, 310, 693, 8.5, false);
  drawText(
    `Transporteur : ${order.shippingMethodName || 'Amana Express'} (${order.trackingNumber || 'Suivi standard'})`,
    310,
    678,
    8.5,
    false
  );

  // 3. Bloc Client & Adresse de Livraison
  drawText('DESTINATAIRE & ADRESSE DE LIVRAISON', 42, 644, 9.5, true, [0.35, 0.33, 0.31]);
  drawLine(42, 638, 553, 638, 0.8);
  drawText(`Client : ${order.customerName}`, 42, 622, 10, true);
  drawText(`Email : ${order.customerEmail}   |   Telephone : ${order.customerPhone}`, 42, 607, 9.5, false);
  drawText(
    `Adresse : ${order.shippingAddress}, ${order.shippingPostalCode} ${order.shippingCity}, ${order.shippingCountry || 'Maroc'}`,
    42,
    592,
    9.5,
    false
  );

  // 4. En-tête du tableau des articles commandés
  let cursorY = 556;
  drawRectFill(42, cursorY, 511, 22, [0.16, 0.15, 0.14]);
  drawText('ARTICLE / PIECE COMMANDEE', 50, cursorY + 7, 8.5, true, [0.98, 0.97, 0.96]);
  drawText('SKU', 305, cursorY + 7, 8.5, true, [0.98, 0.97, 0.96]);
  drawText('QTE', 385, cursorY + 7, 8.5, true, [0.98, 0.97, 0.96]);
  drawText('P.U.', 425, cursorY + 7, 8.5, true, [0.98, 0.97, 0.96]);
  drawText('SOUS-TOTAL', 490, cursorY + 7, 8.5, true, [0.98, 0.97, 0.96]);

  cursorY -= 22;

  const effectiveItems: Array<{
    title: string;
    variant: string;
    sku: string;
    quantity: number;
    unitPriceMad: number;
    subtotalMad: number;
  }> =
    items.length > 0
      ? items.map((it) => ({
          title: it.productTitle,
          variant: it.variantTitle || 'Standard',
          sku: it.sku,
          quantity: it.quantity,
          unitPriceMad: Number(it.unitPriceMad),
          subtotalMad: Number(it.subtotalMad),
        }))
      : [
          {
            title: `Commande globale ${order.orderNumber}`,
            variant: 'Selection Maison Atlas',
            sku: 'ATLAS-COD',
            quantity: 1,
            unitPriceMad: Number(order.subtotalMad || order.totalMad),
            subtotalMad: Number(order.subtotalMad || order.totalMad),
          },
        ];

  effectiveItems.slice(0, 12).forEach((item, index) => {
    if (index % 2 === 1) {
      drawRectFill(42, cursorY - 4, 511, 26, [0.98, 0.97, 0.96]);
    }
    const shortTitle =
      item.title.length > 44 ? item.title.slice(0, 41) + '...' : item.title;
    drawText(shortTitle, 50, cursorY + 9, 9.5, true);
    drawText(`Variante : ${item.variant}`, 50, cursorY - 1, 8, false, [0.45, 0.43, 0.41]);
    drawText(item.sku, 305, cursorY + 4, 8.5, false);
    drawText(String(item.quantity), 390, cursorY + 4, 9, true);
    drawText(fmt(item.unitPriceMad), 425, cursorY + 4, 8.5, false);
    drawText(fmt(item.subtotalMad), 490, cursorY + 4, 9, true);
    drawLine(42, cursorY - 6, 553, cursorY - 6, 0.4);
    cursorY -= 28;
  });

  // 5. Récapitulatif Financier & Total COD
  cursorY -= 10;
  const subtotalMad = Number(order.subtotalMad || order.totalMad);
  const discountMad = Number(order.discountMad || 0);
  const shippingMad = Number(order.shippingMad || 0);
  const taxMad = Number(order.taxMad || 0);
  const totalMad = Number(order.totalMad);

  drawText('Sous-total articles :', 340, cursorY, 9.5, false, [0.35, 0.33, 0.31]);
  drawText(fmt(subtotalMad), 475, cursorY, 9.5, true);
  cursorY -= 16;

  if (discountMad > 0) {
    drawText(
      `Remise promotionnelle (${order.couponCode || 'PROMO'}) :`,
      340,
      cursorY,
      9.5,
      false,
      [0.05, 0.45, 0.3]
    );
    drawText(`-${fmt(discountMad)}`, 475, cursorY, 9.5, true, [0.05, 0.45, 0.3]);
    cursorY -= 16;
  }

  drawText('Frais de livraison :', 340, cursorY, 9.5, false, [0.35, 0.33, 0.31]);
  drawText(shippingMad === 0 ? 'OFFERTS' : fmt(shippingMad), 475, cursorY, 9.5, true);
  cursorY -= 16;

  drawText('Dont TVA estimee (20% incluse) :', 340, cursorY, 8.5, false, [0.48, 0.46, 0.44]);
  drawText(fmt(taxMad), 475, cursorY, 8.5, false, [0.48, 0.46, 0.44]);
  cursorY -= 26;

  drawRectFill(310, cursorY - 8, 243, 30, [0.11, 0.1, 0.09]);
  drawText('TOTAL A REGLER (COD) :', 322, cursorY + 3, 10, true, [0.98, 0.97, 0.96]);
  drawText(fmt(totalMad), 460, cursorY + 3, 11, true, [0.98, 0.97, 0.96]);

  // 6. Encart Signature & Mention Paiement à la livraison
  const footerY = 110;
  drawRectFill(42, footerY, 511, 54, [0.96, 0.95, 0.93]);
  drawText(
    'MENTION OBLIGATOIRE — PAIEMENT A LA LIVRAISON (CASH ON DELIVERY)',
    54,
    footerY + 36,
    8.5,
    true,
    [0.11, 0.1, 0.09]
  );
  drawText(
    'Le reglement de cette commande s effectue exclusivement a la reception du colis aupres du transporteur.',
    54,
    footerY + 22,
    8.5,
    false,
    [0.35, 0.33, 0.31]
  );
  drawText(
    'Conservez ce recapitulatif PDF comme justificatif de commande et de garantie Maison Atlas (retour 14 jours).',
    54,
    footerY + 10,
    8.5,
    false,
    [0.35, 0.33, 0.31]
  );

  drawLine(42, 85, 553, 85, 0.5);
  drawText(
    'Maison Atlas Marketplace · Conciergerie : conciergerie@maison-atlas.ma · +212 5 22 90 10 20',
    42,
    70,
    8,
    false,
    [0.5, 0.48, 0.46]
  );

  const streamContent = ops.join('\n');

  const objects: string[] = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n',
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n',
    `6 0 obj\n<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream\nendobj\n`,
  ];

  let pdfString = '%PDF-1.4\n';
  const offsets: number[] = [0];

  for (const obj of objects) {
    offsets.push(pdfString.length);
    pdfString += obj;
  }

  const xrefOffset = pdfString.length;
  pdfString += `xref\n0 ${objects.length + 1}\n`;
  pdfString += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i++) {
    pdfString += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }

  pdfString += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  const bytes = new Uint8Array(pdfString.length);
  for (let i = 0; i < pdfString.length; i++) {
    bytes[i] = pdfString.charCodeAt(i) & 0xff;
  }
  return bytes;
}

/**
 * Génère un objet Blob PDF (`application/pdf`) prêt à être téléchargé.
 */
export function generateOrderSummaryPdfBlob(
  order: OrderRecord,
  items: OrderItemRecord[],
  options: OrderPdfGeneratorOptions = {}
): Blob {
  const bytes = buildOrderSummaryPdfBytes(order, items, options);
  return new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}

/**
 * Fonction utilitaire frontend principale : génère et déclenche immédiatement
 * le téléchargement du récapitulatif de commande au format PDF (`.pdf`) depuis l'historique client.
 */
export function downloadOrderSummaryPdf(
  order: OrderRecord,
  items: OrderItemRecord[],
  options: OrderPdfGeneratorOptions = {}
): string {
  const safeOrderNum = (order.orderNumber || `CMD-${order.id}`).replace(/[^a-zA-Z0-9_-]/g, '-');
  const fileName = `Recapitulatif-Commande-${safeOrderNum}.pdf`;

  const blob = generateOrderSummaryPdfBlob(order, items, options);

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  return fileName;
}
