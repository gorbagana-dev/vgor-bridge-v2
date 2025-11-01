import type { Metadata } from "next";
import Script from 'next/script';
import Providers from './providers';

export const metadata: Metadata = {
  title: "Trashnet - Gorbagana - $GOR",
  description: "Initially started from a series of tweets, to now powering a high-performance L1 chain, used as gas fee.",
  openGraph: {
    title: "Trashnet - Gorbagana - $GOR",
    description: "Initially started from a series of tweets, to now powering a high-performance L1 chain, used as gas fee.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Trashnet - Gorbagana - $GOR",
    description: "Initially started from a series of tweets, to now powering a high-performance L1 chain, used as gas fee.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="generator" content="Webflow" />
        <link href="/css/normalize.css" rel="stylesheet" type="text/css" />
        <link href="/css/webflow.css" rel="stylesheet" type="text/css" />
        <link href="/css/gor-b72cae-24f0bcbf52db6298f28fa28797d4.webflow.css" rel="stylesheet" type="text/css" />
        <link href="/images/favicon.png" rel="shortcut icon" type="image/x-icon" />
        <link href="/images/webclip.png" rel="apple-touch-icon" />
      </head>
      <body>
        <Providers>
          <Script
            id="webflow-touch"
            strategy="beforeInteractive"
            dangerouslySetInnerHTML={{
              __html: `!function(o,c){var n=c.documentElement,t=" w-mod-";n.className+=t+"js",("ontouchstart"in o||o.DocumentTouch&&c instanceof DocumentTouch)&&(n.className+=t+"touch")}(window,document);`,
            }}
          />
          {children}
        </Providers>
      </body>
    </html>
  );
}
