import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from 'next/script'; // <-- Import the Script component
import "./globals.css";
import Navigation from "./navigation";
import Footer from "./footer";

const inter = Inter({ subsets: ["latin"] });

// Define your GTM ID as a constant
const GTM_ID = 'GTM-TRZ2C7L2';

export const metadata: Metadata = {
  title: "Builder Love",
  description: "Fight FUD, with love",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* The <head> tag is necessary here in the root layout */}
      <head>
        {/* Google Tag Manager Head Snippet */}
        <Script
          id="gtm-base" // Unique ID for the script
          strategy="afterInteractive" // Load strategy - afterInteractive is good for GTM
          dangerouslySetInnerHTML={{ // Use this for inline scripts
            __html: `
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','${GTM_ID}');
            `,
          }}
        />
        {/* End Google Tag Manager Head Snippet */}

        {/* You can add other head elements here if needed, like custom fonts, etc. */}
        {/* Favicon is usually handled by Next.js conventions (placing favicon.ico in /app) */}
      </head>
      <body className={`${inter.className} bg-black text-white flex flex-col min-h-screen`}>
        {/* Google Tag Manager (noscript) Body Snippet - Place immediately after opening body tag */}
        <noscript
          dangerouslySetInnerHTML={{
            __html: `
              <iframe src="https://www.googletagmanager.com/ns.html?id=${GTM_ID}"
              height="0" width="0" style="display:none;visibility:hidden"></iframe>
            `,
          }}
        />
        {/* End Google Tag Manager (noscript) Body Snippet */}

        {/* Keep the rest of your layout structure */}
        <div className="flex flex-row w-full">
          <Navigation />
          <main className="flex-1 p-5 pt-16 min-h-screen w-full">
            <h1 className="text-3xl font-bold text-red-500 text-center">
              Builder <span className="text-red-500">♥</span>
            </h1>
            {/* Center the content within main */}
            <div className="flex justify-center items-center w-full">
              <div className="w-full max-w-7xl">
                {children}
              </div>
            </div>
          </main>
        </div>
        <Footer />
      </body>
    </html>
  );
}