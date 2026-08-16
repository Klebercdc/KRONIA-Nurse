import { Space_Grotesk, Inter, IBM_Plex_Mono } from 'next/font/google';

/**
 * As três famílias já estavam declaradas em styles/globals.css (--font-display,
 * --font-body, --font-mono), mas nunca eram carregadas — sem @font-face,
 * @import, next/font ou <link>. Na prática o app inteiro caía no fallback
 * ('Segoe UI' / mono do sistema).
 *
 * Cada loader expõe uma CSS variable própria; globals.css encadeia essas
 * variables nos tokens existentes, então nenhum componente precisa mudar.
 *
 * Pesos: pedimos exatamente o que o CSS usa hoje. Space Grotesk e IBM Plex Mono
 * não têm peso 800 no Google Fonts (param em 700) — onde o CSS pede 800, o
 * navegador sintetiza. Ver LAYOUT_ATUAL.md §2.
 */

export const fontDisplay = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

export const fontBody = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-inter',
  display: 'swap',
});

export const fontMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
});

/** Classe única a aplicar no wrapper raiz, expondo as três variables. */
export const fontVariables = `${fontDisplay.variable} ${fontBody.variable} ${fontMono.variable}`;
