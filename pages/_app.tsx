import { Geist,  Geist_Mono  } from "next/font/google";
import type { AppProps } from "next/app";
import { MotionConfig } from "motion/react";
import { FeedbackProvider } from "../components/feedback/FeedbackProvider";
import { ThemeProvider } from "../components/theme/ThemeProvider";
import { useEffect } from "react";
import "../styles/globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});


const geist_mono = Geist_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-geist-mono",
  display: "swap",
});

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    const showWarning = () => {
      console.log(
        "%cDO NOT PASTE ANYTHING",
        "font-size: 48px; font-weight: 700; color: #ff3b30; text-shadow: 2px 2px 0 #000;"
      );

      console.log(
        "%cPasting code here can compromise your account or device.",
        "font-size: 18px; font-weight: 600; color: white; background: #111; padding: 8px 12px; border-radius: 6px;"
      );
    };

    showWarning();
  }, []);

  return (
    <>

      <style jsx global>{`
        :root {
          --font-sans: ${geist.style.fontFamily};
          --font-mono: ${geist_mono.style.fontFamily};
        }

        html,
        body {
          font-family: var(--font-sans), sans-serif;
        }

        h1,
        h2,
        h3,
        h4,
        h5,
        h6 {
          font-family: var(--font-sans), sans-serif !important;
        }

        code,
        pre,
        kbd,
        samp,
        .cm-scroller,
        .cm-editor,
        .terminal,
        .xterm {
          font-family: var(--font-mono), monospace;
        }
      `}</style>

      <MotionConfig
        reducedMotion="user"
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      >
        <ThemeProvider>
          <FeedbackProvider>
            <div
              className={`${geist.variable} ${geist_mono.variable} antialiased`}
            >
              <Component {...pageProps} />
            </div>
          </FeedbackProvider>
        </ThemeProvider>
      </MotionConfig>
    </>
  );
}
