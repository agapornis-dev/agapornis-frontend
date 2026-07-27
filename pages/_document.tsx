import { Head, Html, Main, NextScript } from 'next/document';

const themeBootScript = `
(function () {
  var preference = 'auto';
  try {
    var stored = localStorage.getItem('agapornis-theme');
    if (stored === 'auto' || stored === 'dark' || stored === 'light') preference = stored;
  } catch (_) {}
  var resolved = preference === 'auto'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : preference;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
})();`;

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="shortcut icon" href="/favicon-32x32.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#faf9f8" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#08090a" />
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
