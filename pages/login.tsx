import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '../contexts/AuthContext';

type Aba = 'entrar' | 'cadastrar';

export default function LoginPage() {
  const { user, loading, signIn, signUp } = useAuth();
  const router = useRouter();
  const [aba, setAba] = useState<Aba>('entrar');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nome, setNome] = useState('');
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Se já está autenticado, vai direto para plantão
  useEffect(() => {
    if (!loading && user) {
      router.replace('/plantao');
    }
  }, [user, loading, router]);

  async function handleEntrar(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !senha) return;
    setErro('');
    setEnviando(true);
    const { error } = await signIn(email.trim(), senha);
    setEnviando(false);
    if (error) { setErro(error); return; }
    router.replace('/plantao');
  }

  async function handleCadastrar(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !senha || !nome.trim()) {
      setErro('Preencha todos os campos.');
      return;
    }
    if (senha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setErro('');
    setEnviando(true);
    const { error } = await signUp(email.trim(), senha, nome.trim());
    setEnviando(false);
    if (error) { setErro(error); return; }
    setMensagem('Cadastro realizado! Verifique seu email para confirmar o acesso, depois entre com suas credenciais.');
    setAba('entrar');
    setSenha('');
  }

  if (loading) return null;

  return (
    <>
      <Head><title>KRONIA Nurse</title></Head>
      <div style={{
        minHeight: '100dvh',
        background: 'var(--cinza-100)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px',
      }}>
        {/* Logo / splash */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--azul)', letterSpacing: '-0.5px' }}>
            KRONIA Nurse
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--cinza-400)', marginTop: 4 }}>
            Evolua Sempre
          </p>
        </div>

        <div style={{ width: '100%', maxWidth: 380, background: '#fff', borderRadius: 16, padding: '24px 24px', boxShadow: '0 2px 16px rgba(0,0,0,0.08)' }}>
          {/* Abas */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--cinza-200)', marginBottom: 24 }}>
            {(['entrar', 'cadastrar'] as Aba[]).map((a) => (
              <button
                key={a}
                onClick={() => { setAba(a); setErro(''); setMensagem(''); }}
                style={{
                  flex: 1,
                  background: 'none',
                  border: 'none',
                  padding: '8px 0',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: aba === a ? 'var(--azul)' : 'var(--cinza-400)',
                  borderBottom: aba === a ? '2px solid var(--azul)' : '2px solid transparent',
                  marginBottom: -1,
                  transition: 'color 0.15s',
                }}
              >
                {a === 'entrar' ? 'Entrar' : 'Criar conta'}
              </button>
            ))}
          </div>

          {mensagem && (
            <div style={{ background: '#F0FFF4', border: '1px solid #9AE6B4', borderRadius: 8, padding: '10px 12px', fontSize: '0.82rem', color: '#276749', marginBottom: 16 }}>
              {mensagem}
            </div>
          )}

          {aba === 'entrar' ? (
            <form onSubmit={handleEntrar} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Campo label="Email">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  placeholder="seu@email.com"
                />
              </Campo>
              <Campo label="Senha">
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  autoComplete="current-password"
                  required
                  placeholder="••••••"
                />
              </Campo>
              {erro && <ErroMsg>{erro}</ErroMsg>}
              <button
                type="submit"
                disabled={enviando}
                style={btnStyle(enviando)}
              >
                {enviando ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleCadastrar} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Campo label="Nome ou identificador">
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                  placeholder="Ex: Enfermeira Ana"
                />
              </Campo>
              <Campo label="Email">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  placeholder="seu@email.com"
                />
              </Campo>
              <Campo label="Senha (mín. 6 caracteres)">
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  autoComplete="new-password"
                  required
                  placeholder="••••••"
                  minLength={6}
                />
              </Campo>
              {erro && <ErroMsg>{erro}</ErroMsg>}
              <button
                type="submit"
                disabled={enviando}
                style={btnStyle(enviando)}
              >
                {enviando ? 'Criando conta...' : 'Criar conta'}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#4A5568' }}>{label}</label>
      <div style={{ display: 'contents' }}>{children}</div>
    </div>
  );
}

function ErroMsg({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#FFF5F5', border: '1px solid #FC8181', borderRadius: 8, padding: '8px 12px', fontSize: '0.82rem', color: '#C53030' }}>
      {children}
    </div>
  );
}

function btnStyle(disabled: boolean): React.CSSProperties {
  return {
    background: 'var(--azul)',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '12px 20px',
    fontWeight: 700,
    fontSize: '0.9rem',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.65 : 1,
    transition: 'opacity 0.15s',
  };
}
