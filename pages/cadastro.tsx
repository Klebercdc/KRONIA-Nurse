import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { LogoKronia } from './index';
import { btnPrimStyle, linkTextoStyle, linkAzulStyle, BadgeLGPD } from './login';

type Regra = { label: string; ok: boolean };

function avaliarSenha(senha: string): Regra[] {
  return [{ label: 'Mínimo de 6 caracteres', ok: senha.length >= 6 }];
}

export default function CadastroPage() {
  const { user, loading, signUp } = useAuth();
  const router = useRouter();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
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

  async function handleCadastrar(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    if (!senhaValida) { setErro('A senha não atende todos os requisitos.'); return; }
    if (senha !== confirmar) { setErro('As senhas não coincidem.'); return; }
    setEnviando(true);
    const { error } = await signUp(email.trim(), senha, nome.trim());
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
          {/* Back link */}
          <Link href="/login" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--color-ink-muted)',
            fontSize: '0.9rem',
            textDecoration: 'none',
            marginBottom: 20,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Voltar
          </Link>

          <div style={{ marginBottom: 28, textAlign: 'center' }}>
            <LogoKronia tamanho="pequeno" />
          </div>

          {concluido ? (
            <TelaConcluido email={email} />
          ) : (
            <>
              <h1 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.55rem',
                fontWeight: 600,
                color: 'var(--color-ink)',
                margin: '0 0 4px',
              }}>Criar conta</h1>
              <p style={{ fontSize: '0.88rem', color: 'var(--color-ink-muted)', margin: '0 0 26px' }}>
                Preencha os dados para criar sua conta
              </p>

              <form onSubmit={handleCadastrar} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
                    <button type="button" onClick={() => setMostrarSenha((v) => !v)} style={eyeBtnStyle}>
                      <IconOlho visivel={mostrarSenha} />
                    </button>
                  </div>
                  <div style={{ marginTop: 8, fontSize: '0.78rem', color: 'var(--color-ink-muted)' }}>
                    A senha deve conter:{' '}
                    {regras.map((r) => (
                      <span key={r.label} style={{ color: senhaDigitada && r.ok ? 'var(--color-ok)' : 'var(--color-ink-faint)', fontWeight: 600 }}>
                        {r.label}
                      </span>
                    ))}
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
                    <button type="button" onClick={() => setMostrarConfirmar((v) => !v)} style={eyeBtnStyle}>
                      <IconOlho visivel={mostrarConfirmar} />
                    </button>
                  </div>
                  {confirmar.length > 0 && senha !== confirmar && (
                    <p style={{ fontSize: '0.78rem', color: 'var(--color-danger)', marginTop: 4 }}>
                      As senhas não coincidem.
                    </p>
                  )}
                </Campo>

                {erro && (
                  <div style={{
                    background: 'var(--color-danger-tint)',
                    border: '1px solid var(--color-danger)',
                    borderRadius: 10,
                    padding: '10px 13px',
                    fontSize: '0.83rem',
                    color: 'var(--color-danger)',
                  }}>
                    {erro}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={enviando || !senhaValida || senha !== confirmar || !nome.trim() || !email.trim()}
                  style={btnPrimStyle(enviando || !senhaValida || senha !== confirmar || !nome.trim() || !email.trim())}
                >
                  {enviando ? 'Criando conta...' : 'Criar conta'}
                </button>
              </form>

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

function TelaConcluido({ email }: { email: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      <div style={{ fontSize: '3rem', marginBottom: 16 }}>📬</div>
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

const eyeBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '4px',
  color: 'var(--color-ink-faint)',
  display: 'flex',
  alignItems: 'center',
};

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
