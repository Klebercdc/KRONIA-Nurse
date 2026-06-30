import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { LogoKronia } from './index';
import { getSupabaseBrowser } from '../lib/supabase-browser';

export default function LoginPage() {
  const { user, loading, signIn } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const [modoRecuperar, setModoRecuperar] = useState(false);
  const [emailRecuperar, setEmailRecuperar] = useState('');
  const [enviandoRecuperar, setEnviandoRecuperar] = useState(false);
  const [msgRecuperar, setMsgRecuperar] = useState('');

  useEffect(() => {
    if (!loading && user) router.replace('/plantao');
  }, [user, loading, router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !senha) return;
    setErro('');
    setEnviando(true);
    const { error } = await signIn(email.trim(), senha);
    setEnviando(false);
    if (error) { setErro(error); return; }
    router.replace('/plantao');
  }

  async function handleRecuperar(e: React.FormEvent) {
    e.preventDefault();
    if (!emailRecuperar.trim()) return;
    setEnviandoRecuperar(true);
    setMsgRecuperar('');
    try {
      const { error } = await getSupabaseBrowser().auth.resetPasswordForEmail(emailRecuperar.trim(), {
        redirectTo: `${window.location.origin}/login`,
      });
      setMsgRecuperar(error
        ? 'Erro ao enviar. Verifique o email e tente novamente.'
        : 'Link de recuperação enviado! Verifique sua caixa de entrada.');
    } finally {
      setEnviandoRecuperar(false);
    }
  }

  if (loading) return null;

  return (
    <>
      <Head><title>Login — KRONIA Nurse</title></Head>
      <div style={pageStyle}>
        <div style={containerStyle}>
          <div style={{ marginBottom: 32 }}>
            <LogoKronia tamanho="pequeno" />
          </div>

          {!modoRecuperar ? (
            <>
              <h1 style={h1Style}>Bem-vindo(a) de volta</h1>
              <p style={subStyle}>Acesse sua conta para continuar</p>

              <form onSubmit={handleLogin} style={formStyle}>
                <div style={campoStyle}>
                  <label style={labelStyle}>E-mail</label>
                  <div className="auth-input-wrap">
                    <IconPessoa />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <div style={campoStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={labelStyle}>Senha</label>
                    <button
                      type="button"
                      style={linkBtnStyle}
                      onClick={() => { setModoRecuperar(true); setEmailRecuperar(email); }}
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                  <div className="auth-input-wrap">
                    <IconCadeado />
                    <input
                      type={mostrarSenha ? 'text' : 'password'}
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      placeholder="Digite sua senha"
                      autoComplete="current-password"
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
                </div>

                {erro && <div style={erroStyle}>{erro}</div>}

                <button type="submit" disabled={enviando} style={btnPrimStyle(enviando)}>
                  {enviando ? 'Entrando...' : 'Entrar'}
                </button>
              </form>

              <p style={linkTextoStyle}>
                Ainda não tem uma conta?{' '}
                <Link href="/cadastro" style={linkAzulStyle}>Criar conta</Link>
              </p>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => { setModoRecuperar(false); setMsgRecuperar(''); }}
                style={{ ...linkBtnStyle, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 4 }}
              >
                ← Voltar ao login
              </button>
              <h1 style={h1Style}>Recuperar senha</h1>
              <p style={subStyle}>Informe seu e-mail para receber o link de redefinição</p>

              <form onSubmit={handleRecuperar} style={formStyle}>
                <div style={campoStyle}>
                  <label style={labelStyle}>E-mail</label>
                  <div className="auth-input-wrap">
                    <IconEmail />
                    <input
                      type="email"
                      value={emailRecuperar}
                      onChange={(e) => setEmailRecuperar(e.target.value)}
                      placeholder="seu@email.com"
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                {msgRecuperar && (
                  <div style={{
                    ...erroStyle,
                    ...(msgRecuperar.startsWith('Link')
                      ? { background: 'var(--color-ok-tint)', borderColor: 'var(--color-ok)', color: 'var(--color-ok)' }
                      : {}),
                  }}>
                    {msgRecuperar}
                  </div>
                )}

                <button type="submit" disabled={enviandoRecuperar} style={btnPrimStyle(enviandoRecuperar)}>
                  {enviandoRecuperar ? 'Enviando...' : 'Enviar link de recuperação'}
                </button>
              </form>
            </>
          )}

          <BadgeLGPD />
        </div>
      </div>
    </>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  minHeight: '100dvh',
  background: 'var(--color-bg)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px 20px',
};

const containerStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 400,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
};

const h1Style: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: '1.55rem',
  fontWeight: 600,
  color: 'var(--color-ink)',
  margin: '0 0 4px',
};

const subStyle: React.CSSProperties = {
  fontSize: '0.87rem',
  color: 'var(--color-ink-muted)',
  margin: '0 0 26px',
};

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
};

const campoStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column' };

const labelStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: 700,
  color: 'var(--color-ink-muted)',
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const eyeBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '4px',
  color: 'var(--color-ink-faint)',
  display: 'flex',
  alignItems: 'center',
};

const linkBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--color-clinical)',
  fontSize: '0.82rem',
  fontWeight: 600,
  padding: 0,
};

const erroStyle: React.CSSProperties = {
  background: 'var(--color-danger-tint)',
  border: '1px solid var(--color-danger)',
  borderRadius: 10,
  padding: '10px 13px',
  fontSize: '0.83rem',
  color: 'var(--color-danger)',
};

export function btnPrimStyle(disabled: boolean): React.CSSProperties {
  return {
    background: disabled ? 'var(--color-ink-faint)' : 'var(--color-clinical)',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    padding: '15px 20px',
    fontWeight: 700,
    fontSize: '1rem',
    cursor: disabled ? 'not-allowed' : 'pointer',
    width: '100%',
    marginTop: 4,
    transition: 'background 0.15s',
    fontFamily: 'var(--font-body)',
  };
}

export const linkTextoStyle: React.CSSProperties = {
  textAlign: 'center',
  fontSize: '0.88rem',
  color: 'var(--color-ink-muted)',
  margin: '20px 0 0',
};

export const linkAzulStyle: React.CSSProperties = {
  color: 'var(--color-clinical)',
  fontWeight: 700,
  textDecoration: 'none',
};

export function BadgeLGPD() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 32, justifyContent: 'center' }}>
      <IconEscudo />
      <div>
        <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-ink)', margin: 0 }}>
          Seus dados protegidos com segurança
        </p>
        <p style={{ fontSize: '0.75rem', color: 'var(--color-ink-faint)', margin: 0 }}>
          Conforme LGPD e boas práticas de privacidade
        </p>
      </div>
    </div>
  );
}

// ── Icons ────────────────────────────────────────────────────────────────────

function IconPessoa() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconEmail() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
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

function IconEscudo() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink-faint)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}
