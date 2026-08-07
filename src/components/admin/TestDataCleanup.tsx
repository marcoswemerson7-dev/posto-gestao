import { useState } from "react";
import { AlertTriangle, Database, Trash2, X } from "lucide-react";
import {
  limparDadosTesteGranular,
  TestDataResetAction,
  TestDataResetCounts,
} from "../../lib/postoData";

const CLEAN_ACTIONS: TestDataResetAction[] = [
  "vendas",
  "caixa",
  "contas",
  "despesas",
  "estoque",
];

const OPTIONS: {
  action: TestDataResetAction;
  title: string;
  description: string;
}[] = [
  {
    action: "vendas",
    title: "Excluir vendas",
    description: "Escolha vendas específicas ou remova todas as vendas.",
  },
  {
    action: "caixa",
    title: "Excluir caixas",
    description: "Escolha caixas específicos ou remova todo o histórico.",
  },
  {
    action: "contas",
    title: "Zerar contas a receber",
    description: "Remove contas, recebimentos e notificações relacionadas.",
  },
  {
    action: "despesas",
    title: "Zerar despesas",
    description: "Remove despesas e seus lançamentos no caixa.",
  },
  {
    action: "estoque",
    title: "Zerar movimentações de estoque",
    description: "Remove apenas o histórico de movimentações dos tanques.",
  },
  {
    action: "todos",
    title: "Limpar todos os dados operacionais",
    description: "Remove todos os lançamentos operacionais de teste.",
  },
];

const LABELS: Record<string, string> = {
  vendas: "vendas",
  caixas: "caixas",
  movimentacoes_caixa: "movimentações de caixa",
  contas: "contas a receber",
  contas_receber: "contas a receber",
  recebimentos: "recebimentos",
  despesas: "despesas",
  movimentacoes_estoque: "movimentações de estoque",
  notificacoes: "notificações",
  clientes: "clientes",
  fornecedores: "fornecedores",
};

const formatMoney = (value: number) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const formatDate = (value?: string) =>
  value
    ? new Date(value).toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "Data não informada";

function hasRecordsSelected(modal: any) {
  return modal.selected.some((action: TestDataResetAction) => {
    if (action === "vendas") return modal.allSales || modal.saleIds.length > 0;
    if (action === "caixa") return modal.allCash || modal.cashIds.length > 0;
    return true;
  });
}

export default function TestDataCleanup({ state, refresh }: any) {
  const [modal, setModal] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  function requestParams(next: any, preview: boolean) {
    const allSelected = CLEAN_ACTIONS.every((action) =>
      next.selected.includes(action),
    );
    return {
      actions: next.selected,
      saleIds: next.saleIds,
      allSales: next.allSales,
      cashIds: next.cashIds,
      allCash: next.allCash,
      confirmation: next.confirmation,
      deleteClients: next.deleteClients,
      deleteSuppliers: next.deleteSuppliers,
      tankBalances: allSelected ? next.balances : {},
      preview,
    };
  }

  async function prepare(action: TestDataResetAction) {
    setLoading(true);
    try {
      const selected = action === "todos" ? CLEAN_ACTIONS : [action];
      const next = {
        selected,
        allSales: action === "todos",
        saleIds: [] as string[],
        allCash: action === "todos",
        cashIds: [] as string[],
        counts: {} as TestDataResetCounts,
        confirmation: "",
        deleteClients: false,
        deleteSuppliers: false,
        balances: Object.fromEntries(
          state.tanks.map((tank: any) => [tank.id, tank.liters]),
        ),
      };
      if (hasRecordsSelected(next)) {
        next.counts = await limparDadosTesteGranular(requestParams(next, true));
      }
      setModal(next);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Não foi possível preparar a limpeza.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function updatePreview(changes: any) {
    const next = { ...modal, ...changes };
    setModal(next);
    if (!next.selected.length || !hasRecordsSelected(next)) {
      setModal((current: any) =>
        current ? { ...current, counts: {} } : current,
      );
      return;
    }
    try {
      const counts = await limparDadosTesteGranular(requestParams(next, true));
      setModal((current: any) => (current ? { ...current, counts } : current));
    } catch (error) {
      console.error("Prévia da limpeza", error);
    }
  }

  function toggleAction(action: TestDataResetAction, checked: boolean) {
    const selected = checked
      ? Array.from(new Set([...modal.selected, action]))
      : modal.selected.filter((item: TestDataResetAction) => item !== action);
    const changes: any = { selected };
    if (!checked && action === "vendas") {
      changes.allSales = false;
      changes.saleIds = [];
    }
    if (!checked && action === "caixa") {
      changes.allCash = false;
      changes.cashIds = [];
    }
    void updatePreview(changes);
  }

  function toggleRecord(
    kind: "saleIds" | "cashIds",
    id: string,
    checked: boolean,
  ) {
    const ids = checked
      ? Array.from(new Set([...modal[kind], id]))
      : modal[kind].filter((item: string) => item !== id);
    void updatePreview({ [kind]: ids });
  }

  async function execute() {
    if (modal.confirmation !== "ZERAR DADOS") return;
    if (!modal.selected.length || !hasRecordsSelected(modal)) {
      return alert(
        "Selecione pelo menos um registro ou uma categoria para excluir.",
      );
    }
    setLoading(true);
    try {
      const result = await limparDadosTesteGranular(
        requestParams(modal, false),
      );
      await refresh();
      setModal(null);
      alert(
        `Limpeza concluída com segurança. ${Object.values(result).reduce((total, value) => total + Number(value), 0)} registros contabilizados.`,
      );
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Não foi possível concluir a limpeza.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="danger-zone">
      <div className="danger-zone-head">
        <span>
          <AlertTriangle size={20} />
        </span>
        <div>
          <h2>Zona de perigo</h2>
          <p>Ações administrativas irreversíveis.</p>
        </div>
      </div>
      <div className="cleanup-intro">
        <div>
          <h3>Limpeza de Dados de Teste</h3>
          <p>
            Use esta área para remover lançamentos criados durante a fase de
            testes. Esta ação não pode ser desfeita.
          </p>
        </div>
        <Database size={28} />
      </div>
      <div className="cleanup-options">
        {OPTIONS.map((item) => (
          <article
            key={item.action}
            className={item.action === "todos" ? "cleanup-total" : ""}
          >
            <div>
              <strong>{item.title}</strong>
              <p>{item.description}</p>
            </div>
            <button
              disabled={loading}
              onClick={() => void prepare(item.action)}
            >
              {item.action === "todos"
                ? "Gerenciar limpeza completa"
                : "Gerenciar"}
            </button>
          </article>
        ))}
      </div>

      {modal && (
        <div
          className="modal-backdrop"
          onMouseDown={() => !loading && setModal(null)}
        >
          <div
            className="modal cleanup-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <h2>Confirmar limpeza de dados</h2>
                <p>Esta operação não pode ser desfeita.</p>
              </div>
              <button
                className="round-button sm"
                disabled={loading}
                onClick={() => setModal(null)}
              >
                <X size={17} />
              </button>
            </div>
            <div className="cleanup-warning">
              <AlertTriangle size={21} />
              <span>
                Você está prestes a excluir dados operacionais da empresa atual.
              </span>
            </div>
            <div className="cleanup-selection">
              <div className="cleanup-selection-head">
                <strong>O que deseja excluir?</strong>
                <label>
                  <input
                    type="checkbox"
                    checked={CLEAN_ACTIONS.every((action) =>
                      modal.selected.includes(action),
                    )}
                    onChange={(event) =>
                      void updatePreview({
                        selected: event.target.checked ? CLEAN_ACTIONS : [],
                        allSales: event.target.checked,
                        saleIds: [],
                        allCash: event.target.checked,
                        cashIds: [],
                      })
                    }
                  />
                  Selecionar tudo
                </label>
              </div>
              <div className="cleanup-selection-grid">
                {OPTIONS.filter((item) => item.action !== "todos").map(
                  (item) => (
                    <label key={item.action}>
                      <input
                        type="checkbox"
                        checked={modal.selected.includes(item.action)}
                        onChange={(event) =>
                          toggleAction(item.action, event.target.checked)
                        }
                      />
                      <span>
                        <b>{item.title}</b>
                        <small>{item.description}</small>
                      </span>
                    </label>
                  ),
                )}
              </div>
            </div>

            {modal.selected.includes("vendas") && (
              <div className="cleanup-records">
                <div className="cleanup-records-head">
                  <div>
                    <strong>Quais vendas deseja excluir?</strong>
                    <small>{state.sales.length} venda(s) encontrada(s)</small>
                  </div>
                  <label>
                    <input
                      type="checkbox"
                      checked={modal.allSales}
                      onChange={(event) =>
                        void updatePreview({
                          allSales: event.target.checked,
                          saleIds: [],
                        })
                      }
                    />{" "}
                    Todas as vendas
                  </label>
                </div>
                {!modal.allSales && (
                  <div className="cleanup-record-list">
                    {state.sales.length ? (
                      state.sales.map((sale: any) => {
                        const fuel =
                          state.fuels.find(
                            (item: any) => item.id === sale.fuelId,
                          )?.name || "Combustível não informado";
                        const client =
                          state.clients.find(
                            (item: any) => item.id === sale.clientId,
                          )?.name || "Consumidor não informado";
                        return (
                          <label className="cleanup-record-item" key={sale.id}>
                            <input
                              type="checkbox"
                              checked={modal.saleIds.includes(sale.id)}
                              onChange={(event) =>
                                toggleRecord(
                                  "saleIds",
                                  sale.id,
                                  event.target.checked,
                                )
                              }
                            />
                            <span>
                              <b>
                                {formatDate(sale.date)} · {fuel}
                              </b>
                              <small>
                                {client} · {sale.liters.toLocaleString("pt-BR")}{" "}
                                L · {sale.status}
                              </small>
                            </span>
                            <strong>{formatMoney(sale.total)}</strong>
                          </label>
                        );
                      })
                    ) : (
                      <p className="cleanup-empty">Nenhuma venda cadastrada.</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {modal.selected.includes("caixa") && (
              <div className="cleanup-records">
                <div className="cleanup-records-head">
                  <div>
                    <strong>Quais caixas deseja excluir?</strong>
                    <small>
                      {state.cashSessions.length} caixa(s) encontrado(s)
                    </small>
                  </div>
                  <label>
                    <input
                      type="checkbox"
                      checked={modal.allCash}
                      onChange={(event) =>
                        void updatePreview({
                          allCash: event.target.checked,
                          cashIds: [],
                        })
                      }
                    />{" "}
                    Todos os caixas
                  </label>
                </div>
                {!modal.allCash && (
                  <div className="cleanup-record-list">
                    {state.cashSessions.length ? (
                      state.cashSessions.map((cash: any) => (
                        <label className="cleanup-record-item" key={cash.id}>
                          <input
                            type="checkbox"
                            checked={modal.cashIds.includes(cash.id)}
                            onChange={(event) =>
                              toggleRecord(
                                "cashIds",
                                cash.id,
                                event.target.checked,
                              )
                            }
                          />
                          <span>
                            <b>Caixa de {formatDate(cash.openedAt)}</b>
                            <small>
                              {cash.operator || "Operador não informado"} ·{" "}
                              {cash.status}
                              {cash.closedAt
                                ? ` · fechado em ${formatDate(cash.closedAt)}`
                                : ""}
                            </small>
                          </span>
                          <strong>{formatMoney(cash.opening)}</strong>
                        </label>
                      ))
                    ) : (
                      <p className="cleanup-empty">Nenhum caixa cadastrado.</p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="cleanup-counts">
              {Object.entries(modal.counts as TestDataResetCounts)
                .filter(([, count]) => Number(count) > 0)
                .map(([key, count]) => (
                  <span key={key}>
                    <b>{Number(count)}</b> {LABELS[key] || key}
                  </span>
                ))}
            </div>

            {CLEAN_ACTIONS.every((action) =>
              modal.selected.includes(action),
            ) && (
              <>
                <div className="cleanup-checks">
                  <label>
                    <input
                      type="checkbox"
                      checked={modal.deleteClients}
                      onChange={(event) =>
                        void updatePreview({
                          deleteClients: event.target.checked,
                        })
                      }
                    />{" "}
                    Excluir também clientes
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={modal.deleteSuppliers}
                      onChange={(event) =>
                        void updatePreview({
                          deleteSuppliers: event.target.checked,
                        })
                      }
                    />{" "}
                    Excluir também fornecedores
                  </label>
                </div>
                <div className="tank-reset">
                  <h3>Saldo inicial dos tanques após a limpeza</h3>
                  {state.tanks.map((tank: any) => (
                    <label key={tank.id}>
                      <span>{tank.name}</span>
                      <input
                        type="number"
                        min="0"
                        max={tank.capacity}
                        step="0.001"
                        value={modal.balances[tank.id]}
                        onChange={(event) =>
                          setModal({
                            ...modal,
                            balances: {
                              ...modal.balances,
                              [tank.id]: Number(event.target.value),
                            },
                          })
                        }
                      />
                      <small>
                        Capacidade: {tank.capacity.toLocaleString("pt-BR")} L
                      </small>
                    </label>
                  ))}
                </div>
              </>
            )}

            <label className="cleanup-confirm">
              Para continuar, digite <b>ZERAR DADOS</b>
              <input
                autoComplete="off"
                value={modal.confirmation}
                onChange={(event) =>
                  setModal({ ...modal, confirmation: event.target.value })
                }
                placeholder="ZERAR DADOS"
              />
            </label>
            <div className="modal-actions">
              <button
                className="secondary-button"
                disabled={loading}
                onClick={() => setModal(null)}
              >
                Cancelar
              </button>
              <button
                className="danger-button"
                disabled={
                  loading ||
                  !modal.selected.length ||
                  !hasRecordsSelected(modal) ||
                  modal.confirmation !== "ZERAR DADOS"
                }
                onClick={() => void execute()}
              >
                <Trash2 size={16} />
                {loading ? "Excluindo..." : "Excluir definitivamente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
