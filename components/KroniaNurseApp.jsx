// =============================================================================
// KRONIA Nurse — app do motor adaptativo (splash → login → home → evolução).
//
// ESCOPO: só o motor determinístico. Nenhuma chamada de IA, nenhuma tela
// Kronos — o texto da evolução é montado por regras (schema + showIf +
// classify), sem custo de inferência.
//
// MAPEAMENTO: "Grafo Clínico Adaptativo Universal" → implementação real
// -----------------------------------------------------------------------------
//   NODE_ID            → question.id
//   DOMAIN              → question.layer ("universal" | "nucleo_area" | "condicional")
//   CONTEXT             → context.id (qual área)
//   QUESTION            → question.titulo
//   OPTION              → question.options[].label
//   CONDITION/TRIGGER    → question.showIf
//   DEPENDENCY          → showIf.questionId
//   NEXT_NODE            → resolvido dinamicamente por buildSequence() (não é
//                          um campo estático — a "próxima pergunta" depende
//                          das respostas acumuladas, recalculada a cada passo)
//   SEVERITY/RISK        → question.classify() (para numéricos) e
//                          context.validacoesCruzadas (para combinações)
//   REASSESSMENT         → ainda não implementado (histórico temporal)
//   EVIDENCE_REFERENCE    → comentários inline no schema, citando a fonte
//                          quando existe (ex: Silverman-Andrade, NPUAP)
//
// "REGRA DE NÃO INVENÇÃO" do documento — como é respeitada aqui:
//   - Nenhum showIf assume uma condição por causa de outra (ex: via_aerea=vm
//     NUNCA seta consciencia=sedado automaticamente, e vice-versa).
//   - Quando a resposta certa seria uma sub-árvore clínica sem fonte segura
//     pra categorizar, o sistema NÃO inventa opções — marca needsReview
//     (CONFERIR) e deixa a decisão de detalhamento pro profissional.
//   - "NÃO AVALIADO ≠ NORMAL": pergunta não respondida NUNCA vira "normal"
//     por omissão — vira pendência (CONFERIR — ... não respondido).
// =============================================================================

import { useState, useEffect } from "react";
import {
  Target,
  ArrowLeft,
  ArrowRight,
  Copy,
  RotateCcw,
  X,
  CheckCircle2,
  Check,
  Bell,
  User,
  MessageCircleQuestion,
  Share2,
  ShieldCheck,
  FileText,
  Lightbulb,
  Home,
  Users,
  Plus,
  ClipboardList,
  Building2,
  Clock,
  Heart,
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
} from "lucide-react";

// Ícone real do logo (recorte do arquivo oficial enviado pelo usuário).
const LOGO_ICON_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAPAAAACYCAMAAADtLJSXAAAAP1BMVEUAAAD3+PhY1rANFRIaIB+eoqFIsZFdYWFpdXU3j3MqZ1RYXV01jHAoMjAlX01cZGMAAAAAAAAAAAAAAAAAAADbB97MAAAAEHRSTlMA/f5fkOzo6A/hnp+U5F1ZSwztkgAABYNJREFUeNrtnQmyoyAQQNEGomj0/reN4IobGkHWrhrDzP9j5aX3Fg1CSZLcETj9IYTDiavPPala7C8+/pDsDyGVn8jwyf4V0nrIW6HsgVT+AWfPhEXGm2XYK9x2dkfy+fA/3XEdkAlZLLl0r4sPyis/HqMzwTzHqvMsCBH52kurHuPzk8/KKx2TJ2944cfglwc/dX+PdPwEGEux2idgpAM480jBf5pjk/lH/CjitOsKxP3IBY9UswEmzhNjvcDu61g7sOs61g6coSIyYMetegAudAI7bdUmNOw0sRFgl4nNAGckNmB3iU0ELaeJnwHjk8FedMBZdMBZgMBF5h0xPAJG/l2EeQisIg4tD6ts2kEV46eaUFxLDQ8YTq+ju1dU4+e+ViGykcmHXQXWNKWYtnwUxNVhgF7ghZDYgJnbwMZOHBuws0HLwPtyOy0ZA8bJpEON0t9IgxaKRsOupiUwDOzeHr3YgpZhDaNUablbeIC4IaBayAeh/h+6RXPtxB5VWqot8iqUr2eVVqXcI32p8PBoxKO+1+EKsEel5VMN4ziBPRrxFJScCW1DAw58xJOA0wAgASfgBJyA0wDA3ognAXe6Z+yL8bcTcRALIWLxlY44BJO+dQPxITDyJWhVWfaM2LchHtEEjH3RMApcwxvg9iZw4b2GW3JHmoMTk5Aqrf5BAJ3R7j42INbSEscGnJqH6IAZzeMCzjuJqT1kHLgMEfh7omHqYC1tSsNUAEO4PrzKw5ALaVwEhrbpun1oC8BrgaKA/zTMemAXo7RqB8Dn2olXwGUPXLoHXGm6PryyGprbVvERMHm6A2C/Wxp4LTrx/8CXTrza1MJyZzWsNun2j6A1WrRFJz4MWhVRPLH0j7QkkpKALsEy8H5/vys8LV14Ii/s+LCwaKFmCs5p+HHNSrbJSySl4RhcaSniHtnWlRSEnlmAwJtZV9OHK2y1f3hz7wkbbNmqE78JPDpvabP0eBEYRs3WNp0Y3gPGY8XRWC09Xnw4Aeesx4Vl4Dce60Yn17UatV4DhjkbWY1aBm4vqmlvuTtJqZyNW3WWpuwMgdaGgHU+b0OQwX5SYnL4OvvUhr6KmiHW7qtsNynleJGgLvHqJ251h+m+ya/3XRgWn8lZ1GryWWojNp3pVfBSL8DKeq4rZ/2x2ecp//Wyk25F+Uu+FEOZWFeg3r5LodpSYlxqrswVwsyoWI+Od+aSvcYlK4ZF1AKqAjYUqPl8gt97J+Y7YlFVn6oSf5mO6pSU7wOv7HwZtfLXgW9sUVIa/haOze+8lB0dLgI3NomzC8C9+aKtizZyKGfz/2A1FyaEr5Z+baTqvkEMSgV/pdJx4aIg/+K8Kg9ivcGh/fWthkTV4lMpBfX5l1EZS0SqGXgbhxtqKg1PBQjRoOIhxkgN7zCGXm3tGBsmoEdhieamZ19dPJJOT4g48BexGq2gUil4G4TZ/mczufB+tcVQjazK8DQ4cl4Prvq/Aw3WS2Bnv8oHFF81NGtrcj440OBo9dT2rp4roY2ceXAz9X90yj9HLtq5tu09LgoZrinuX1paXiWbnLg8Mtmy7xadtugpX/Pv3uKX1aTLa0xKmtP6qBEUTtw4btHH6Zr21ZXc/9VnrX4/8bG9Te2qTW9lVRVNA6xjDRrr/t5RMZL7mnG+wY5rpamUcvs7BI+ezIpWxfIwwTobyBqb0r1CvA63fTsEJ0TMcK2ssepG25aRz6KkGfIwiT0LStY39NzU9LjRY/rex+2oh55N3IF6YdGXpZzSzvl4sw4FeEo7x1fNbG+s1StYPaEJyqKv7CP1KWTdAD6uK3hMa8IhZioXRiicgLWIWiWKRSC0tHMtE4fkpJdsmkbEy8JKOxeduI6JuI7LormOUZIkSZIkiU9+d9wwBNIvTuMAAAAASUVORK5CYII=";

// Wordmark do header, desenhado em texto (mesma proporção do arquivo oficial:
// "KRONIA" fino e espaçado + "Nurse" itálico em verde).
/** Caminho do arquivo oficial do wordmark. Basta commitar a imagem aqui. */
const WORDMARK_ARQUIVO = "/kronia-wordmark.png";

/**
 * Wordmark do cabeçalho.
 *
 * Usa o arquivo oficial quando ele existe em public/. Enquanto não existir, o
 * onError cai no desenho em texto — o cabeçalho nunca fica com imagem
 * quebrada nem vazio. Trocar a marca é commitar o PNG no caminho acima;
 * nenhuma linha de código precisa mudar.
 */
function Wordmark({ height = 13 }) {
  const [semArquivo, setSemArquivo] = useState(false);

  if (!semArquivo) {
    return (
      <img
        src={WORDMARK_ARQUIVO}
        alt="KRONIA Nurse"
        onError={() => setSemArquivo(true)}
        style={{ height: height * 1.7, width: "auto", display: "block" }}
      />
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 7, lineHeight: 1 }}>
      <span style={{ fontSize: height + 5, fontWeight: 300, letterSpacing: 3.5, marginRight: -3.5, color: TEXT }}>
        KRONIA
      </span>
      <span style={{ fontSize: height + 3, fontWeight: 600, fontStyle: "italic", color: ACCENT }}>Nurse</span>
    </div>
  );
}

function LogoLockup({ size = 132 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: size * 0.12 }}>
      <img
        src={`data:image/png;base64,${LOGO_ICON_B64}`}
        alt="Kronia Nurse"
        style={{ width: size, height: "auto", display: "block" }}
      />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: size * 0.03 }}>
        <span style={{ fontSize: size * 0.26, fontWeight: 300, letterSpacing: size * 0.075, color: TEXT, paddingLeft: size * 0.075 }}>
          KRONIA
        </span>
        <span style={{ fontSize: size * 0.15, fontWeight: 400, letterSpacing: size * 0.12, color: ACCENT, paddingLeft: size * 0.12 }}>
          NURSE
        </span>
      </div>
    </div>
  );
}

// ---- Tokens de cor (extraídos das telas oficiais) ----
const ACCENT = "#25E08C";
const ACCENT_2 = "#7DF3BE";
const BG = "#020B08";
const SURFACE = "#08170F";
const BORDER = "#153A28";
const TEXT = "#F3F8F5";
const MUTED = "#8FA79C";
const DIM = "#5C7A6D";

// O motor vive em lib/evolucao/grafo-adaptativo.js — extraído deste protótipo
// por recorte de arquivo, sem reescrita de lógica, e coberto por
// lib/__tests__/grafo-adaptativo.test.ts (6 cenários clínicos + invariantes).
// Esta tela é só apresentação: não decide nada clínico.
import {
  getOptions,
  buildSequence,
  isAnswered,
  CONTEXTS,
} from "../lib/evolucao/grafo-adaptativo.js";
// A evolução é a foto do paciente no momento da avaliação — NÃO é o registro
// do Processo de Enfermagem inteiro. Evolução é UMA das etapas da Res. COFEN
// 736/2024 (Art. 4º, § 5º); diagnóstico e planejamento são registros próprios,
// de outro documento. gerarEvolucao encaixa a prosa do motor na abertura, na
// linha de sinais vitais, no exame por sistema e nos cuidados realizados.
import { gerarEvolucao } from "../lib/evolucao/evolucao.js";
// =============================================================================
const store = {
  async get(key) {
    if (typeof window === "undefined") return null;
    if (window.storage && window.storage.get) {
      const res = await window.storage.get(key);
      return res ? res.value : null;
    }
    return window.localStorage.getItem(key);
  },
  async set(key, value) {
    if (typeof window === "undefined") return;
    if (window.storage && window.storage.set) return window.storage.set(key, value);
    window.localStorage.setItem(key, value);
  },
};

function Radio({ checked }) {
  return (
    <span style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${checked ? ACCENT : "#3A4F47"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {checked && <span style={{ width: 11, height: 11, borderRadius: "50%", background: ACCENT }} />}
    </span>
  );
}

function CheckBox({ checked }) {
  return (
    <span style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${checked ? ACCENT : "#3A4F47"}`, background: checked ? ACCENT : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {checked && <Check size={14} color={BG} strokeWidth={3} />}
    </span>
  );
}

function NumericField({ question, value, onChange, answers }) {
  const num = value === undefined || value === "" ? null : Number(value);
  const isValid = num !== null && !Number.isNaN(num) && num >= question.min && num <= question.max;
  const result = isValid ? question.classify(num, answers) : null;

  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, background: BG, border: `1.5px solid ${isValid ? ACCENT : BORDER}`, borderRadius: 12, padding: "14px 16px", boxShadow: isValid ? `0 0 0 1px ${ACCENT}40, 0 6px 18px -8px ${ACCENT}55` : "none", transition: "box-shadow 0.15s ease, border-color 0.15s ease" }}>
        <input
          type="number"
          inputMode="decimal"
          value={value === undefined ? "" : value}
          placeholder={question.placeholder || `Ex: ${Math.round((question.min + question.max) / 2)}`}
          onChange={(e) => onChange(e.target.value)}
          style={{ flex: 1, background: "none", border: "none", outline: "none", color: TEXT, fontSize: 28, fontWeight: 700, fontFamily: "inherit" }}
        />
        <span style={{ color: MUTED, fontSize: 15, fontWeight: 600 }}>{question.unit}</span>
      </div>
      <div style={{ minHeight: 22, marginTop: 10, fontSize: 13, color: isValid ? ACCENT : DIM }}>
        {isValid
          ? result.label
            ? `Classificação automática: ${result.label}`
            : "Valor registrado"
          : `Faixa esperada: ${question.min}–${question.max} ${question.unit}`}
      </div>
    </div>
  );
}

function BPField({ question, value, onChange, answers }) {
  const a = value && value.a !== undefined && value.a !== "" ? Number(value.a) : null;
  const b = value && value.b !== undefined && value.b !== "" ? Number(value.b) : null;
  const aValid = a !== null && !Number.isNaN(a) && a >= question.minA && a <= question.maxA;
  const bValid = b !== null && !Number.isNaN(b) && b >= question.minB && b <= question.maxB;
  const isValid = aValid && bValid;
  const result = isValid ? question.classify(a, b, answers) : null;

  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: MUTED, fontWeight: 600, marginBottom: 6 }}>{question.labelA}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, background: BG, border: `1.5px solid ${aValid ? ACCENT : BORDER}`, borderRadius: 12, padding: "14px 14px" }}>
            <input
              type="number"
              inputMode="decimal"
              value={value && value.a !== undefined ? value.a : ""}
              placeholder={`${Math.round((question.minA + question.maxA) / 2)}`}
              onChange={(e) => onChange({ ...(value || {}), a: e.target.value })}
              style={{ width: "100%", background: "none", border: "none", outline: "none", color: TEXT, fontSize: 26, fontWeight: 700, fontFamily: "inherit" }}
            />
          </div>
        </div>
        <div style={{ fontSize: 22, color: DIM, fontWeight: 700, marginTop: 20 }}>×</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: MUTED, fontWeight: 600, marginBottom: 6 }}>{question.labelB}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, background: BG, border: `1.5px solid ${bValid ? ACCENT : BORDER}`, borderRadius: 12, padding: "14px 14px" }}>
            <input
              type="number"
              inputMode="decimal"
              value={value && value.b !== undefined ? value.b : ""}
              placeholder={`${Math.round((question.minB + question.maxB) / 2)}`}
              onChange={(e) => onChange({ ...(value || {}), b: e.target.value })}
              style={{ width: "100%", background: "none", border: "none", outline: "none", color: TEXT, fontSize: 26, fontWeight: 700, fontFamily: "inherit" }}
            />
          </div>
        </div>
        <span style={{ color: MUTED, fontSize: 13, fontWeight: 600, marginTop: 20 }}>{question.unitA}</span>
      </div>
      <div style={{ minHeight: 22, marginTop: 10, fontSize: 13, color: isValid ? ACCENT : DIM }}>
        {isValid ? `Classificação automática: ${result.label}` : `Faixas esperadas: ${question.labelA} ${question.minA}–${question.maxA}, ${question.labelB} ${question.minB}–${question.maxB} ${question.unitA}`}
      </div>
    </div>
  );
}

function TextField({ question, value, onChange }) {
  const preenchido = typeof value === "string" && value.trim().length > 0;
  return (
    <div style={{ marginTop: 18 }}>
      <input
        type="text"
        value={value || ""}
        placeholder={question.placeholder || "Digite aqui"}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          boxSizing: "border-box",
          background: BG,
          border: `1.5px solid ${preenchido ? ACCENT : BORDER}`,
          borderRadius: 12,
          padding: "16px",
          color: TEXT,
          fontSize: 18,
          fontWeight: 600,
          fontFamily: "inherit",
          outline: "none",
        }}
      />
    </div>
  );
}

function IconButton({ icon, onClick }) {
  return (
    <button onClick={onClick} style={{ width: 36, height: 36, borderRadius: "50%", border: `1.5px solid ${ACCENT}55`, background: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
      {icon}
    </button>
  );
}

function GoogleIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" />
      <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z" />
      <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" />
    </svg>
  );
}

// Onda de ECG do topo da home — traço grosso com brilho, sobre grade fraca.
// Um batimento completo: linha de base, onda P, complexo QRS e onda T.
const TRACADO_PULSO = "M0 56 H30 L42 44 L54 22 L66 76 L78 8 L90 62 L104 56 H150";

function PulseHero({ width = 150, height = 82 }) {
  return (
    <svg width={width} height={height} viewBox="0 0 170 96" style={{ flexShrink: 0 }}>
      <defs>
        <pattern id="knGrid" width="14" height="14" patternUnits="userSpaceOnUse">
          <path d="M14 0 H0 V14" fill="none" stroke={ACCENT} strokeOpacity="0.13" strokeWidth="1" />
        </pattern>
      </defs>
      <rect x="14" y="4" width="156" height="88" fill="url(#knGrid)" />
      {/* A onda fica SEMPRE inteira. Antes ela era desenhada por
          stroke-dashoffset animado, então durante 60% do ciclo o batimento
          aparecia cortado — e qualquer captura pegava a onda pela metade.
          Agora o traço completo é fixo e a animação é um brilho que percorre
          por cima. */}
      <path
        d={TRACADO_PULSO}
        fill="none" stroke={ACCENT} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 5px ${ACCENT}) drop-shadow(0 0 14px ${ACCENT}66)` }}
      />
      <path
        className="kn-pulso-brilho"
        d={TRACADO_PULSO}
        fill="none" stroke={ACCENT_2} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
        strokeOpacity="0.9"
      />
      <circle cx="150" cy="56" r="6" fill={ACCENT} style={{ filter: `drop-shadow(0 0 8px ${ACCENT})` }} />
    </svg>
  );
}

export default function KroniaNurseApp() {
  const [contextId, setContextId] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResult, setShowResult] = useState(false);
  // "splash" | "login" | "home" | "identificacao" | "quiz" | "historico"
  const [screen, setScreen] = useState("splash");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [leito, setLeito] = useState("");
  const [iniciais, setIniciais] = useState("");
  const [historico, setHistorico] = useState([]);
  const [historicoCarregado, setHistoricoCarregado] = useState(false);
  const [savedThisResult, setSavedThisResult] = useState(false);

  const context = CONTEXTS.find((c) => c.id === contextId) || null;
  const sequence = context ? buildSequence(context, answers) : [];
  const safeStep = Math.min(step, Math.max(sequence.length - 1, 0));
  const current = sequence[safeStep];
  const total = sequence.length;

  // Splash → login depois de 2s.
  useEffect(() => {
    if (screen !== "splash") return;
    const t = setTimeout(() => setScreen("login"), 2000);
    return () => clearTimeout(t);
  }, [screen]);

  // Carrega o histórico do plantão (persistente entre sessões) uma vez.
  useEffect(() => {
    (async () => {
      try {
        const value = await store.get("historico_plantao");
        setHistorico(value ? JSON.parse(value) : []);
      } catch (e) {
        setHistorico([]);
      } finally {
        setHistoricoCarregado(true);
      }
    })();
  }, []);

  // Salva a evolução gerada no histórico assim que a tela de resultado abre
  // (uma única vez por evolução, mesmo se o componente re-renderizar).
  useEffect(() => {
    if (showResult && context && !savedThisResult) {
      const registro = {
        id: Date.now(),
        contextoId: context.id,
        contextoNome: context.nome,
        leito,
        iniciais: iniciais.toUpperCase(),
        dataHora: new Date().toISOString(),
        texto: gerarEvolucao(context, answers, sequence),
      };
      const novaLista = [registro, ...historico];
      setHistorico(novaLista);
      setSavedThisResult(true);
      store.set("historico_plantao", JSON.stringify(novaLista)).catch(() => {});
    }
  }, [showResult]);

  function pickContext(c) {
    setContextId(c.id);
    setAnswers({});
    setStep(0);
    setShowResult(false);
    setSavedThisResult(false);
    setLeito("");
    setIniciais("");
    setScreen("identificacao");
  }

  function iniciarPerguntas() {
    setScreen("quiz");
  }

  function backToHome() {
    setContextId(null);
    setAnswers({});
    setStep(0);
    setShowResult(false);
    setSavedThisResult(false);
    setLeito("");
    setIniciais("");
    setScreen("home");
  }

  function abrirHistorico() {
    setScreen("historico");
  }

  function selectValue(qId, value) {
    setAnswers((prev) => ({ ...prev, [qId]: value }));
  }

  function toggleMulti(qId, value) {
    setAnswers((prev) => {
      const cur = prev[qId] || [];
      if (value === "nenhum") return { ...prev, [qId]: ["nenhum"] };
      const withoutNenhum = cur.filter((v) => v !== "nenhum");
      const next = withoutNenhum.includes(value)
        ? withoutNenhum.filter((v) => v !== value)
        : [...withoutNenhum, value];
      return { ...prev, [qId]: next };
    });
  }

  function next() {
    if (safeStep < total - 1) setStep(safeStep + 1);
    else setShowResult(true);
  }

  function back() {
    if (safeStep > 0) setStep(safeStep - 1);
    else setScreen("identificacao");
  }

  const pct = total > 0 ? Math.round(((safeStep + 1) / total) * 100) : 0;
  const identificacaoValida = leito.trim().length > 0 && iniciais.trim().length > 0;
  const semShell = screen === "splash" || screen === "login";

  const estilosGlobais = `
    @keyframes pulsoLinha {
      0% { stroke-dashoffset: 340; }
      60% { stroke-dashoffset: 0; }
      100% { stroke-dashoffset: 0; }
    }
    .kn-pulso-path { animation: pulsoLinha 2.6s ease-out infinite; filter: drop-shadow(0 0 6px ${ACCENT}) drop-shadow(0 0 16px ${ACCENT}80); }
    /* Segmento curto de brilho correndo sobre a onda já desenhada. */
    @keyframes pulsoBrilho {
      0% { stroke-dashoffset: 330; opacity: 0; }
      12% { opacity: 1; }
      88% { opacity: 1; }
      100% { stroke-dashoffset: -30; opacity: 0; }
    }
    .kn-pulso-brilho {
      stroke-dasharray: 26 330;
      animation: pulsoBrilho 2.6s linear infinite;
    }
    @keyframes vivoDot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.7); }
    }
    .kn-vivo-dot { animation: vivoDot 1.6s ease-in-out infinite; }
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: none; }
    }
    .kn-fade { animation: fadeUp 0.6s ease-out both; }
    .kn-input::placeholder { color: ${DIM}; font-weight: 400; }
    @media (prefers-reduced-motion: reduce) {
      .kn-pulso-path { animation: none; stroke-dashoffset: 0; }
      .kn-pulso-brilho { animation: none; opacity: 0; }
      .kn-vivo-dot, .kn-fade { animation: none; }
    }
  `;

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TEXT, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", display: "flex", justifyContent: "center" }}>
      <style>{estilosGlobais}</style>
      <div style={{ width: "100%", maxWidth: 480, minHeight: "100vh", display: "flex", flexDirection: "column", paddingTop: "env(safe-area-inset-top)" }}>

        {/* Header — só nas telas internas */}
        {!semShell && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px 10px", borderBottom: `1px solid ${BORDER}`, boxShadow: `0 1px 0 0 ${ACCENT}12` }}>
            <button onClick={backToHome} style={{ display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0 }}>
              <Wordmark height={13} />
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button style={{ position: "relative", background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <Bell size={19} color={TEXT} />
                <span style={{ position: "absolute", top: 2, right: 2, width: 7, height: 7, borderRadius: "50%", background: ACCENT, boxShadow: `0 0 6px ${ACCENT}` }} />
              </button>
              <button style={{ width: 32, height: 32, borderRadius: "50%", border: `1.5px solid ${BORDER}`, background: SURFACE, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <User size={16} color={TEXT} />
              </button>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* SPLASH                                                            */}
        {/* ---------------------------------------------------------------- */}
        {screen === "splash" && (
          <button
            onClick={() => setScreen("login")}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              background: `radial-gradient(circle at 50% 45%, #08201A 0%, ${BG} 62%)`,
              border: "none", cursor: "pointer", minHeight: "100vh", width: "100%",
            }}
          >
            <div className="kn-fade">
              <LogoLockup size={150} />
            </div>
          </button>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* LOGIN                                                             */}
        {/* ---------------------------------------------------------------- */}
        {screen === "login" && (
          // overflowX só, nunca overflow: com o conteúdo centralizado e
          // `overflow: hidden`, em tela baixa o excesso era cortado nas duas
          // pontas e o botão Entrar ficava inalcançável. Assim os grafismos
          // seguem contidos na horizontal e a tela rola quando não couber.
          <div style={{ position: "relative", flex: 1, padding: "20px 22px 24px", overflowX: "hidden", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            {/* Grafismos de fundo: arcos à esquerda, onda à direita */}
            <svg width="220" height="240" viewBox="0 0 220 240" style={{ position: "absolute", left: -70, top: 150, opacity: 0.5, pointerEvents: "none" }}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <path key={i} d={`M-40 ${240 - i * 16} Q 90 ${150 - i * 22} 220 ${40 - i * 10}`} fill="none" stroke={ACCENT} strokeOpacity={0.16 - i * 0.02} strokeWidth="1.4" />
              ))}
            </svg>
            <svg width="150" height="200" viewBox="0 0 150 200" style={{ position: "absolute", right: -18, top: 60, opacity: 0.55, pointerEvents: "none" }}>
              <path d="M0 60 H24 L38 24 L54 130 L70 6 L86 96 L100 60 H150" fill="none" stroke={ACCENT} strokeOpacity="0.5" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>

            <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "center" }}>
              <LogoLockup size={128} />
            </div>

            <div style={{ position: "relative", zIndex: 1, textAlign: "center", marginTop: 22 }}>
              <div style={{ fontSize: 27, fontWeight: 800, lineHeight: 1.15, letterSpacing: -0.6 }}>
                Evolua em minutos.<br />
                <span style={{ color: ACCENT }}>Ganhe tempo no plantão.</span>
              </div>
              <div style={{ fontSize: 13.5, color: MUTED, marginTop: 12, lineHeight: 1.5 }}>
                Inteligência que organiza o raciocínio clínico<br />
                e transforma sua documentação em algo<br />
                <span style={{ color: ACCENT, fontWeight: 600 }}>simples</span>, <span style={{ color: ACCENT, fontWeight: 600 }}>rápido</span> e <span style={{ color: ACCENT, fontWeight: 600 }}>seguro</span>.
              </div>
            </div>

            <div style={{ position: "relative", zIndex: 1, marginTop: 22, display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: 7 }}>E-mail</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, background: SURFACE, border: `1.5px solid ${BORDER}`, borderRadius: 14, padding: "15px 16px" }}>
                  <Mail size={18} color={ACCENT} />
                  <input
                    className="kn-input"
                    type="email"
                    inputMode="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    style={{ flex: 1, background: "none", border: "none", outline: "none", color: TEXT, fontSize: 15.5, fontFamily: "inherit" }}
                  />
                </div>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: 7 }}>Senha</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, background: SURFACE, border: `1.5px solid ${BORDER}`, borderRadius: 14, padding: "15px 16px" }}>
                  <Lock size={18} color={ACCENT} />
                  <input
                    className="kn-input"
                    type={verSenha ? "text" : "password"}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Digite sua senha"
                    style={{ flex: 1, background: "none", border: "none", outline: "none", color: TEXT, fontSize: 15.5, fontFamily: "inherit" }}
                  />
                  <button onClick={() => setVerSenha((v) => !v)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}>
                    {verSenha ? <EyeOff size={18} color={MUTED} /> : <Eye size={18} color={MUTED} />}
                  </button>
                </div>
              </div>

              <button style={{ alignSelf: "flex-end", background: "none", border: "none", cursor: "pointer", color: ACCENT, fontSize: 13, fontWeight: 600, padding: 0 }}>
                Esqueci minha senha
              </button>

              <button
                onClick={() => setScreen("home")}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  background: `linear-gradient(100deg, ${ACCENT} 0%, ${ACCENT_2} 100%)`,
                  border: "none", borderRadius: 14, padding: "16px", cursor: "pointer",
                  color: BG, fontSize: 17, fontWeight: 800,
                  boxShadow: `0 14px 30px -12px ${ACCENT}99`,
                }}
              >
                <LogIn size={19} /> Entrar
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: 12, color: MUTED, fontSize: 12.5 }}>
                <span style={{ flex: 1, height: 1, background: BORDER }} /> ou <span style={{ flex: 1, height: 1, background: BORDER }} />
              </div>

              <button
                onClick={() => setScreen("home")}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: "none", border: `1.5px solid ${BORDER}`, borderRadius: 14, padding: "15px", cursor: "pointer", color: TEXT, fontSize: 15.5, fontWeight: 600 }}
              >
                <GoogleIcon size={19} /> Entrar com Google
              </button>

              <div style={{ textAlign: "center", fontSize: 13.5, color: MUTED, marginTop: 2 }}>
                Não tem uma conta?{" "}
                <button style={{ background: "none", border: "none", cursor: "pointer", color: ACCENT, fontSize: 13.5, fontWeight: 700, padding: 0 }}>Criar conta</button>
              </div>

              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", gap: 8, color: MUTED, fontSize: 12, textAlign: "center", lineHeight: 1.4, marginTop: 2 }}>
                <Lock size={14} color={ACCENT} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>Seus dados protegidos com segurança<br />e sigilo profissional.</span>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* HOME                                                              */}
        {/* ---------------------------------------------------------------- */}
        {screen === "home" && (
          <div style={{ position: "relative", padding: "12px 18px 84px", display: "flex", flexDirection: "column", gap: 9, overflow: "hidden" }}>
            {/* Glow radial de fundo */}
            <div style={{
              position: "absolute", top: -110, right: -70, width: 330, height: 330, borderRadius: "50%",
              background: `radial-gradient(circle, ${ACCENT}22 0%, ${ACCENT}00 70%)`,
              pointerEvents: "none", zIndex: 0,
            }} />

            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: `${ACCENT}12`, border: `1px solid ${ACCENT}44`, borderRadius: 999, padding: "6px 14px 6px 11px" }}>
                <span className="kn-vivo-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: ACCENT, display: "inline-block", boxShadow: `0 0 8px ${ACCENT}` }} />
                <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1.1, color: ACCENT, textTransform: "uppercase" }}>
                  Evolução de enfermagem hospitalar
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 11 }}>
                <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.06, letterSpacing: -0.8 }}>
                  Um caminho.<br />
                  <span style={{ fontStyle: "italic", fontWeight: 700, color: ACCENT, textShadow: `0 0 22px ${ACCENT}55` }}>Toda a clínica.</span>
                </div>
                <PulseHero width={132} height={64} />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 11 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${ACCENT}12`, border: `1px solid ${ACCENT}33`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Building2 size={18} color={ACCENT} />
                </div>
                <div>
                  <div style={{ fontSize: 15.5, fontWeight: 700 }}>Todas as áreas hospitalares.</div>
                  <div style={{ fontSize: 13.5, color: MUTED, marginTop: 1 }}>Um único fluxo adaptativo.</div>
                </div>
              </div>
            </div>

            {/* Card de destaque — a promessa central do produto */}
            <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 12, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, padding: "14px 14px" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.32 }}>
                  Evolua em minutos.<br />
                  <span style={{ color: ACCENT }}>Ganhe tempo no plantão.</span>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <Clock size={26} color={ACCENT} style={{ filter: `drop-shadow(0 0 10px ${ACCENT}66)` }} />
                <div style={{ border: `1px solid ${ACCENT}55`, borderRadius: 8, padding: "6px 8px", textAlign: "center", lineHeight: 1.25 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: ACCENT, letterSpacing: 0.3, textTransform: "uppercase" }}>Mais tempo<br />para cuidar</span>
                    <Heart size={11} color={ACCENT} />
                  </div>
                </div>
              </div>
            </div>

            {/* Lista de recursos — cada linha é um pilar real do motor, não enfeite */}
            <div style={{ position: "relative", zIndex: 1, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, padding: "4px 15px" }}>
              {[
                { icon: <MessageCircleQuestion size={18} color={ACCENT} />, titulo: "Perguntas adaptativas", sub: "Baseadas no contexto do paciente", tag: `até ${CONTEXTS[0]?.questions.length} perguntas` },
                { icon: <Share2 size={18} color={ACCENT} />, titulo: "Árvore inteligente", sub: "Se adapta a cada resposta", tag: "100% adaptativa" },
                { icon: <ShieldCheck size={18} color={ACCENT} />, titulo: "Clínica & Segurança", sub: "Conteúdo validado e estruturado", tag: "Confiável" },
                { icon: <FileText size={18} color={ACCENT} />, titulo: "Evolução completa", sub: "Gere, revise e copie para o prontuário", tag: "Pronta para uso" },
              ].map((item, i, arr) => (
                <div key={item.titulo} style={{ display: "flex", alignItems: "center", gap: 11, padding: "8px 0", borderBottom: i < arr.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: `${ACCENT}12`, border: `1px solid ${ACCENT}33`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {item.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{item.titulo}</div>
                    <div style={{ fontSize: 11.5, color: MUTED, marginTop: 1 }}>{item.sub}</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: ACCENT, background: `${ACCENT}14`, border: `1px solid ${ACCENT}44`, borderRadius: 999, padding: "6px 10px", whiteSpace: "nowrap", flexShrink: 0 }}>
                    {item.tag}
                  </span>
                </div>
              ))}
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0 10px", color: MUTED, fontSize: 11.5 }}>
                <ShieldCheck size={14} color={MUTED} /> Privacidade e segurança de dados garantidas
              </div>
            </div>

            {/* CTA principal */}
            <button
              onClick={() => CONTEXTS[0] && pickContext(CONTEXTS[0])}
              style={{
                position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 13,
                background: `linear-gradient(100deg, ${ACCENT} 0%, ${ACCENT_2} 100%)`,
                border: "none", borderRadius: 18, padding: "13px 14px", cursor: "pointer", textAlign: "left",
                boxShadow: `0 16px 32px -12px ${ACCENT}88`,
              }}
            >
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: BG, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <ArrowRight size={18} color={ACCENT} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: BG }}>Iniciar evolução</div>
                <div style={{ fontSize: 11.5, color: "#04231A", opacity: 0.8, marginTop: 1 }}>Comece agora e ganhe tempo na documentação</div>
              </div>
              <svg width="34" height="22" viewBox="0 0 34 24" style={{ flexShrink: 0, opacity: 0.55 }}>
                <path d="M0 12 H10 L14 4 L18 20 L22 12 H34" fill="none" stroke={BG} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* Dica */}
            <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "flex-start", gap: 9, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "10px 12px" }}>
              <Lightbulb size={16} color={ACCENT} style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: 12, color: "#C9D8D2", lineHeight: 1.4 }}>
                <span style={{ fontWeight: 700, color: TEXT }}>Dica: </span>
                tenha em mãos os dados do paciente para <span style={{ color: ACCENT, fontWeight: 600 }}>respostas mais precisas e evoluções ainda mais rápidas</span>.
              </div>
            </div>
          </div>
        )}

        {/* Navegação inferior — "Início" e "Evoluções" funcionam de verdade
            aqui; os demais itens vivem no app principal do Kronia Nurse. */}
        {screen === "home" && (
          <div style={{
            position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
            width: "100%", maxWidth: 480, display: "flex", alignItems: "center", justifyContent: "space-around",
            background: BG, borderTop: `1px solid ${BORDER}`, padding: "10px 8px calc(12px + env(safe-area-inset-bottom))",
            boxShadow: `0 -8px 24px -8px rgba(0,0,0,0.6)`, zIndex: 2,
          }}>
            <button style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "4px 6px" }}>
              <Home size={23} color={ACCENT} />
              <span style={{ fontSize: 11, fontWeight: 700, color: ACCENT }}>Início</span>
            </button>
            <button style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "4px 6px" }}>
              <Users size={23} color={DIM} />
              <span style={{ fontSize: 11, fontWeight: 600, color: DIM }}>Pacientes</span>
            </button>
            <button
              onClick={() => CONTEXTS[0] && pickContext(CONTEXTS[0])}
              style={{ width: 60, height: 60, borderRadius: "50%", background: ACCENT, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 10px 26px -6px ${ACCENT}AA`, marginTop: -22 }}
            >
              <Plus size={28} color={BG} strokeWidth={2.5} />
            </button>
            <button onClick={abrirHistorico} style={{ position: "relative", background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "4px 6px" }}>
              <ClipboardList size={23} color={DIM} />
              <span style={{ fontSize: 11, fontWeight: 600, color: DIM }}>Evoluções</span>
              {historicoCarregado && historico.length > 0 && (
                <span style={{ position: "absolute", top: -2, right: 2, minWidth: 16, height: 16, borderRadius: 999, background: ACCENT, color: BG, fontSize: 9.5, fontWeight: 800, lineHeight: "16px", textAlign: "center" }}>
                  {historico.length}
                </span>
              )}
            </button>
            <button style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "4px 6px" }}>
              <User size={23} color={DIM} />
              <span style={{ fontSize: 11, fontWeight: 600, color: DIM }}>Perfil</span>
            </button>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* IDENTIFICAÇÃO — leito e iniciais, antes das perguntas              */}
        {/* ---------------------------------------------------------------- */}
        {screen === "identificacao" && context && (
          <div style={{ padding: 20, display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.2, color: ACCENT, textTransform: "uppercase" }}>{context.nome}</div>
            <div style={{ fontSize: 26, fontWeight: 800, marginTop: 5, letterSpacing: -0.4 }}>Identificação do paciente</div>
            <div style={{ color: MUTED, fontSize: 14, marginTop: 3 }}>
              Leito e iniciais ficam registrados no histórico do plantão — nunca o nome completo.
            </div>

            <div style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: MUTED, marginBottom: 8 }}>Leito</div>
                <input
                  className="kn-input"
                  type="text"
                  value={leito}
                  onChange={(e) => setLeito(e.target.value)}
                  placeholder="Ex: 12A"
                  style={{ width: "100%", boxSizing: "border-box", background: SURFACE, border: `1.5px solid ${leito ? ACCENT : BORDER}`, borderRadius: 12, padding: "16px", color: TEXT, fontSize: 20, fontWeight: 700, fontFamily: "inherit", outline: "none", boxShadow: leito ? `0 0 0 1px ${ACCENT}40, 0 8px 20px -10px ${ACCENT}66` : "none", transition: "box-shadow 0.15s ease, border-color 0.15s ease" }}
                />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: MUTED, marginBottom: 8 }}>Iniciais do paciente</div>
                <input
                  className="kn-input"
                  type="text"
                  value={iniciais}
                  onChange={(e) => setIniciais(e.target.value.toUpperCase().slice(0, 6))}
                  placeholder="Ex: M.A.S."
                  style={{ width: "100%", boxSizing: "border-box", background: SURFACE, border: `1.5px solid ${iniciais ? ACCENT : BORDER}`, borderRadius: 12, padding: "16px", color: TEXT, fontSize: 20, fontWeight: 700, fontFamily: "inherit", outline: "none", textTransform: "uppercase", boxShadow: iniciais ? `0 0 0 1px ${ACCENT}40, 0 8px 20px -10px ${ACCENT}66` : "none", transition: "box-shadow 0.15s ease, border-color 0.15s ease" }}
                />
              </div>
            </div>

            <div style={{ flex: 1 }} />

            <div style={{ display: "flex", gap: 12, padding: "18px 0" }}>
              <button onClick={backToHome} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "none", border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px", color: TEXT, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
                <ArrowLeft size={17} /> Voltar
              </button>
              <button onClick={iniciarPerguntas} disabled={!identificacaoValida} style={{ flex: 1.4, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: !identificacaoValida ? SURFACE : ACCENT, border: "none", borderRadius: 12, padding: "14px", color: !identificacaoValida ? DIM : BG, fontSize: 16, fontWeight: 800, cursor: !identificacaoValida ? "default" : "pointer", boxShadow: !identificacaoValida ? "none" : `0 10px 26px -8px ${ACCENT}99`, transition: "box-shadow 0.15s ease" }}>
                Iniciar perguntas <ArrowRight size={17} />
              </button>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* HISTÓRICO DO PLANTÃO                                              */}
        {/* ---------------------------------------------------------------- */}
        {screen === "historico" && (
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 22, fontWeight: 700 }}>Histórico do plantão</div>
              <button onClick={() => setScreen("home")} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X size={20} color={MUTED} />
              </button>
            </div>
            <div style={{ color: MUTED, fontSize: 14, marginBottom: 8 }}>
              {historico.length === 0 ? "Nenhuma evolução registrada ainda neste plantão." : `${historico.length} evolução(ões) registrada(s).`}
            </div>
            {historico.map((h) => (
              <div key={h.id} style={{ background: `linear-gradient(165deg, ${SURFACE} 0%, ${BG} 100%)`, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 16, boxShadow: "0 12px 28px -16px rgba(0,0,0,0.5)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>Leito {h.leito} · {h.iniciais}</div>
                  <button onClick={() => navigator.clipboard?.writeText(h.texto)} style={{ display: "flex", alignItems: "center", gap: 6, background: `${ACCENT}1A`, border: `1px solid ${ACCENT}33`, borderRadius: 8, padding: "5px 10px", color: ACCENT, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    <Copy size={12} /> Copiar
                  </button>
                </div>
                <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                  {h.contextoNome} · {new Date(h.dataHora).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </div>
                <div style={{ fontSize: 13, color: "#C9D8D2", marginTop: 8, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{h.texto}</div>
              </div>
            ))}
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* QUIZ                                                              */}
        {/* ---------------------------------------------------------------- */}
        {screen === "quiz" && !showResult && current && (
          <div style={{ padding: "20px 20px 0", display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.2, color: ACCENT, textTransform: "uppercase" }}>Evolução de enfermagem</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{context.nome}</div>
            <div style={{ color: MUTED, fontSize: 14, marginTop: 2 }}>
              {context.subtitulo} · Leito {leito} · {iniciais}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 18 }}>
              <div style={{ flex: 1, height: 6, background: BORDER, borderRadius: 999, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: ACCENT, borderRadius: 999, boxShadow: `0 0 10px ${ACCENT}99`, transition: "width 0.25s ease" }} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: ACCENT, border: `1px solid ${ACCENT}55`, borderRadius: 999, padding: "4px 12px", whiteSpace: "nowrap" }}>
                {safeStep + 1} de {total}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: 20 }}>
              <Target size={16} color={ACCENT} style={{ marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: ACCENT }}>Contexto adaptativo</div>
                <div style={{ fontSize: 13, color: MUTED }}>
                  {current.layer === "condicional" ? "Pergunta aberta pela sua resposta anterior." : "Responda para que a evolução se adapte ao paciente."}
                </div>
              </div>
            </div>

            <div style={{
              position: "relative", marginTop: 18, background: `linear-gradient(165deg, ${SURFACE} 0%, ${BG} 100%)`,
              border: `1px solid ${BORDER}`, borderRadius: 20, padding: 20, flex: 1,
              boxShadow: `0 20px 48px -20px rgba(0,0,0,0.65), 0 0 0 1px ${ACCENT}0D`,
            }}>
              <div style={{ position: "absolute", top: 0, left: 20, right: 20, height: 2, borderRadius: 2, background: `linear-gradient(90deg, ${ACCENT}00, ${ACCENT}CC, ${ACCENT}00)` }} />
              <div style={{ display: "inline-block", fontSize: 11, fontWeight: 700, letterSpacing: 1, color: ACCENT, background: `${ACCENT}1A`, border: `1px solid ${ACCENT}33`, borderRadius: 999, padding: "5px 12px", textTransform: "uppercase" }}>
                Pergunta atual
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 14, lineHeight: 1.3 }}>{current.titulo}</div>

              {current.type === "numeric" && (
                <NumericField question={current} value={answers[current.id]} onChange={(v) => selectValue(current.id, v)} answers={answers} />
              )}

              {current.type === "numeric_pair" && (
                <BPField question={current} value={answers[current.id]} onChange={(v) => selectValue(current.id, v)} answers={answers} />
              )}

              {current.type === "texto_livre" && (
                <TextField question={current} value={answers[current.id]} onChange={(v) => selectValue(current.id, v)} />
              )}

              {current.type === "select" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 18 }}>
                  {getOptions(current, answers).map((opt) => {
                    const checked = answers[current.id] === opt.value;
                    return (
                      <button key={opt.value} onClick={() => selectValue(current.id, opt.value)} style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", textAlign: "left", padding: "16px 16px", borderRadius: 12, border: `1.5px solid ${checked ? ACCENT : BORDER}`, background: checked ? `${ACCENT}14` : BG, color: "inherit", cursor: "pointer", fontSize: 15, fontWeight: 500, boxShadow: checked ? `0 0 0 1px ${ACCENT}55, 0 8px 20px -8px ${ACCENT}66` : "none", transition: "box-shadow 0.15s ease, border-color 0.15s ease" }}>
                        <Radio checked={checked} />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {current.type === "multi_select" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 18 }}>
                  {getOptions(current, answers).map((opt) => {
                    const checked = (answers[current.id] || []).includes(opt.value);
                    return (
                      <button key={opt.value} onClick={() => toggleMulti(current.id, opt.value)} style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", textAlign: "left", padding: "16px 16px", borderRadius: 12, border: `1.5px solid ${checked ? ACCENT : BORDER}`, background: checked ? `${ACCENT}14` : BG, color: "inherit", cursor: "pointer", fontSize: 15, fontWeight: 500, boxShadow: checked ? `0 0 0 1px ${ACCENT}55, 0 8px 20px -8px ${ACCENT}66` : "none", transition: "box-shadow 0.15s ease, border-color 0.15s ease" }}>
                        <CheckBox checked={checked} />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 12, padding: "18px 0" }}>
              <button onClick={back} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "none", border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px", color: TEXT, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
                <ArrowLeft size={17} /> Voltar
              </button>
              <button onClick={next} disabled={!isAnswered(current, answers)} style={{ flex: 1.4, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: !isAnswered(current, answers) ? SURFACE : ACCENT, border: "none", borderRadius: 12, padding: "14px", color: !isAnswered(current, answers) ? DIM : BG, fontSize: 16, fontWeight: 800, cursor: !isAnswered(current, answers) ? "default" : "pointer", boxShadow: !isAnswered(current, answers) ? "none" : `0 10px 26px -8px ${ACCENT}99`, transition: "box-shadow 0.15s ease" }}>
                Continuar <ArrowRight size={17} />
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: DIM, fontSize: 12, paddingBottom: 20 }}>
              <CheckCircle2 size={14} /> Evolução estruturada conforme COFEN e boas práticas
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* RESULTADO                                                         */}
        {/* ---------------------------------------------------------------- */}
        {context && showResult && (
          <div style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{context.nome}</div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: ACCENT, fontSize: 12, fontWeight: 700, marginTop: 5, background: `${ACCENT}1A`, border: `1px solid ${ACCENT}40`, borderRadius: 999, padding: "3px 10px" }}>
                  <CheckCircle2 size={13} /> Salvo
                </div>
              </div>
              <button onClick={backToHome} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X size={20} color={MUTED} />
              </button>
            </div>

            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.4 }}>Evolução pronta</div>
              <div style={{ color: MUTED, fontSize: 14, marginTop: 3 }}>
                {sequence.length} perguntas nesta árvore — copie o texto e cole no prontuário eletrônico.
              </div>
            </div>

            <div style={{
              position: "relative", marginTop: 18, background: `linear-gradient(165deg, ${SURFACE} 0%, ${BG} 100%)`,
              border: `1px solid ${BORDER}`, borderRadius: 18, overflow: "hidden",
              boxShadow: `0 24px 56px -24px rgba(0,0,0,0.7), 0 0 0 1px ${ACCENT}0D`,
            }}>
              <div style={{ position: "absolute", top: 0, left: 20, right: 20, height: 2, borderRadius: 2, background: `linear-gradient(90deg, ${ACCENT}00, ${ACCENT}CC, ${ACCENT}00)` }} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 16px 14px", borderBottom: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Evolução gerada</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <IconButton icon={<RotateCcw size={15} color={ACCENT} />} onClick={() => pickContext(context)} />
                  <button onClick={() => navigator.clipboard?.writeText(gerarEvolucao(context, answers, sequence))} style={{ display: "flex", alignItems: "center", gap: 6, background: ACCENT, border: "none", borderRadius: 8, padding: "7px 14px", color: BG, fontSize: 13, fontWeight: 800, cursor: "pointer", boxShadow: `0 6px 16px -6px ${ACCENT}99` }}>
                    <Copy size={13} /> Copiar
                  </button>
                </div>
              </div>
              <div style={{ padding: 18, fontSize: 15, lineHeight: 1.6, whiteSpace: "pre-wrap", color: "#E4EDE9" }}>
                {gerarEvolucao(context, answers, sequence)}
              </div>
            </div>

            <button onClick={backToHome} style={{ width: "100%", marginTop: 18, background: "none", border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px", color: TEXT, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
              Voltar às evoluções
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
