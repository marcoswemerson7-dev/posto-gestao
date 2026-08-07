import { jsPDF } from "jspdf";
import autoTable, { UserOptions } from "jspdf-autotable";

export type PdfCompany = {
  name: string;
  legalName?: string;
  cnpj?: string;
  address?: string;
  neighborhood?: string;
  city?: string;
  zipCode?: string;
};
export type PdfContext = {
  company: PdfCompany;
  title: string;
  period: string;
  user: string;
  issuedAt: Date;
  documentType?: string;
};
export type InfoCard = { label: string; value: string };
export type SummaryCard = InfoCard & { color?: [number, number, number] };
export const COLORS = {
  navy: [5, 43, 92] as [number, number, number],
  blue: [13, 91, 190] as [number, number, number],
  pale: [235, 243, 253] as [number, number, number],
  ink: [18, 45, 82] as [number, number, number],
  muted: [94, 111, 137] as [number, number, number],
  border: [210, 220, 233] as [number, number, number],
  green: [22, 143, 91] as [number, number, number],
  orange: [225, 124, 32] as [number, number, number],
  red: [202, 55, 65] as [number, number, number],
};
let logoCache = "";
const renderedHeaders = new WeakMap<jsPDF, Set<number>>();
export const brl = (v: number) =>
  Number(v || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
export const litersBR = (v: number) =>
  `${Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} L`;
export const dateBR = (v: string) =>
  v
    ? new Date(v.includes("T") ? v : `${v}T12:00:00`).toLocaleDateString(
        "pt-BR",
      )
    : "-";
export const dateTimeBR = (v: string) =>
  v
    ? new Date(v).toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "-";
export async function loadLogo() {
  if (logoCache) return logoCache;
  const response = await fetch("/logo-posto.png");
  if (!response.ok) throw new Error("Logo institucional não encontrada.");
  const blob = await response.blob();
  logoCache = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  return logoCache;
}
export async function drawInstitutionalHeader(
  doc: jsPDF,
  ctx: PdfContext,
  compact = false,
) {
  const width = doc.internal.pageSize.getWidth();
  doc.setFillColor(...COLORS.navy);
  doc.rect(0, 0, width, 2.6, "F");
  if (compact) {
    try {
      const logo = logoCache || (await loadLogo());
      doc.addImage(logo, "PNG", 10, 4.5, 18, 12, undefined, "FAST");
    } catch {
      /* texto permanece */
    }
    doc.setTextColor(...COLORS.navy);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text((ctx.company.name || "Posto dos Cerrados").toUpperCase(), 31, 8.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...COLORS.muted);
    doc.text(
      [
        ctx.company.legalName,
        ctx.company.cnpj ? `CNPJ ${ctx.company.cnpj}` : "",
      ]
        .filter(Boolean)
        .join(" • "),
      31,
      13,
    );
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.navy);
    doc.text(ctx.title, width - 10, 9.5, { align: "right" });
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.35);
    doc.line(10, 18, width - 10, 18);
    return;
  }
  try {
    const logo = logoCache || (await loadLogo());
    doc.addImage(logo, "PNG", 10, 5.5, 30, 20, undefined, "FAST");
  } catch {
    /* texto permanece */
  }
  doc.setTextColor(...COLORS.navy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12.5);
  doc.text((ctx.company.name || "Posto dos Cerrados").toUpperCase(), 44, 8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(7.1);
  const address = [ctx.company.address, ctx.company.neighborhood]
    .filter(Boolean)
    .join(" • ");
  const city = [
    ctx.company.city,
    ctx.company.zipCode ? `CEP ${ctx.company.zipCode}` : "",
  ]
    .filter(Boolean)
    .join(" • ");
  [
    ctx.company.legalName,
    address,
    city,
    ctx.company.cnpj ? `CNPJ ${ctx.company.cnpj}` : "",
  ]
    .filter(Boolean)
    .slice(0, 4)
    .forEach((line, index) => doc.text(String(line), 44, 13 + index * 3.5));
  const cardW = 52,
    cardX = width - cardW - 10;
  doc.setFillColor(242, 247, 253);
  doc.setDrawColor(187, 207, 232);
  doc.roundedRect(cardX, 5.5, cardW, 20, 2.3, 2.3, "FD");
  doc.setFillColor(220, 234, 251);
  doc.circle(cardX + 7, 11.5, 3.5, "F");
  doc.setDrawColor(...COLORS.blue);
  doc.setLineWidth(0.35);
  doc.rect(cardX + 5.8, 9.5, 2.4, 3.2);
  doc.line(cardX + 6.3, 10.5, cardX + 7.7, 10.5);
  doc.setTextColor(...COLORS.navy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.4);
  doc.text(ctx.documentType || "RELATÓRIO OFICIAL", cardX + 31, 13, {
    align: "center",
  });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.muted);
  doc.text("Documento oficial", cardX + 31, 18.8, { align: "center" });
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.35);
  doc.line(10, 28.5, width - 10, 28.5);
}
export function drawDocumentTitle(doc: jsPDF, title: string, y = 30.5) {
  const width = doc.internal.pageSize.getWidth();
  doc.setFillColor(...COLORS.navy);
  doc.roundedRect(10, y, width - 20, 8.8, 1.6, 1.6, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.2);
  doc.text(title, width / 2, y + 6, { align: "center" });
}
export async function drawPageHeader(doc: jsPDF, ctx: PdfContext) {
  const page = doc.getCurrentPageInfo().pageNumber,
    pages = renderedHeaders.get(doc) || new Set<number>();
  if (pages.has(page)) return;
  pages.add(page);
  renderedHeaders.set(doc, pages);
  await drawInstitutionalHeader(doc, ctx, page > 1);
  if (page === 1) drawDocumentTitle(doc, ctx.title);
}
export function drawInfoCards(doc: jsPDF, cards: InfoCard[], y: number) {
  const width = doc.internal.pageSize.getWidth(),
    gap = 2.5,
    cardW = (width - 22 - gap * (cards.length - 1)) / cards.length;
  cards.forEach((card, index) => {
    const x = 11 + index * (cardW + gap);
    doc.setFillColor(246, 249, 253);
    doc.setDrawColor(...COLORS.border);
    doc.roundedRect(x, y, cardW, 14.5, 1.6, 1.6, "FD");
    doc.setTextColor(...COLORS.muted);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.7);
    doc.text(card.label.toUpperCase(), x + 3.2, y + 4.8);
    doc.setTextColor(...COLORS.ink);
    doc.setFontSize(8.8);
    doc.text(card.value || "-", x + 3.2, y + 10.8);
  });
  return y + 17;
}
export function drawSummaryCards(
  doc: jsPDF,
  cards: SummaryCard[],
  y: number,
  columns = 4,
) {
  const width = doc.internal.pageSize.getWidth(),
    gap = 2.6,
    cardW = (width - 22 - gap * (columns - 1)) / columns,
    cardH = 19;
  cards.forEach((card, index) => {
    const col = index % columns,
      row = Math.floor(index / columns),
      x = 11 + col * (cardW + gap),
      cy = y + row * (cardH + 2.5);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...COLORS.border);
    doc.roundedRect(x, cy, cardW, cardH, 1.7, 1.7, "FD");
    doc.setFillColor(...(card.color || COLORS.blue));
    doc.roundedRect(x, cy, 2.2, cardH, 1, 1, "F");
    doc.setTextColor(...COLORS.muted);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.7);
    doc.text(card.label.toUpperCase(), x + 5, cy + 6.2);
    doc.setTextColor(...COLORS.ink);
    doc.setFontSize(11.5);
    doc.text(card.value, x + 5, cy + 14.2);
  });
  return y + Math.ceil(cards.length / columns) * (cardH + 2.5);
}
export function ensureSpace(doc: jsPDF, y: number, needed = 34) {
  const bottom = doc.internal.pageSize.getHeight() - 16;
  if (y + needed <= bottom) return y;
  doc.addPage();
  return 23;
}
export function drawSectionTitle(doc: jsPDF, title: string, y: number) {
  y = ensureSpace(doc, y, 18);
  doc.setTextColor(...COLORS.navy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(title.toUpperCase(), 11, y);
  doc.setDrawColor(...COLORS.blue);
  doc.setLineWidth(0.8);
  doc.line(11, y + 2.5, 34, y + 2.5);
  return y + 5;
}
export function drawProfessionalTable(
  doc: jsPDF,
  ctx: PdfContext,
  options: UserOptions,
) {
  autoTable(doc, {
    theme: "grid",
    ...options,
    margin: { top: 22, bottom: 16, left: 9, right: 9 },
    styles: {
      fontSize: 7.6,
      cellPadding: 2.15,
      overflow: "linebreak",
      textColor: COLORS.ink,
      lineColor: COLORS.border,
      lineWidth: 0.15,
      ...(options.styles || {}),
    },
    headStyles: {
      fillColor: COLORS.pale,
      textColor: COLORS.navy,
      fontStyle: "bold",
      lineColor: COLORS.border,
      ...(options.headStyles || {}),
    },
    alternateRowStyles: {
      fillColor: [248, 250, 253],
      ...(options.alternateRowStyles || {}),
    },
    didDrawPage: (hook) => {
      if (doc.getCurrentPageInfo().pageNumber > 1)
        void drawPageHeader(doc, ctx);
      options.didDrawPage?.(hook);
    },
  });
  return (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable
    .finalY;
}
export function drawInstitutionalFooter(doc: jsPDF, ctx: PdfContext) {
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    const width = doc.internal.pageSize.getWidth(),
      height = doc.internal.pageSize.getHeight();
    doc.setDrawColor(...COLORS.navy);
    doc.setLineWidth(0.45);
    doc.line(11, height - 14, width - 11, height - 14);
    doc.setFontSize(6.3);
    doc.setTextColor(...COLORS.muted);
    doc.setFont("helvetica", "bold");
    doc.text(ctx.company.name || "Posto dos Cerrados", 11, height - 10);
    doc.setFont("helvetica", "normal");
    const identity = [
      ctx.company.legalName,
      ctx.company.cnpj ? `CNPJ ${ctx.company.cnpj}` : "",
    ]
      .filter(Boolean)
      .join(" • ");
    doc.text(identity, 11, height - 7);
    doc.text("Emitido pelo Sistema Gestão do Posto", 11, height - 4);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.navy);
    doc.text(`PÁGINA ${page} DE ${pages}`, width - 11, height - 7, {
      align: "right",
    });
  }
}
export const filename = (prefix: string, from: string, to?: string) => {
  const first = dateBR(from).replace(/\//g, "-"),
    last = to && to !== from ? `-a-${dateBR(to).replace(/\//g, "-")}` : "";
  return `${prefix}-${first}${last}.pdf`;
};
