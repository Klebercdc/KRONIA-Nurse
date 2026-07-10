import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../lib/theme-context';

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
        background: 'radial-gradient(circle at 50% 42%, #0c2568 0%, #051540 55%, #030d2c 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'scale(1)' : 'scale(0.78)',
          transition: 'opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1)',
          position: 'relative',
          width: 280,
          height: 229,
        }}>
          <Image src="/kronia-icon-dark.png" alt="KRONIA Nurse" fill style={{ objectFit: 'contain' }} priority />
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
  const { theme } = useTheme();
  const grande = tamanho === 'grande';
  const largura = grande ? 300 : 200;
  const altura = grande ? 250 : 167;

  return (
    <div style={{ textAlign: 'center', userSelect: 'none' }}>
      <div style={{ position: 'relative', width: largura, height: altura, margin: '0 auto' }}>
        <Image
          src={theme === 'dark' ? '/kronia-icon-dark.png' : '/kronia-icon-light.png'}
          alt="KRONIA Nurse"
          fill
          style={{ objectFit: 'contain' }}
          priority
        />
      </div>
      {exibirSlogan && (
        <p style={{
          color: 'var(--color-clinical)',
          fontWeight: 600,
          fontSize: grande ? '1rem' : '0.82rem',
          margin: '6px 0 0',
          fontFamily: 'var(--font-body)',
        }}>
          Evolua Sempre
        </p>
      )}
    </div>
  );
}
