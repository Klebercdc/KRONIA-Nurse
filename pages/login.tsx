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

  // Recuperação de senha
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
      if (error) {
        setMsgRecuperar('Erro ao enviar. Verifique o email e tente novamente.');
      } else {
        setMsgRecuperar('Link de recuperação enviado! Verifique sua caixa de entrada.');
      }
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
          {/* Logo */}
          <div style={{ marginBottom: 32 }}>
            <LogoKronia tamanho="pequeno" />
          </div>

          {!modoRecuperar ? (
            <>
              <h1 style={h1Style}>Bem-vindo(a) de volta</h1>
              <p style={subtitleStyle}>Acesse sua conta para continuar</p>

              <form onSubmit={handleLogin} style={formStyle}>
                {/* E-mail */}
                <div style={campoStyle}>
                  <label style={labelStyle}>E-mail</label>
                  <div style={inputWrapStyle}>
                    <IconPessoa />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      autoComplete="email"
                      required
                      style={inputStyle}
                    />
                  </div>
                </div>

                {/* Senha */}
                <div style={campoStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={labelStyle}>Senha</label>
                    <button type="button" style={linkBtnStyle} onClick={() => { setModoRecuperar(true); setEmailRecuperar(email); }}>
                      Esqueci minha senha
                    </button>
                  </div>
                  <div style={inputWrapStyle}>
                    <IconCadeado />
                    <input
                      type={mostrarSenha ? 'text' : 'password'}
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      placeholder="Digite sua senha"
                      autoComplete="current-password"
                      required
                      style={inputStyle}
                    />
                    <button type="button" onClick={() => setMostrarSenha((v) => !v)} style={eyeBtnStyle} aria-label="Mostrar/ocultar senha">
                      <IconOlho visivel={mostrarSenha} />
                    </button>
                  </div>
                </div>

                {erro && <div style={erroStyle}>{erro}</div>}

                <button type="submit" disabled={enviando} style={btnPrimarioStyle(enviando)}>
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
              <button type="button" onClick={() => { setModoRecuperar(false); setMsgRecuperar(''); }} style={{ ...linkBtnStyle, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 4 }}>
                ← Voltar ao login
              </button>
              <h1 style={h1Style}>Recuperar senha</h1>
              <p style={subtitleStyle}>Informe seu e-mail para receber o link de redefinição</p>

              <form onSubmit={handleRecuperar} style={formStyle}>
                <div style={campoStyle}>
                  <label style={labelStyle}>E-mail</label>
                  <div style={inputWrapStyle}>
                    <IconEmail />
                    <input
                      type="email"
                      value={emailRecuperar}
                      onChange={(e) => setEmailRecuperar(e.target.value)}
                      placeholder="seu@email.com"
                      autoComplete="email"
                      required
                      style={inputStyle}
                    />
                  </div>
                </div>

                {msgRecuperar && (
                  <div style={{ ...erroStyle, background: msgRecuperar.startsWith('Link') ? '#F0FFF4' : undefined, borderColor: msgRecuperar.startsWith('Link') ? '#9AE6B4' : undefined, color: msgRecuperar.startsWith('Link') ? '#276749' : undefined }}>
                    {msgRecuperar}
                  </div>
                )}

                <button type="submit" disabled={enviandoRecuperar} style={btnPrimarioStyle(enviandoRecuperar)}>
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

// ─── Shared styles ───────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  minHeight: '100dvh',
  background: '#fff',
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
  fontSize: '1.6rem',
  fontWeight: 800,
  color: '#1A1A1A',
  margin: '0 0 4px',
};

const subtitleStyle: React.CSSProperties = {
  fontSize: '0.9rem',
  color: '#718096',
  margin: '0 0 28px',
};

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
};

const campoStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column' };

const labelStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  fontWeight: 600,
  color: '#2D3748',
  marginBottom: 6,
};

const inputWrapStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  border: '1.5px solid #E2E8F0',
  borderRadius: 12,
  padding: '0 12px',
  gap: 10,
  background: '#fff',
  transition: 'border-color 0.15s',
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  border: 'none',
  outline: 'none',
  padding: '14px 0',
  fontSize: '0.95rem',
  color: '#1A1A1A',
  background: 'transparent',
};

const eyeBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '4px',
  color: '#A0AEC0',
  display: 'flex',
  alignItems: 'center',
};

const linkBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: '#0055FF',
  fontSize: '0.83rem',
  fontWeight: 600,
  padding: 0,
};

const erroStyle: React.CSSProperties = {
  background: '#FFF5F5',
  border: '1px solid #FC8181',
  borderRadius: 8,
  padding: '10px 12px',
  fontSize: '0.83rem',
  color: '#C53030',
};

export function btnPrimarioStyle(disabled: boolean): React.CSSProperties {
  return {
    background: disabled ? '#93B4FF' : '#0055FF',
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
  };
}

export const linkTextoStyle: React.CSSProperties = {
  textAlign: 'center',
  fontSize: '0.88rem',
  color: '#718096',
  margin: '20px 0 0',
};

export const linkAzulStyle: React.CSSProperties = {
  color: '#0055FF',
  fontWeight: 700,
  textDecoration: 'none',
};

export function BadgeLGPD() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 32, justifyContent: 'center' }}>
      <IconEscudo />
      <div>
        <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#2D3748', margin: 0 }}>Seus dados protegidos com segurança</p>
        <p style={{ fontSize: '0.75rem', color: '#A0AEC0', margin: 0 }}>Conforme LGPD e boas práticas de privacidade</p>
      </div>
    </div>
  );
}

// ─── Ícones ───────────────────────────────────────────────────────────────────

function IconPessoa() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A0AEC0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconEmail() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A0AEC0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <polyline points="22,4 12,13 2,4" />
    </svg>
  );
}

function IconCadeado() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A0AEC0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
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
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#718096" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <rect x="9" y="10" width="6" height="5" rx="1" />
      <path d="M12 10V8a2 2 0 0 1 4 0" strokeWidth="1.5" />
    </svg>
  );
}
