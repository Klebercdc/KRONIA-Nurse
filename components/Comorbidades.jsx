import { useState } from "react";
import { ArrowLeft, Check, Plus, Trash2, Calendar } from "lucide-react";
import { ACCENT, BG, SURFACE, BORDER, TEXT, MUTED, DIM } from "./tema.js";
import { GRUPOS, RESPOSTAS, TODOS_OS_ITENS, formatarData, resumir } from "../lib/comorbidades/indice.js";

/**
 * Aba de comorbidades e procedimentos.
 *
 * Duas telas: a lista de pacientes já levantados e o formulário de um
 * levantamento. Tudo fica no aparelho, como o resto do app — em tela só entra
 * a INICIAL do paciente, nunca o nome.
 */

function BotaoResposta({ valor, rotulo, ativo, onClick }) {
  const cor = valor === "sim" ? ACCENT : BORDER;
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, padding: "9px 4px", borderRadius: 9, cursor: "pointer",
        border: `1.5px solid ${ativo ? cor : BORDER}`,
        background: ativo ? `${cor}22` : "transparent",
        color: ativo ? (valor === "sim" ? ACCENT : TEXT) : DIM,
        fontSize: 12.5, fontWeight: ativo ? 800 : 600, fontFamily: "inherit",
        transition: "border-color 0.12s ease, background 0.12s ease",
      }}
    >
      {rotulo}
    </button>
  );
}

/**
 * Campo de data com precisão à escolha.
 *
 * O paciente lembra que infartou "em 2019" mas não o dia. Exigir data
 * completa faria o profissional inventar um dia ou deixar vazio — as duas
 * saídas são piores do que registrar só o ano.
 */
function CampoData({ data, onChange }) {
  const precisao = (data && data.precisao) || "completa";
  const valor = (data && data.valor) || "";
  return (
    <div style={{ marginTop: 10, padding: 10, background: BG, border: `1px solid ${BORDER}`, borderRadius: 9 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, color: MUTED, fontSize: 11.5, fontWeight: 600 }}>
        <Calendar size={13} color={ACCENT} /> Quando
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        {[["completa", "Data completa"], ["ano", "Somente o ano"]].map(([p, r]) => (
          <button
            key={p}
            onClick={() => onChange({ precisao: p, valor: "" })}
            style={{
              flex: 1, padding: "7px 4px", borderRadius: 8, cursor: "pointer",
              border: `1px solid ${precisao === p ? ACCENT : BORDER}`,
              background: precisao === p ? `${ACCENT}18` : "transparent",
              color: precisao === p ? ACCENT : DIM,
              fontSize: 11.5, fontWeight: precisao === p ? 800 : 600, fontFamily: "inherit",
            }}
          >
            {r}
          </button>
        ))}
      </div>
      {precisao === "ano" ? (
        <input
          type="number"
          inputMode="numeric"
          placeholder="Ex: 2019"
          min={1900}
          max={2100}
          value={valor}
          onChange={(e) => onChange({ precisao: "ano", valor: e.target.value })}
          className="kn-input"
          style={{ width: "100%", minWidth: 0, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 12px", color: TEXT, fontSize: 15, fontFamily: "inherit", outline: "none" }}
        />
      ) : (
        <input
          type="date"
          value={valor}
          onChange={(e) => onChange({ precisao: "completa", valor: e.target.value })}
          className="kn-input"
          style={{ width: "100%", minWidth: 0, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 12px", color: TEXT, fontSize: 15, fontFamily: "inherit", outline: "none" }}
        />
      )}
      <div style={{ marginTop: 6, fontSize: 11, color: DIM }}>
        Deixe em branco se o paciente não souber informar.
      </div>
    </div>
  );
}

function Grupo({ grupo, respostas, setResposta, marcarGrupoComoNao }) {
  const [aberto, setAberto] = useState(false);
  const marcados = grupo.itens.filter((i) => respostas[i.id] && respostas[i.id].resposta).length;
  const positivos = grupo.itens.filter((i) => respostas[i.id] && respostas[i.id].resposta === "sim").length;

  return (
    <div style={{ border: `1px solid ${BORDER}`, borderRadius: 14, marginTop: 10, overflow: "hidden", background: SURFACE }}>
      <button
        onClick={() => setAberto(!aberto)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "14px 14px", background: "none", border: "none", cursor: "pointer", color: TEXT, textAlign: "left", fontFamily: "inherit" }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{grupo.titulo}</div>
          <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
            {marcados} de {grupo.itens.length} respondidas
            {positivos > 0 && <span style={{ color: ACCENT, fontWeight: 700 }}> · {positivos} sim</span>}
          </div>
        </div>
        <span style={{ color: DIM, fontSize: 13, fontWeight: 700 }}>{aberto ? "−" : "+"}</span>
      </button>

      {aberto && (
        <div style={{ padding: "0 14px 14px" }}>
          {/* Atalho da lista de origem: a maioria dos grupos é toda "Não". */}
          <button
            onClick={() => marcarGrupoComoNao(grupo)}
            style={{ width: "100%", padding: "9px", marginBottom: 12, borderRadius: 9, border: `1px dashed ${BORDER}`, background: "transparent", color: MUTED, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
          >
            Definir como "Não" para todas as perguntas
          </button>

          {grupo.itens.map((item) => {
            const r = respostas[item.id] || {};
            return (
              <div key={item.id} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 14, marginBottom: 7, lineHeight: 1.35 }}>{item.rotulo}</div>
                <div style={{ display: "flex", gap: 7 }}>
                  {RESPOSTAS.map((op) => (
                    <BotaoResposta
                      key={op.valor}
                      valor={op.valor}
                      rotulo={op.rotulo}
                      ativo={r.resposta === op.valor}
                      onClick={() => setResposta(item.id, op.valor)}
                    />
                  ))}
                </div>
                {/* A data só faz sentido no que o paciente TEM. */}
                {r.resposta === "sim" && (
                  <CampoData data={r.data} onChange={(d) => setResposta(item.id, "sim", d)} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Comorbidades({ registros, onSalvar, onExcluir, onSair }) {
  const [tela, setTela] = useState("lista");
  const [inicial, setInicial] = useState("");
  const [respostas, setRespostas] = useState({});
  const [editandoId, setEditandoId] = useState(null);

  const resumo = resumir(respostas);
  const podeSalvar = inicial.trim().length > 0;

  function setResposta(itemId, resposta, data) {
    setRespostas((atual) => {
      const anterior = atual[itemId] || {};
      // Trocar de "sim" para outra coisa descarta a data: guardar quando
      // aconteceu algo que o paciente não tem seria registro falso.
      const proximo = resposta === "sim"
        ? { resposta, data: data !== undefined ? data : anterior.data }
        : { resposta };
      return { ...atual, [itemId]: proximo };
    });
  }

  function marcarGrupoComoNao(grupo) {
    setRespostas((atual) => {
      const copia = { ...atual };
      grupo.itens.forEach((i) => { copia[i.id] = { resposta: "nao" }; });
      return copia;
    });
  }

  function novo() {
    setInicial("");
    setRespostas({});
    setEditandoId(null);
    setTela("form");
  }

  function abrir(reg) {
    setInicial(reg.inicial);
    setRespostas(reg.respostas || {});
    setEditandoId(reg.id);
    setTela("form");
  }

  function salvar() {
    onSalvar({
      id: editandoId || Date.now(),
      inicial: inicial.trim().toUpperCase(),
      respostas,
      atualizadoEm: new Date().toISOString(),
    });
    setTela("lista");
  }

  // ── Lista de pacientes levantados ────────────────────────────────────────
  if (tela === "lista") {
    return (
      <div style={{ padding: "20px 20px 28px", display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.2, color: ACCENT, textTransform: "uppercase" }}>
          Clínica
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>Comorbidades</div>
        <div style={{ color: MUTED, fontSize: 14, marginTop: 2, lineHeight: 1.4 }}>
          Levantamento de {TODOS_OS_ITENS.length} condições e procedimentos, por paciente.
          Em tela só entra a inicial — nunca o nome.
        </div>

        <button
          onClick={novo}
          style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", marginTop: 18, background: ACCENT, border: "none", borderRadius: 12, padding: "15px 16px", color: BG, fontSize: 15.5, fontWeight: 800, cursor: "pointer", boxShadow: `0 10px 26px -8px ${ACCENT}99`, fontFamily: "inherit" }}
        >
          <Plus size={19} /> Novo levantamento
        </button>

        <div style={{ marginTop: 22, fontSize: 13, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: 0.6 }}>
          Pacientes ({registros.length})
        </div>

        {registros.length === 0 ? (
          <div style={{ marginTop: 12, padding: 18, border: `1px dashed ${BORDER}`, borderRadius: 12, color: DIM, fontSize: 13.5, textAlign: "center", lineHeight: 1.5 }}>
            Nenhum paciente ainda.<br />O que você acrescentar fica salvo aqui no aparelho.
          </div>
        ) : (
          registros.map((reg) => {
            const r = resumir(reg.respostas);
            return (
              <div key={reg.id} style={{ marginTop: 10, border: `1px solid ${BORDER}`, borderRadius: 12, background: SURFACE, display: "flex", alignItems: "center", gap: 10, padding: "13px 14px" }}>
                <button onClick={() => abrir(reg)} style={{ flex: 1, minWidth: 0, background: "none", border: "none", cursor: "pointer", color: TEXT, textAlign: "left", padding: 0, fontFamily: "inherit" }}>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>{reg.inicial}</div>
                  <div style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>
                    <span style={{ color: ACCENT, fontWeight: 700 }}>{r.sim} sim</span>
                    {" · "}{r.respondidas} de {r.total} respondidas
                  </div>
                  <div style={{ fontSize: 11, color: DIM, marginTop: 2 }}>
                    {new Date(reg.atualizadoEm).toLocaleString("pt-BR")}
                  </div>
                </button>
                <button
                  onClick={() => onExcluir(reg.id)}
                  aria-label={`Excluir levantamento de ${reg.inicial}`}
                  style={{ flexShrink: 0, background: "none", border: `1px solid ${BORDER}`, borderRadius: 9, padding: 9, cursor: "pointer" }}
                >
                  <Trash2 size={15} color={DIM} />
                </button>
              </div>
            );
          })
        )}

        <div style={{ flex: 1, minHeight: 16 }} />
        <button onClick={onSair} style={{ width: "100%", marginTop: 18, background: "none", border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px", color: TEXT, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
          Voltar ao início
        </button>
      </div>
    );
  }

  // ── Formulário de um levantamento ────────────────────────────────────────
  return (
    <div style={{ padding: "20px 20px 28px", display: "flex", flexDirection: "column", flex: 1 }}>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.2, color: ACCENT, textTransform: "uppercase" }}>
        Comorbidades e procedimentos
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
        {editandoId ? "Editar levantamento" : "Novo levantamento"}
      </div>

      <div style={{ marginTop: 16, fontSize: 13, color: MUTED, fontWeight: 600 }}>Inicial do paciente</div>
      <input
        value={inicial}
        onChange={(e) => setInicial(e.target.value)}
        placeholder="Ex: M.A.S."
        className="kn-input"
        style={{ width: "100%", minWidth: 0, marginTop: 7, background: BG, border: `1.5px solid ${inicial.trim() ? ACCENT : BORDER}`, borderRadius: 12, padding: "14px 16px", color: TEXT, fontSize: 17, fontWeight: 700, fontFamily: "inherit", outline: "none" }}
      />

      <div style={{ marginTop: 16, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px", background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 11 }}>
        <span style={{ fontSize: 12.5, color: MUTED }}>Respondidas</span>
        <span style={{ fontSize: 13, fontWeight: 800, color: resumo.respondidas === resumo.total ? ACCENT : TEXT }}>
          {resumo.respondidas} de {resumo.total}
        </span>
      </div>

      {GRUPOS.map((g) => (
        <Grupo
          key={g.id}
          grupo={g}
          respostas={respostas}
          setResposta={setResposta}
          marcarGrupoComoNao={marcarGrupoComoNao}
        />
      ))}

      <div style={{ display: "flex", gap: 12, marginTop: 22 }}>
        <button onClick={() => setTela("lista")} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "none", border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px", color: TEXT, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
          <ArrowLeft size={17} /> Voltar
        </button>
        <button
          onClick={salvar}
          disabled={!podeSalvar}
          style={{ flex: 1.4, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: podeSalvar ? ACCENT : SURFACE, border: "none", borderRadius: 12, padding: "14px", color: podeSalvar ? BG : DIM, fontSize: 16, fontWeight: 800, cursor: podeSalvar ? "pointer" : "default", fontFamily: "inherit" }}
        >
          <Check size={17} /> Salvar
        </button>
      </div>
      {!podeSalvar && (
        <div style={{ marginTop: 8, fontSize: 12, color: DIM, textAlign: "center" }}>
          Informe a inicial do paciente para salvar.
        </div>
      )}
    </div>
  );
}

export { formatarData };
