import { useState } from "react";
import { Download, X } from "lucide-react";
import {
  accountsPdf,
  cashPdf,
  expensesPdf,
  managerialPdf,
  salesPdf,
  stockPdf,
} from "../../lib/pdf/reports";
type Kind = "sales" | "cash" | "accounts" | "stock" | "expenses" | "managerial";
type Props = {
  kind: Kind;
  state: any;
  user: { name: string; role: string };
  label: string;
  className?: string;
};
const today = () => new Date().toISOString().slice(0, 10);
const firstMonth = () => `${today().slice(0, 7)}-01`;
export default function PdfReportButton({
  kind,
  state,
  user,
  label,
  className = "secondary-button",
}: Props) {
  const [open, setOpen] = useState(false),
    [generating, setGenerating] = useState(false);
  const [filter, setFilter] = useState({
    mode: "period",
    from: firstMonth(),
    to: today(),
    day: today(),
    month: today().slice(0, 7),
    status: "Todas",
    category: "Todas",
    supplier: "",
    client: "",
    cashId:
      state.cashSessions?.find((x: any) => x.status === "Fechado")?.id ||
      state.cashSessions?.[0]?.id ||
      "",
  });
  if (user.role === "Frentista" && kind !== "cash") return null;
  function range() {
    if (filter.mode === "day") return [filter.day, filter.day];
    if (filter.mode === "month") {
      const from = `${filter.month}-01`,
        d = new Date(
          Number(filter.month.slice(0, 4)),
          Number(filter.month.slice(5, 7)),
          0,
        );
      return [from, d.toISOString().slice(0, 10)];
    }
    return [filter.from, filter.to];
  }
  const inRange = (date: string, from: string, to: string) => {
    const d = (date || "").slice(0, 10);
    return d >= from && d <= to;
  };
  async function generate() {
    setGenerating(true);
    try {
      const [from, to] = range();
      if (from > to)
        throw new Error("A data inicial não pode ser maior que a final.");
      if (kind === "sales")
        await salesPdf(
          state,
          state.sales.filter((x: any) => inRange(x.date, from, to)),
          from,
          to,
          user.name,
        );
      if (kind === "accounts") {
        let rows = state.receivables.filter((x: any) =>
          inRange(x.due, from, to),
        );
        if (filter.status !== "Todas")
          rows = rows.filter((x: any) =>
            filter.status === "Vencido"
              ? x.status !== "Pago" &&
                x.status !== "Cancelado" &&
                x.due < today()
              : x.status === filter.status,
          );
        if (filter.client)
          rows = rows.filter((x: any) => x.clientId === filter.client);
        await accountsPdf(state, rows, from, to, user.name);
      }
      if (kind === "expenses") {
        let rows = state.expenses.filter((x: any) => inRange(x.date, from, to));
        if (filter.category !== "Todas")
          rows = rows.filter((x: any) => x.category === filter.category);
        if (filter.supplier)
          rows = rows.filter((x: any) => x.supplierId === filter.supplier);
        await expensesPdf(state, rows, from, to, user.name);
      }
      if (kind === "managerial") {
        const scoped = {
          ...state,
          sales: state.sales.filter((x: any) => inRange(x.date, from, to)),
          expenses: state.expenses.filter((x: any) =>
            inRange(x.date, from, to),
          ),
          receivables: state.receivables.filter((x: any) =>
            inRange(x.due, from, to),
          ),
        };
        await managerialPdf(scoped, from, to, user.name);
      }
      if (kind === "stock") await stockPdf(state, user.name);
      if (kind === "cash") {
        const cash = state.cashSessions.find(
          (x: any) => x.id === filter.cashId,
        );
        if (!cash) throw new Error("Selecione um caixa.");
        await cashPdf(state, cash, user.name);
      }
      setOpen(false);
    } catch (error) {
      console.error("Geração de PDF", error);
      alert(
        error instanceof Error
          ? error.message
          : "Não foi possível gerar o relatório.",
      );
    } finally {
      setGenerating(false);
    }
  }
  return (
    <>
      <button className={className} onClick={() => setOpen(true)}>
        <Download size={16} />
        {label}
      </button>
      {open && (
        <div
          className="modal-backdrop"
          onMouseDown={() => !generating && setOpen(false)}
        >
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>{label}</h2>
              <button
                className="round-button sm"
                onClick={() => setOpen(false)}
              >
                <X size={17} />
              </button>
            </div>
            <div className="form-grid">
              {!["stock", "cash"].includes(kind) && (
                <>
                  <label>
                    Tipo de período
                    <select
                      value={filter.mode}
                      onChange={(e) =>
                        setFilter({ ...filter, mode: e.target.value })
                      }
                    >
                      <option value="day">Dia</option>
                      <option value="period">Período</option>
                      <option value="month">Mês</option>
                    </select>
                  </label>
                  {filter.mode === "day" && (
                    <label>
                      Data
                      <input
                        type="date"
                        value={filter.day}
                        onChange={(e) =>
                          setFilter({ ...filter, day: e.target.value })
                        }
                      />
                    </label>
                  )}
                  {filter.mode === "period" && (
                    <>
                      <label>
                        Data inicial
                        <input
                          type="date"
                          value={filter.from}
                          onChange={(e) =>
                            setFilter({ ...filter, from: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        Data final
                        <input
                          type="date"
                          value={filter.to}
                          onChange={(e) =>
                            setFilter({ ...filter, to: e.target.value })
                          }
                        />
                      </label>
                    </>
                  )}
                  {filter.mode === "month" && (
                    <label>
                      Mês
                      <input
                        type="month"
                        value={filter.month}
                        onChange={(e) =>
                          setFilter({ ...filter, month: e.target.value })
                        }
                      />
                    </label>
                  )}
                </>
              )}
              {kind === "accounts" && (
                <>
                  <label>
                    Status
                    <select
                      value={filter.status}
                      onChange={(e) =>
                        setFilter({ ...filter, status: e.target.value })
                      }
                    >
                      {[
                        "Todas",
                        "Em aberto",
                        "Parcial",
                        "Pago",
                        "Vencido",
                        "Cancelado",
                      ].map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Cliente
                    <select
                      value={filter.client}
                      onChange={(e) =>
                        setFilter({ ...filter, client: e.target.value })
                      }
                    >
                      <option value="">Todos</option>
                      {state.clients.map((x: any) => (
                        <option key={x.id} value={x.id}>
                          {x.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}
              {kind === "expenses" && (
                <>
                  <label>
                    Categoria
                    <select
                      value={filter.category}
                      onChange={(e) =>
                        setFilter({ ...filter, category: e.target.value })
                      }
                    >
                      <option>Todas</option>
                      {Array.from(
                        new Set(state.expenses.map((x: any) => x.category)),
                      ).map((x: any) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Fornecedor
                    <select
                      value={filter.supplier}
                      onChange={(e) =>
                        setFilter({ ...filter, supplier: e.target.value })
                      }
                    >
                      <option value="">Todos</option>
                      {state.suppliers.map((x: any) => (
                        <option key={x.id} value={x.id}>
                          {x.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}
              {kind === "cash" && (
                <label className="span2">
                  Caixa
                  <select
                    value={filter.cashId}
                    onChange={(e) =>
                      setFilter({ ...filter, cashId: e.target.value })
                    }
                  >
                    {state.cashSessions.map((x: any) => (
                      <option key={x.id} value={x.id}>
                        {new Date(x.openedAt).toLocaleString("pt-BR")} —{" "}
                        {x.status}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <button
                className="primary-button span2"
                disabled={generating}
                onClick={generate}
              >
                {generating ? "Gerando relatório..." : "Gerar PDF"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
