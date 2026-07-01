import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '../contexts/AuthContext';

export default function Splash() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [pronto, setPronto] = useState(false);

  // Timer mínimo de 1.5s para exibir o splash
  useEffect(() => {
    const t = setTimeout(() => setPronto(true), 1500);
    return () => clearTimeout(t);
  }, []);

  // Após o timer E a sessão carregada, redireciona
  useEffect(() => {
    if (!pronto || loading) return;
    if (user) {
      router.replace('/plantao');
    } else {
      router.replace('/login');
    }
  }, [pronto, loading, user, router]);

  return (
    <>
      <Head><title>KRONIA Nurse</title></Head>
      <div style={{
        minHeight: '100dvh',
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <LogoKronia exibirSlogan />
      </div>
    </>
  );
}

export function LogoKronia({ exibirSlogan = false, tamanho = 'grande' }: { exibirSlogan?: boolean; tamanho?: 'grande' | 'pequeno' }) {
  const grande = tamanho === 'grande';
  return (
    <div style={{ textAlign: 'center', userSelect: 'none' }}>
      {/* Letra K estilizada */}
      <div style={{ marginBottom: grande ? 8 : 4 }}>
        <KLogo size={grande ? 96 : 60} />
      </div>
      {/* KRONIA Nurse */}
      <div style={{ fontSize: grande ? '1.6rem' : '1.15rem', fontWeight: 800, letterSpacing: '-0.3px', lineHeight: 1 }}>
        <span style={{ color: '#0055FF' }}>KRONIA</span>
        <span style={{ color: '#1A1A1A' }}> Nurse</span>
      </div>
      {/* Underline azul */}
      <div style={{ height: 2.5, background: '#0055FF', margin: `${grande ? 10 : 6}px auto`, width: grande ? 180 : 120, borderRadius: 2 }} />
      {exibirSlogan && (
        <p style={{ color: '#0055FF', fontWeight: 600, fontSize: grande ? '1.05rem' : '0.85rem', margin: 0 }}>
          Evolua Sempre
        </p>
      )}
    </div>
  );
}

function KLogo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M18 10 L18 90 L38 90 L38 62 L55 90 L78 90 L54 52 L76 10 L54 10 L38 40 L38 10 Z"
        fill="#0055FF"
      />
    </svg>
  );
}
