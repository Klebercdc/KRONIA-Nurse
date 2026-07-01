import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { LogoKronia } from './index';
import { btnPrimarioStyle, linkTextoStyle, linkAzulStyle, BadgeLGPD } from './login';

type Regra = { label: string; ok: boolean };

function avaliarSenha(senha: string): Regra[] {
  return [
    { label: 'Mínimo de 6 caracteres', ok: senha.length >= 6 },
  ];
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

    // Supabase por padrão exige confirmação de email antes do login
    // Se o projeto tiver confirmação desativada, signUp já cria sessão e o AuthContext redireciona
    // Se não, mostramos a tela de confirmação
    setConcluido(true);
  }

  if (loading) return null;

  return (
    <>
      <Head><title>Criar conta — KRONIA Nurse</title></Head>
      <div style={{
        minHeight: '100dvh',
        background: '#fff',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '24px 20px 40px',
        overflowY: 'auto',
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          {/* Voltar */}
          <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#718096', fontSize: '0.9rem', textDecoration: 'none', marginBottom: 20 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>

          {/* Logo */}
          <div style={{ marginBottom: 28, textAlign: 'center' }}>
            <LogoKronia tamanho="pequeno" />
          </div>

          {concluido ? (
            <TelaConcluido email={email} />
          ) : (
            <>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1A1A1A', margin: '0 0 4px' }}>Criar conta</h1>
              <p style={{ fontSize: '0.9rem', color: '#718096', margin: '0 0 28px' }}>Preencha os dados para criar sua conta</p>

              <form onSubmit={handleCadastrar} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Nome completo */}
                <Campo label="Nome completo">
                  <InputComIcone icone={<IconPessoa />}>
                    <input
                      type="text"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Seu nome completo"
                      autoComplete="name"
                      required
                      style={inputStyle}
                    />
                  </InputComIcone>
                </Campo>

                {/* E-mail */}
                <Campo label="E-mail">
                  <InputComIcone icone={<IconEmail />}>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      autoComplete="email"
                      required
                      style={inputStyle}
                    />
                  </InputComIcone>
                </Campo>

                {/* Senha */}
                <Campo label="Senha">
                  <InputComIcone icone={<IconCadeado />} sufixo={
                    <button type="button" onClick={() => setMostrarSenha((v) => !v)} style={eyeBtnStyle}>
                      <IconOlho visivel={mostrarSenha} />
                    </button>
                  }>
                    <input
                      type={mostrarSenha ? 'text' : 'password'}
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      placeholder="Digite sua senha"
                      autoComplete="new-password"
                      required
                      style={inputStyle}
                    />
                  </InputComIcone>

                  {/* Requisitos em tempo real */}
                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <p style={{ fontSize: '0.78rem', color: '#718096', margin: '0 0 4px' }}>A senha deve conter:</p>
                    {regras.map((r) => (
                      <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}>
                        <span style={{ color: senhaDigitada && r.ok ? '#0055FF' : '#A0AEC0', fontWeight: 700, fontSize: '0.9rem' }}>
                          {senhaDigitada && r.ok ? '✓' : '·'}
                        </span>
                        <span style={{ color: senhaDigitada && r.ok ? '#2D3748' : '#A0AEC0' }}>{r.label}</span>
                      </div>
                    ))}
                  </div>
                </Campo>

                {/* Confirmar senha */}
                <Campo label="Confirmar senha">
                  <InputComIcone icone={<IconCadeado />} sufixo={
                    <button type="button" onClick={() => setMostrarConfirmar((v) => !v)} style={eyeBtnStyle}>
                      <IconOlho visivel={mostrarConfirmar} />
                    </button>
                  }>
                    <input
                      type={mostrarConfirmar ? 'text' : 'password'}
                      value={confirmar}
                      onChange={(e) => setConfirmar(e.target.value)}
                      placeholder="Confirme sua senha"
                      autoComplete="new-password"
                      required
                      style={inputStyle}
                    />
                  </InputComIcone>
                  {confirmar.length > 0 && senha !== confirmar && (
                    <p style={{ fontSize: '0.78rem', color: '#C53030', marginTop: 4 }}>As senhas não coincidem.</p>
                  )}
                </Campo>

                {erro && (
                  <div style={{ background: '#FFF5F5', border: '1px solid #FC8181', borderRadius: 8, padding: '10px 12px', fontSize: '0.83rem', color: '#C53030' }}>
                    {erro}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={enviando || !senhaValida || senha !== confirmar || !nome.trim() || !email.trim()}
                  style={btnPrimarioStyle(enviando || !senhaValida || senha !== confirmar || !nome.trim() || !email.trim())}
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
      <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1A1A1A', marginBottom: 8 }}>Verifique seu e-mail</h2>
      <p style={{ fontSize: '0.9rem', color: '#718096', lineHeight: 1.6 }}>
        Enviamos um link de confirmação para <strong>{email}</strong>.
        Abra o link para ativar sua conta e, em seguida, faça login.
      </p>
      <Link href="/login" style={{ ...linkAzulStyle, display: 'inline-block', marginTop: 24, fontSize: '0.95rem' }}>
        Ir para o login →
      </Link>
    </div>
  );
}

// ─── Componentes de campo ─────────────────────────────────────────────────────

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#2D3748', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

function InputComIcone({ icone, sufixo, children }: { icone: React.ReactNode; sufixo?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #E2E8F0', borderRadius: 12, padding: '0 12px', gap: 10, background: '#fff' }}>
      <div style={{ flexShrink: 0, color: '#A0AEC0' }}>{icone}</div>
      {children}
      {sufixo}
    </div>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

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

// ─── Ícones ───────────────────────────────────────────────────────────────────

function IconPessoa() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconEmail() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <polyline points="22,4 12,13 2,4" />
    </svg>
  );
}

function IconCadeado() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
