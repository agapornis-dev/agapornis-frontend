import { IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import type { AppProps } from 'next/app';
import { MotionConfig } from 'motion/react';
import { FeedbackProvider } from '../components/feedback/FeedbackProvider';
import { useEffect } from 'react';
import '../styles/globals.css';

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
  const showWarning = () => {
    console.log(
      '%cDO NOT PASTE ANYTHING',
      'font-size: 48px; font-weight: 700; color: #ff3b30; text-shadow: 2px 2px 0 #000;'
    );

    console.log(
      '%cPasting code here can compromise your account or device.',
      'font-size: 18px; font-weight: 600; color: white; background: #111; padding: 8px 12px; border-radius: 6px;'
    );
  };

  showWarning();

  const interval = window.setInterval(showWarning, 5000);

  return () => window.clearInterval(interval);
}, []);
  return (
    <>
      <style jsx global>{`
        :root {
          --font-ibm-plex-sans: ${ibmPlexSans.style.fontFamily};
          --font-ibm-plex-mono: ${ibmPlexMono.style.fontFamily};
        }
      `}</style>

      <MotionConfig
        reducedMotion="user"
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      >
        <FeedbackProvider>
          <div className="font-sans antialiased">
            <Component {...pageProps} />
          </div>
        </FeedbackProvider>
      </MotionConfig>
    </>
  );
}