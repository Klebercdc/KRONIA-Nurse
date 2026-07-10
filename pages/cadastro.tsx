import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { LogoKronia } from './index';
import { btnPrimStyle, linkTextoStyle, linkAzulStyle, BadgeLGPD } from './login';

type Regra = { label: string; ok: boolean };
type Perfil = 'student' | 'nurse' | 'technician' | 'teacher';
type Etapa = 1 | 2 | 3 | 4;

function avaliarSenha(senha: string): Regra[] {
  return [{ label: 'Mínimo de 6 caracteres', ok: senha.length >= 6 }];
}

const PERFIS: {
  valor: Perfil;
  titulo: string;
  descricao: string;
  cor: string;
  corTint: string;
  Icone: (props: { cor: string }) => JSX.Element;
}[] = [
  {
    valor: 'student',
    titulo: 'Estudante',
    descricao: 'Estou estudando ou em formação na área da saúde',
    cor: 'var(--color-clinical)',
    corTint: 'var(--color-clinical-tint)',
    Icone: IconCapelo,
  },
  {
    valor: 'nurse',
    titulo: 'Enfermeiro(a)',
    descricao: 'Atuo como enfermeiro(a) na prática clínica',
    cor: 'var(--color-ok)',
    corTint: 'var(--color-ok-tint)',
    Icone: IconPessoa,
  },
  {
    valor: 'technician',
    titulo: 'Técnico(a) de Enfermagem',
    descricao: 'Atuo como técnico(a) de enfermagem',
    cor: '#7C5CFC',
    corTint: '#EFEAFE',
    Icone: IconPessoa,
  },
  {
    valor: 'teacher',
    titulo: 'Professor(a) / Instrutor(a)',
    descricao: 'Atuo na educação e formação em enfermagem',
    cor: 'var(--color-warn)',
    corTint: 'var(--color-warn-tint)',
    Icone: IconLivro,
  },
];

const PERFIL_LABELS: Record<Perfil, string> = {
  student: 'Estudante',
  nurse: 'Enfermeiro(a)',
  technician: 'Técnico(a) de Enfermagem',
  teacher: 'Professor(a) / Instrutor(a)',
};

export default function CadastroPage() {
  const { user, loading, signUp } = useAuth();
  const router = useRouter();

  const [etapa, setEtapa] = useState<Etapa>(1);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [perfil, setPerfil] = useState<Perfil>('nurse');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState(false);

  const regras = avaliarSenha(senha);
  const senhaValida = regras.every((r) => r.ok);
  const senhaDigitada = senha.length > 0;

  useEffect(() => {
    if (!loading && user) router.replace('/plantao');
  }, [user, loading, router]);

  function handleVoltar() {
    if (etapa === 1) { router.push('/login'); return; }
    setErro('');
    setEtapa((e) => (e - 1) as Etapa);
  }

  function handleContinuarDados(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !email.trim()) { setErro('Preencha nome e e-mail para continuar.'); return; }
    setErro('');
    setEtapa(2);
  }

  function handleContinuarSenha(e: React.FormEvent) {
    e.preventDefault();
    if (!senhaValida) { setErro('A senha não atende todos os requisitos.'); return; }
    if (senha !== confirmar) { setErro('As senhas não coincidem.'); return; }
    setErro('');
    setEtapa(3);
  }

  function handleContinuarPerfil() {
    setErro('');
    setEtapa(4);
  }

  async function handleCadastrar(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    const { error } = await signUp(email.trim(), senha, nome.trim(), perfil);
    setEnviando(false);
    if (error) { setErro(error); return; }
    setConcluido(true);
  }

  if (loading) return null;

  return (
    <>
      <Head><title>Criar conta — KRONIA Nurse</title></Head>
      <div style={{
        minHeight: '100dvh',
        background: 'var(--color-bg)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '24px 20px 40px',
        overflowY: 'auto',
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <button type="button" onClick={handleVoltar} style={backBtnStyle}>
            <IconVoltar />
            Voltar
          </button>

          <div style={{ marginBottom: 28, textAlign: 'center' }}>
            <LogoKronia tamanho="pequeno" />
          </div>

          {concluido ? (
            <TelaConcluido email={email} />
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                <IndicadorEtapas etapaAtual={etapa} />
              </div>

              {etapa === 1 && (
                <EtapaDados
                  nome={nome}
                  setNome={setNome}
                  email={email}
                  setEmail={setEmail}
                  erro={erro}
                  onSubmit={handleContinuarDados}
                />
              )}

              {etapa === 2 && (
                <EtapaSenha
                  senha={senha}
                  setSenha={setSenha}
                  confirmar={confirmar}
                  setConfirmar={setConfirmar}
                  mostrarSenha={mostrarSenha}
                  setMostrarSenha={setMostrarSenha}
                  mostrarConfirmar={mostrarConfirmar}
                  setMostrarConfirmar={setMostrarConfirmar}
                  regras={regras}
                  senhaDigitada={senhaDigitada}
                  erro={erro}
                  onSubmit={handleContinuarSenha}
                />
              )}

              {etapa === 3 && (
                <EtapaPerfil perfil={perfil} setPerfil={setPerfil} onContinuar={handleContinuarPerfil} />
              )}

              {etapa === 4 && (
                <EtapaRevisao
                  nome={nome}
                  email={email}
                  perfil={perfil}
                  onEditar={setEtapa}
                  erro={erro}
                  enviando={enviando}
                  onSubmit={handleCadastrar}
                />
              )}

              <p style={linkTextoStyle}>
                Já tem uma conta?{' '}
                <Link href="/login" style={linkAzulStyle}>Fazer login</Link>
              </p>
            </>
          )}

          <BadgeLGPD />
        </div>
      </div>
    </>
  );
}

// ── Etapa 1: Dados pessoais ─────────────────────────────────────────────────

function EtapaDados({ nome, setNome, email, setEmail, erro, onSubmit }: {
  nome: string;
  setNome: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  erro: string;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <>
      <h1 style={h1Style}>Criar conta</h1>
      <p style={subStyle}>Preencha os dados para criar sua conta</p>

      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Campo label="Nome completo">
          <div className="auth-input-wrap">
            <IconPessoa />
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome completo"
              autoComplete="name"
              required
            />
          </div>
        </Campo>

        <Campo label="E-mail">
          <div className="auth-input-wrap">
            <IconEmail />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              autoComplete="email"
              required
            />
          </div>
        </Campo>

        {erro && <MensagemErro>{erro}</MensagemErro>}

        <button type="submit" style={btnPrimStyle(false)}>Continuar</button>
      </form>
    </>
  );
}

// ── Etapa 2: Senha ───────────────────────────────────────────────────────────

function EtapaSenha({
  senha, setSenha, confirmar, setConfirmar,
  mostrarSenha, setMostrarSenha, mostrarConfirmar, setMostrarConfirmar,
  regras, senhaDigitada, erro, onSubmit,
}: {
  senha: string;
  setSenha: (v: string) => void;
  confirmar: string;
  setConfirmar: (v: string) => void;
  mostrarSenha: boolean;
  setMostrarSenha: (v: (prev: boolean) => boolean) => void;
  mostrarConfirmar: boolean;
  setMostrarConfirmar: (v: (prev: boolean) => boolean) => void;
  regras: Regra[];
  senhaDigitada: boolean;
  erro: string;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <>
      <h1 style={h1Style}>Crie sua senha</h1>
      <p style={subStyle}>Ela será usada para acessar sua conta com segurança</p>

      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Campo label="Senha">
          <div className="auth-input-wrap">
            <IconCadeado />
            <input
              type={mostrarSenha ? 'text' : 'password'}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Digite sua senha"
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              onClick={() => setMostrarSenha((v) => !v)}
              style={eyeBtnStyle}
              aria-label="Mostrar/ocultar senha"
            >
              <IconOlho visivel={mostrarSenha} />
            </button>
          </div>
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {regras.map((r) => {
              const ativa = senhaDigitada && r.ok;
              return (
                <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: ativa ? 'var(--color-ok-ink)' : 'var(--color-ink-faint)', fontWeight: 600 }}>
                  <IconRegra ok={ativa} />
                  {r.label}
                </div>
              );
            })}
          </div>
        </Campo>

        <Campo label="Confirmar senha">
          <div className="auth-input-wrap">
            <IconCadeado />
            <input
              type={mostrarConfirmar ? 'text' : 'password'}
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              placeholder="Confirme sua senha"
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              onClick={() => setMostrarConfirmar((v) => !v)}
              style={eyeBtnStyle}
              aria-label="Mostrar/ocultar confirmação de senha"
            >
              <IconOlho visivel={mostrarConfirmar} />
            </button>
          </div>
          {confirmar.length > 0 && senha !== confirmar && (
            <p style={{ fontSize: '0.78rem', color: 'var(--color-danger)', marginTop: 4 }}>
              As senhas não coincidem.
            </p>
          )}
        </Campo>

        {erro && <MensagemErro>{erro}</MensagemErro>}

        <button type="submit" style={btnPrimStyle(false)}>Continuar</button>
      </form>
    </>
  );
}

// ── Etapa 3: Sobre você ──────────────────────────────────────────────────────

function EtapaPerfil({ perfil, setPerfil, onContinuar }: {
  perfil: Perfil;
  setPerfil: (p: Perfil) => void;
  onContinuar: () => void;
}) {
  return (
    <>
      <h1 style={h1Style}>Conte-nos sobre você</h1>
      <p style={subStyle}>Isso nos ajuda a personalizar sua experiência no Kronia Nurse</p>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {PERFIS.map((p) => (
          <CartaoPerfil
            key={p.valor}
            titulo={p.titulo}
            descricao={p.descricao}
            cor={p.cor}
            icone={<p.Icone cor={p.cor} />}
            selecionado={perfil === p.valor}
            onClick={() => setPerfil(p.valor)}
          />
        ))}
      </div>

      <button type="button" onClick={onContinuar} style={{ ...btnPrimStyle(false), marginTop: 4 }}>
        Continuar
      </button>
    </>
  );
}

function CartaoPerfil({ titulo, descricao, cor, icone, selecionado, onClick }: {
  titulo: string;
  descricao: string;
  cor: string;
  icone: React.ReactNode;
  selecionado: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
        padding: 14,
        border: `1.5px solid ${selecionado ? cor : 'var(--color-line)'}`,
        borderRadius: 14,
        background: 'var(--color-surface)',
        boxShadow: 'var(--shadow-card)',
        cursor: 'pointer',
        marginBottom: 10,
      }}
    >
      <div style={{ width: 40, height: 40, borderRadius: '50%', border: `1.5px solid ${cor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icone}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--color-ink)', margin: 0 }}>{titulo}</p>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-ink-muted)', margin: '2px 0 0', lineHeight: 1.4 }}>{descricao}</p>
      </div>
      <div style={{ width: 18, height: 18, borderRadius: '50%', border: '1.5px solid var(--color-ink-faint)', marginTop: 3, flexShrink: 0, background: selecionado ? cor : 'transparent' }} />
    </div>
  );
}

// ── Etapa 4: Revisão ─────────────────────────────────────────────────────────

function EtapaRevisao({ nome, email, perfil, onEditar, erro, enviando, onSubmit }: {
  nome: string;
  email: string;
  perfil: Perfil;
  onEditar: (etapa: Etapa) => void;
  erro: string;
  enviando: boolean;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const perfilInfo = PERFIS.find((p) => p.valor === perfil) ?? PERFIS[1];

  return (
    <>
      <h1 style={h1Style}>Revise seus dados</h1>
      <p style={subStyle}>Confira as informações antes de finalizar o cadastro</p>

      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
        <LinhaResumo
          icone={<IconPessoa cor="var(--color-clinical)" />}
          corTint="var(--color-clinical-tint)"
          corIcone="var(--color-clinical)"
          label="Nome completo"
          valor={nome}
          onEditar={() => onEditar(1)}
        />
        <LinhaResumo
          icone={<IconEmail cor="var(--color-clinical)" />}
          corTint="var(--color-clinical-tint)"
          corIcone="var(--color-clinical)"
          label="E-mail"
          valor={email}
          onEditar={() => onEditar(1)}
        />
        <LinhaResumo
          icone={<perfilInfo.Icone cor={perfilInfo.cor} />}
          corTint={perfilInfo.corTint}
          corIcone={perfilInfo.cor}
          label="Perfil selecionado"
          valor={PERFIL_LABELS[perfil]}
          onEditar={() => onEditar(3)}
        />

        {erro && <MensagemErro>{erro}</MensagemErro>}

        <button type="submit" disabled={enviando} style={{ ...btnPrimStyle(enviando), marginTop: 4 }}>
          {enviando ? 'Criando conta...' : 'Finalizar criação da conta'}
        </button>
      </form>
    </>
  );
}

function LinhaResumo({ icone, corTint, corIcone, label, valor, onEditar }: {
  icone: React.ReactNode;
  corTint: string;
  corIcone: string;
  label: string;
  valor: string;
  onEditar: () => void;
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 14px',
      border: '1px solid var(--color-line)',
      borderRadius: 14,
      background: 'var(--color-surface)',
      boxShadow: 'var(--shadow-card)',
      marginBottom: 10,
    }}>
      <div style={{ width: 34, height: 34, borderRadius: '50%', background: corTint, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icone}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '0.72rem', color: 'var(--color-ink-faint)', margin: 0 }}>{label}</p>
        <p style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--color-ink)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{valor}</p>
      </div>
      <button
        type="button"
        onClick={onEditar}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: corIcone, display: 'flex', padding: 4, flexShrink: 0 }}
        aria-label={`Editar ${label}`}
      >
        <IconLapis />
      </button>
    </div>
  );
}

// ── Conclusão ────────────────────────────────────────────────────────────────

function TelaConcluido({ email }: { email: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
        <IconEnvelopeConfirmado />
      </div>
      <h2 style={{
        fontFamily: 'var(--font-display)',
        fontSize: '1.3rem',
        fontWeight: 700,
        color: 'var(--color-ink)',
        marginBottom: 8,
      }}>Verifique seu e-mail</h2>
      <p style={{ fontSize: '0.9rem', color: 'var(--color-ink-muted)', lineHeight: 1.6 }}>
        Enviamos um link de confirmação para <strong>{email}</strong>.
        Abra o link para ativar sua conta e, em seguida, faça login.
      </p>
      <Link href="/login" style={{ ...linkAzulStyle, display: 'inline-block', marginTop: 24, fontSize: '0.95rem' }}>
        Ir para o login →
      </Link>
    </div>
  );
}

// ── Etapas: indicador ────────────────────────────────────────────────────────

function IndicadorEtapas({ etapaAtual }: { etapaAtual: Etapa }) {
  const passos: Etapa[] = [1, 2, 3, 4];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {passos.map((passo, i) => {
        const visitada = passo < etapaAtual;
        const atual = passo === etapaAtual;
        const corLinha = visitada ? 'var(--color-clinical)' : 'var(--color-line)';
        return (
          <div key={passo} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: atual ? 'var(--color-clinical)' : 'transparent',
              color: atual ? '#fff' : visitada ? 'var(--color-clinical)' : 'var(--color-ink-faint)',
              border: atual ? 'none' : `1.5px solid ${visitada ? 'var(--color-clinical)' : 'var(--color-line)'}`,
            }}>
              {passo}
            </div>
            {i < passos.length - 1 && <div style={{ width: 26, height: 2, background: corLinha }} />}
          </div>
        );
      })}
    </div>
  );
}

// ── Campo / mensagens ────────────────────────────────────────────────────────

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <label style={{
        fontSize: '0.75rem',
        fontWeight: 700,
        color: 'var(--color-ink-muted)',
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function MensagemErro({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--color-danger-tint)',
      border: '1px solid var(--color-danger)',
      borderRadius: 10,
      padding: '10px 13px',
      fontSize: '0.83rem',
      color: 'var(--color-danger)',
    }}>
      {children}
    </div>
  );
}

const backBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  color: 'var(--color-ink-muted)',
  fontSize: '0.9rem',
  background: 'none',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  marginBottom: 20,
};

const h1Style: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: '1.55rem',
  fontWeight: 600,
  color: 'var(--color-ink)',
  margin: '0 0 4px',
};

const subStyle: React.CSSProperties = {
  fontSize: '0.88rem',
  color: 'var(--color-ink-muted)',
  margin: '0 0 26px',
};

const eyeBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  width: 40,
  height: 40,
  margin: '0 -8px',
  color: 'var(--color-ink-faint)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

// ── Icons ────────────────────────────────────────────────────────────────────

function IconVoltar() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function IconPessoa({ cor = 'var(--color-ink-faint)' }: { cor?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconEmail({ cor = 'var(--color-ink-faint)' }: { cor?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <polyline points="22,4 12,13 2,4" />
    </svg>
  );
}

function IconCadeado() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function IconCapelo({ cor = 'var(--color-ink-faint)' }: { cor?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M22 10L12 5 2 10l10 5 10-5z" />
      <path d="M6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" />
    </svg>
  );
}

function IconLivro({ cor = 'var(--color-ink-faint)' }: { cor?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function IconLapis() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function IconEnvelopeConfirmado() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-clinical)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <polyline points="2,6 12,13 22,6" />
      <path d="M9 15.5l2 2 4-4" stroke="var(--color-ok-ink)" strokeWidth="2" />
    </svg>
  );
}

function IconRegra({ ok }: { ok: boolean }) {
  if (ok) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

function IconOlho({ visivel }: { visivel: boolean }) {
  if (visivel) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
