import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '../contexts/AuthContext';

export default function Splash() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger entry animation
    const tAnim = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(tAnim);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!loading) {
        router.replace(user ? '/plantao' : '/login');
      }
    }, 3200);
    return () => clearTimeout(t);
  }, [loading, user, router]);

  return (
    <>
      <Head><title>KRONIA Nurse</title></Head>
      <div style={{
        minHeight: '100dvh',
        background: 'var(--color-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'scale(1)' : 'scale(0.78)',
          transition: 'opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1)',
        }}>
          <LogoKronia exibirSlogan />
        </div>
      </div>
    </>
  );
}

export function LogoKronia({
  exibirSlogan = false,
  tamanho = 'grande',
}: {
  exibirSlogan?: boolean;
  tamanho?: 'grande' | 'pequeno';
}) {
  const grande = tamanho === 'grande';
  return (
    <div style={{ textAlign: 'center', userSelect: 'none' }}>
      <div style={{ marginBottom: grande ? 10 : 6 }}>
        <KLogo size={grande ? 96 : 60} />
      </div>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: grande ? '1.65rem' : '1.15rem',
        fontWeight: 800,
        letterSpacing: '-0.3px',
        lineHeight: 1,
      }}>
        <span style={{ color: 'var(--color-clinical)' }}>KRONIA</span>
        <span style={{ color: 'var(--color-ink)' }}> Nurse</span>
      </div>
      <div style={{
        height: 2.5,
        background: 'var(--color-clinical)',
        margin: `${grande ? 10 : 6}px auto`,
        width: grande ? 180 : 120,
        borderRadius: 2,
      }} />
      {exibirSlogan && (
        <p style={{
          color: 'var(--color-clinical)',
          fontWeight: 600,
          fontSize: grande ? '1rem' : '0.82rem',
          margin: 0,
          fontFamily: 'var(--font-body)',
        }}>
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
        fill="var(--color-clinical)"
      />
    </svg>
  );
}
