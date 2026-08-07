import { jsPDF } from "jspdf";
import {
  brl,
  COLORS,
  dateBR,
  dateTimeBR,
  drawInfoCards,
  drawInstitutionalFooter,
  drawPageHeader,
  drawProfessionalTable,
  drawSectionTitle,
  drawSummaryCards,
  filename,
  litersBR,
  PdfContext,
} from "./pdfBase";

type Data = {
  [key: string]: any;
  stationName?: string;
  legalName?: string;
  cnpj?: string;
  address?: string;
  neighborhood?: string;
  city?: string;
  zipCode?: string;
  fuels?: any[];
  tanks?: any[];
  pumps?: any[];
  clients?: any[];
  employees?: any[];
  suppliers?: any[];
  sales?: any[];
  receivables?: any[];
  cashSessions?: any[];
  cashMoves?: any[];
  expenses?: any[];
  stockMoves?: any[];
};
const valid = (row: any) => !["Cancelada", "Cancelado"].includes(row.status);
const setup = (
  data: Data,
  title: string,
  period: string,
  user: string,
  documentType = "RELATÓRIO FINANCEIRO",
): PdfContext => ({
  company: {
    name: String(data.stationName || "Posto dos Cerrados"),
    legalName: String(data.legalName || ""),
    cnpj: String(data.cnpj || ""),
    address: String(data.address || ""),
    neighborhood: String(data.neighborhood || ""),
    city: String(data.city || ""),
    zipCode: String(data.zipCode || ""),
  },
  title,
  period,
  user,
  issuedAt: new Date(),
  documentType,
});
const fuel = (d: Data, id: string) => d.fuels?.find((x: any) => x.id === id);
const tank = (d: Data, id: string) => d.tanks?.find((x: any) => x.id === id);
const pump = (d: Data, id: string) => d.pumps?.find((x: any) => x.id === id);
const client = (d: Data, id: string) =>
  d.clients?.find((x: any) => x.id === id);
const employee = (d: Data, id: string) =>
  d.employees?.find((x: any) => x.id === id);
const supplier = (d: Data, id: string) =>
  d.suppliers?.find((x: any) => x.id === id);
const lastY = (doc: jsPDF) =>
  (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
    ?.finalY || 48;
const group = (
  rows: any[],
  key: (x: any) => string,
  fields: (x: any) => Record<string, number>,
) =>
  Object.values(
    rows.reduce((acc: any, row) => {
      const name = key(row) || "Não informado";
      acc[name] ||= { name, count: 0 };
      acc[name].count += 1;
      Object.entries(fields(row)).forEach(([field, value]) => {
        acc[name][field] = (acc[name][field] || 0) + value;
      });
      return acc;
    }, {}),
  );
async function start(
  doc: jsPDF,
  ctx: PdfContext,
  info?: { label: string; value: string }[],
) {
  await drawPageHeader(doc, ctx);
  return drawInfoCards(
    doc,
    info || [
      { label: "Período", value: ctx.period },
      { label: "Emitido em", value: ctx.issuedAt.toLocaleString("pt-BR") },
      { label: "Responsável", value: ctx.user || "Não informado" },
    ],
    41,
  );
}
function sectionTable(
  doc: jsPDF,
  ctx: PdfContext,
  title: string,
  y: number,
  head: string[][],
  body: any[][],
  foot?: any[][],
) {
  const tableY = drawSectionTitle(doc, title, y);
  return drawProfessionalTable(doc, ctx, {
    startY: tableY,
    head,
    body: body.length ? body : [["Nenhum registro encontrado."]],
    foot,
    footStyles: {
      fillColor: COLORS.pale,
      textColor: COLORS.navy,
      fontStyle: "bold",
    },
  });
}

export async function salesPdf(
  data: Data,
  rows: any[],
  from: string,
  to: string,
  user: string,
) {
  const doc = new jsPDF({ orientation: "landscape" });
  const ctx = setup(
    data,
    "RELATÓRIO DE VENDAS",
    `${dateBR(from)} a ${dateBR(to)}`,
    user,
  );
  let y = await start(doc, ctx);
  const ok = rows.filter(valid),
    total = ok.reduce((a, x) => a + x.total, 0),
    liters = ok.reduce((a, x) => a + x.liters, 0);
  y = drawSummaryCards(
    doc,
    [
      {
        label: "Vendas realizadas",
        value: String(ok.length),
        color: COLORS.blue,
      },
      { label: "Litros vendidos", value: litersBR(liters), color: COLORS.navy },
      { label: "Faturamento", value: brl(total), color: COLORS.green },
      {
        label: "Ticket médio",
        value: brl(ok.length ? total / ok.length : 0),
        color: COLORS.orange,
      },
      {
        label: "Canceladas",
        value: `${rows.length - ok.length} | ${brl(rows.filter((x) => !valid(x)).reduce((a, x) => a + x.total, 0))}`,
        color: COLORS.red,
      },
    ],
    y,
    5,
  );
  const byFuel: any[] = group(
    ok,
    (x) => fuel(data, x.fuelId)?.name,
    (x) => ({ liters: x.liters, total: x.total }),
  );
  y = sectionTable(
    doc,
    ctx,
    "Vendas por combustível",
    y + 2,
    [["Combustível", "Vendas", "Litros", "Valor"]],
    byFuel.map((x) => [x.name, x.count, litersBR(x.liters), brl(x.total)]),
    [["TOTAL", ok.length, litersBR(liters), brl(total)]],
  );
  const byPayment: any[] = group(
    ok,
    (x) => x.payment,
    (x) => ({ total: x.total }),
  );
  y = sectionTable(
    doc,
    ctx,
    "Vendas por forma de pagamento",
    y + 3,
    [["Forma de pagamento", "Quantidade", "Valor", "Percentual"]],
    byPayment.map((x) => [
      x.name,
      x.count,
      brl(x.total),
      `${total ? ((x.total / total) * 100).toFixed(1) : "0,0"}%`,
    ]),
  );
  const byEmployee: any[] = group(
    ok,
    (x) => employee(data, x.employeeId)?.name,
    (x) => ({ liters: x.liters, total: x.total }),
  );
  y = sectionTable(
    doc,
    ctx,
    "Vendas por funcionário",
    y + 3,
    [["Funcionário", "Vendas", "Litros", "Valor"]],
    byEmployee.map((x) => [x.name, x.count, litersBR(x.liters), brl(x.total)]),
  );
  const byTank: any[] = group(
    ok,
    (x) => tank(data, x.tankId)?.name,
    (x) => ({ liters: x.liters, total: x.total }),
  );
  y = sectionTable(
    doc,
    ctx,
    "Vendas por tanque",
    y + 3,
    [["Tanque", "Combustível", "Vendas", "Litros", "Valor"]],
    byTank.map((x) => {
      const t = data.tanks?.find((t: any) => t.name === x.name);
      return [
        x.name,
        fuel(data, t?.fuelId)?.name || "-",
        x.count,
        litersBR(x.liters),
        brl(x.total),
      ];
    }),
  );
  const byPump: any[] = group(
    ok,
    (x) => pump(data, x.pumpId)?.name,
    (x) => ({ liters: x.liters, total: x.total }),
  );
  y = sectionTable(
    doc,
    ctx,
    "Vendas por bomba",
    y + 3,
    [["Bomba", "Tanque", "Combustível", "Litros", "Valor"]],
    byPump.map((x) => {
      const p = data.pumps?.find((p: any) => p.name === x.name),
        t = tank(data, p?.tankId);
      return [
        x.name,
        t?.name || "-",
        fuel(data, t?.fuelId)?.name || "-",
        litersBR(x.liters),
        brl(x.total),
      ];
    }),
  );
  sectionTable(
    doc,
    ctx,
    "Vendas do período",
    y + 3,
    [
      [
        "Data/hora",
        "Combustível",
        "Tanque",
        "Bomba",
        "Litros",
        "Preço/L",
        "Valor",
        "Pagamento",
        "Cliente",
        "Funcionário",
        "Status",
      ],
    ],
    rows.map((x) => [
      dateTimeBR(x.date),
      fuel(data, x.fuelId)?.name || "-",
      tank(data, x.tankId)?.name || "-",
      pump(data, x.pumpId)?.name || "-",
      litersBR(x.liters),
      brl(x.price),
      brl(x.total),
      x.payment,
      client(data, x.clientId)?.name || "-",
      employee(data, x.employeeId)?.name || "-",
      x.status,
    ]),
    [
      [
        "TOTAL GERAL",
        "",
        "",
        "",
        litersBR(liters),
        "",
        brl(total),
        "",
        "",
        `${ok.length} vendas válidas`,
        "",
      ],
    ],
  );
  drawInstitutionalFooter(doc, ctx);
  doc.save(filename("relatorio-vendas", from, to));
}

export async function accountsPdf(
  data: Data,
  rows: any[],
  from: string,
  to: string,
  user: string,
) {
  const doc = new jsPDF({ orientation: "landscape" }),
    ctx = setup(
      data,
      "RELATÓRIO DE CONTAS A RECEBER",
      `${dateBR(from)} a ${dateBR(to)}`,
      user,
      "CONTAS A RECEBER",
    );
  let y = await start(doc, ctx);
  const original = rows.reduce((a, x) => a + x.original, 0),
    paid = rows.reduce((a, x) => a + x.paid, 0),
    open = original - paid;
  const overdue = rows
    .filter((x) => valid(x) && x.due < new Date().toISOString().slice(0, 10))
    .reduce((a, x) => a + x.original - x.paid, 0);
  y = drawSummaryCards(
    doc,
    [
      { label: "Total original", value: brl(original) },
      { label: "Total recebido", value: brl(paid), color: COLORS.green },
      { label: "Em aberto", value: brl(open), color: COLORS.orange },
      { label: "Vencido", value: brl(overdue), color: COLORS.red },
    ],
    y,
  );
  y = sectionTable(
    doc,
    ctx,
    "Contas a receber",
    y + 2,
    [
      [
        "Cliente",
        "CPF/CNPJ",
        "Vencimento",
        "Original",
        "Pago",
        "Saldo",
        "Status",
      ],
    ],
    rows.map((x) => {
      const c = client(data, x.clientId);
      return [
        c?.name || "-",
        c?.doc || "-",
        dateBR(x.due),
        brl(x.original),
        brl(x.paid),
        brl(x.original - x.paid),
        x.status,
      ];
    }),
    [["TOTAL", "", "", brl(original), brl(paid), brl(open), ""]],
  );
  const byClient: any[] = group(
    rows,
    (x) => client(data, x.clientId)?.name,
    (x) => ({ original: x.original, paid: x.paid }),
  );
  sectionTable(
    doc,
    ctx,
    "Resumo por cliente",
    y + 3,
    [["Cliente", "Contas", "Original", "Recebido", "Saldo"]],
    byClient.map((x) => [
      x.name,
      x.count,
      brl(x.original),
      brl(x.paid),
      brl(x.original - x.paid),
    ]),
  );
  drawInstitutionalFooter(doc, ctx);
  doc.save(filename("contas-a-receber", from, to));
}

export async function stockPdf(data: Data, user: string) {
  const today = new Date().toISOString().slice(0, 10),
    doc = new jsPDF({ orientation: "landscape" }),
    ctx = setup(
      data,
      "RELATÓRIO DE ESTOQUE",
      dateBR(today),
      user,
      "RELATÓRIO DE ESTOQUE",
    );
  let y = await start(doc, ctx),
    tanks = data.tanks || [],
    capacity = tanks.reduce((a, x) => a + x.capacity, 0),
    current = tanks.reduce((a, x) => a + x.liters, 0);
  y = drawSummaryCards(
    doc,
    [
      { label: "Capacidade total", value: litersBR(capacity) },
      { label: "Estoque atual", value: litersBR(current), color: COLORS.green },
      {
        label: "Percentual total",
        value: `${capacity ? ((current / capacity) * 100).toFixed(1) : 0}%`,
        color: COLORS.orange,
      },
      {
        label: "Tanques ativos",
        value: String(tanks.filter((x) => x.active !== false).length),
      },
    ],
    y,
  );
  y = sectionTable(
    doc,
    ctx,
    "Tanques",
    y + 2,
    [
      [
        "Tanque",
        "Combustível",
        "Capacidade",
        "Estoque",
        "Mínimo",
        "Percentual",
        "Status",
      ],
    ],
    tanks.map((x) => {
      const f = fuel(data, x.fuelId),
        pct = x.capacity ? (x.liters / x.capacity) * 100 : 0;
      return [
        x.name,
        f?.name || "-",
        litersBR(x.capacity),
        litersBR(x.liters),
        litersBR(f?.min || 0),
        `${pct.toFixed(1)}%`,
        x.liters <= (f?.min || 0) ? "Baixo" : "Normal",
      ];
    }),
  );
  y = sectionTable(
    doc,
    ctx,
    "Bombas",
    y + 3,
    [["Bomba", "Tanque", "Combustível", "Status"]],
    (data.pumps || []).map((x) => {
      const t = tank(data, x.tankId);
      return [
        x.name,
        t?.name || "-",
        fuel(data, t?.fuelId)?.name || "-",
        x.active ? "Ativa" : "Inativa",
      ];
    }),
  );
  sectionTable(
    doc,
    ctx,
    "Movimentações do período",
    y + 3,
    [["Data/Hora", "Tanque", "Combustível", "Tipo", "Litros", "Observação"]],
    (data.stockMoves || []).map((x) => {
      const t = tank(data, x.tankId);
      return [
        dateTimeBR(x.date),
        t?.name || "-",
        fuel(data, t?.fuelId)?.name || "-",
        x.type,
        litersBR(x.liters),
        x.description || "-",
      ];
    }),
  );
  drawInstitutionalFooter(doc, ctx);
  doc.save(filename("estoque", today));
}

export async function expensesPdf(
  data: Data,
  rows: any[],
  from: string,
  to: string,
  user: string,
) {
  const doc = new jsPDF({ orientation: "landscape" }),
    ctx = setup(
      data,
      "RELATÓRIO DE DESPESAS",
      `${dateBR(from)} a ${dateBR(to)}`,
      user,
      "RELATÓRIO DE DESPESAS",
    );
  let y = await start(doc, ctx),
    total = rows.reduce((a, x) => a + x.value, 0),
    max = rows.reduce((a, x) => Math.max(a, x.value), 0);
  y = drawSummaryCards(
    doc,
    [
      { label: "Total de despesas", value: brl(total), color: COLORS.red },
      { label: "Quantidade", value: String(rows.length) },
      { label: "Maior despesa", value: brl(max), color: COLORS.orange },
      { label: "Média", value: brl(rows.length ? total / rows.length : 0) },
    ],
    y,
  );
  const byCategory: any[] = group(
    rows,
    (x) => x.category,
    (x) => ({ total: x.value }),
  );
  y = sectionTable(
    doc,
    ctx,
    "Despesas por categoria",
    y + 2,
    [["Categoria", "Quantidade", "Valor"]],
    byCategory.map((x) => [x.name, x.count, brl(x.total)]),
  );
  const byMethod: any[] = group(
    rows,
    (x) => x.method,
    (x) => ({ total: x.value }),
  );
  y = sectionTable(
    doc,
    ctx,
    "Despesas por forma de pagamento",
    y + 3,
    [["Forma de pagamento", "Quantidade", "Valor"]],
    byMethod.map((x) => [x.name, x.count, brl(x.total)]),
  );
  sectionTable(
    doc,
    ctx,
    "Despesas detalhadas",
    y + 3,
    [["Data", "Categoria", "Descrição", "Fornecedor", "Pagamento", "Valor"]],
    rows.map((x) => [
      dateBR(x.date),
      x.category,
      x.description,
      supplier(data, x.supplierId)?.name || "-",
      x.method,
      brl(x.value),
    ]),
    [["TOTAL", "", "", "", "", brl(total)]],
  );
  drawInstitutionalFooter(doc, ctx);
  doc.save(filename("despesas", from, to));
}

export async function cashPdf(data: Data, cash: any, user: string) {
  const moves = (data.cashMoves || []).filter((x) => x.cashId === cash.id),
    from = cash.openedAt,
    to = cash.closedAt || new Date().toISOString();
  const doc = new jsPDF({ orientation: "landscape" }),
    ctx = setup(
      data,
      "RELATÓRIO DE FECHAMENTO DE CAIXA",
      `${dateTimeBR(from)} a ${dateTimeBR(to)}`,
      user,
      "FECHAMENTO DE CAIXA",
    );
  let y = await start(doc, ctx, [
    { label: "Data", value: dateBR(to) },
    { label: "Operador", value: cash.operator || user || "-" },
    { label: "Abertura", value: dateTimeBR(from) },
    { label: "Fechamento", value: dateTimeBR(to) },
  ]);
  const sum = (type: string) =>
    moves.filter((x) => x.type === type).reduce((a, x) => a + x.value, 0);
  const debits = ["Saída", "Sangria", "Despesa"],
    expected =
      cash.opening +
      moves.reduce(
        (a, x) => a + (debits.includes(x.type) ? -x.value : x.value),
        0,
      ),
    declared = cash.closingDeclared ?? expected,
    difference = declared - expected;
  const sales = (data.sales || []).filter(
      (x) => x.date >= from && x.date <= to,
    ),
    validSales = sales.filter(valid);
  y = drawSummaryCards(
    doc,
    [
      { label: "Saldo inicial", value: brl(cash.opening) },
      { label: "Entradas", value: brl(sum("Entrada")), color: COLORS.green },
      { label: "Saídas", value: brl(sum("Saída")), color: COLORS.red },
      { label: "Sangrias", value: brl(sum("Sangria")), color: COLORS.red },
      {
        label: "Suprimentos",
        value: brl(sum("Suprimento")),
        color: COLORS.blue,
      },
      {
        label: "Vendas",
        value: brl(validSales.reduce((a, x) => a + x.total, 0)),
        color: COLORS.green,
      },
      {
        label: "Recebimentos",
        value: brl(sum("Recebimento")),
        color: COLORS.green,
      },
      { label: "Despesas", value: brl(sum("Despesa")), color: COLORS.red },
      { label: "Saldo esperado", value: brl(expected), color: COLORS.navy },
      { label: "Saldo contado", value: brl(declared), color: COLORS.blue },
      {
        label: "Diferença",
        value: brl(difference),
        color: difference < 0 ? COLORS.red : COLORS.green,
      },
    ],
    y,
    4,
  );
  const payments: any[] = group(
    validSales,
    (x) => x.payment,
    (x) => ({ total: x.total }),
  );
  y = sectionTable(
    doc,
    ctx,
    "Resumo por forma de pagamento",
    y + 1,
    [
      [
        "Forma de pagamento",
        "Quantidade",
        "Valor",
        "Disponível em caixa",
        "Venda a prazo",
      ],
    ],
    payments.map((x) => [
      x.name,
      x.count,
      brl(x.total),
      brl(x.name === "Prazo" ? 0 : x.total),
      brl(x.name === "Prazo" ? x.total : 0),
    ]),
  );
  y = sectionTable(
    doc,
    ctx,
    "Movimentações do caixa",
    y + 3,
    [["Data/Hora", "Tipo", "Categoria", "Descrição", "Pagamento", "Valor"]],
    moves.map((x) => [
      dateTimeBR(x.date),
      x.type,
      x.type,
      x.description || "-",
      x.method || "-",
      brl(x.value),
    ]),
  );
  sectionTable(
    doc,
    ctx,
    "Vendas do turno",
    y + 3,
    [
      [
        "Data/Hora",
        "Combustível",
        "Litros",
        "Valor",
        "Pagamento",
        "Cliente",
        "Funcionário",
        "Status",
      ],
    ],
    sales.map((x) => [
      dateTimeBR(x.date),
      fuel(data, x.fuelId)?.name || "-",
      litersBR(x.liters),
      brl(x.total),
      x.payment,
      client(data, x.clientId)?.name || "-",
      employee(data, x.employeeId)?.name || "-",
      x.status,
    ]),
    [
      [
        "TOTAL",
        "",
        litersBR(validSales.reduce((a, x) => a + x.liters, 0)),
        brl(validSales.reduce((a, x) => a + x.total, 0)),
        "",
        "",
        "",
        `${validSales.length} válidas`,
      ],
    ],
  );
  drawInstitutionalFooter(doc, ctx);
  doc.save(filename("fechamento-caixa", from.slice(0, 10)));
}

export async function managerialPdf(
  data: Data,
  from: string,
  to: string,
  user: string,
) {
  const sales = (data.sales || []).filter(valid),
    expenses = data.expenses || [],
    doc = new jsPDF({ orientation: "landscape" }),
    ctx = setup(
      data,
      "RELATÓRIO GERENCIAL",
      `${dateBR(from)} a ${dateBR(to)}`,
      user,
      "RELATÓRIO GERENCIAL",
    );
  let y = await start(doc, ctx),
    revenue = sales.reduce((a, x) => a + x.total, 0),
    liters = sales.reduce((a, x) => a + x.liters, 0),
    expense = expenses.reduce((a, x) => a + x.value, 0);
  const cost = sales.reduce(
      (a, x) => a + x.liters * (fuel(data, x.fuelId)?.costPrice || 0),
      0,
    ),
    receivable = (data.receivables || [])
      .filter(valid)
      .reduce((a, x) => a + x.original - x.paid, 0);
  y = drawSummaryCards(
    doc,
    [
      { label: "Faturamento", value: brl(revenue), color: COLORS.green },
      { label: "Litros vendidos", value: litersBR(liters) },
      { label: "Despesas", value: brl(expense), color: COLORS.red },
      {
        label: "Contas a receber",
        value: brl(receivable),
        color: COLORS.orange,
      },
      { label: "Custo estimado", value: brl(cost) },
      {
        label: "Margem estimada",
        value: brl(revenue - cost - expense),
        color: revenue - cost - expense < 0 ? COLORS.red : COLORS.green,
      },
    ],
    y,
    3,
  );
  const byFuel: any[] = group(
    sales,
    (x) => fuel(data, x.fuelId)?.name,
    (x) => ({ liters: x.liters, total: x.total }),
  );
  y = sectionTable(
    doc,
    ctx,
    "Faturamento por combustível",
    y + 1,
    [["Combustível", "Vendas", "Litros", "Faturamento"]],
    byFuel.map((x) => [x.name, x.count, litersBR(x.liters), brl(x.total)]),
  );
  const byPay: any[] = group(
    sales,
    (x) => x.payment,
    (x) => ({ total: x.total }),
  );
  y = sectionTable(
    doc,
    ctx,
    "Forma de pagamento",
    y + 3,
    [["Forma", "Quantidade", "Valor"]],
    byPay.map((x) => [x.name, x.count, brl(x.total)]),
  );
  const byCategory: any[] = group(
    expenses,
    (x) => x.category,
    (x) => ({ total: x.value }),
  );
  y = sectionTable(
    doc,
    ctx,
    "Despesas por categoria",
    y + 3,
    [["Categoria", "Quantidade", "Valor"]],
    byCategory.map((x) => [x.name, x.count, brl(x.total)]),
  );
  y = sectionTable(
    doc,
    ctx,
    "Estoque atual",
    y + 3,
    [["Tanque", "Combustível", "Estoque", "Capacidade", "Percentual"]],
    (data.tanks || []).map((x) => [
      x.name,
      fuel(data, x.fuelId)?.name || "-",
      litersBR(x.liters),
      litersBR(x.capacity),
      `${x.capacity ? ((x.liters / x.capacity) * 100).toFixed(1) : 0}%`,
    ]),
  );
  sectionTable(
    doc,
    ctx,
    "Resumo financeiro",
    y + 3,
    [["Indicador", "Valor"]],
    [
      ["Receita bruta", brl(revenue)],
      ["(-) Custo estimado", brl(cost)],
      ["(-) Despesas", brl(expense)],
      ["(=) Margem estimada", brl(revenue - cost - expense)],
      ["Contas a receber", brl(receivable)],
    ],
  );
  drawInstitutionalFooter(doc, ctx);
  doc.save(filename("relatorio-gerencial", from, to));
}
