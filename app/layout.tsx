import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navigation from './navigation';
import Footer from './footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Builder Love',
  description: 'Fight FUD, with love',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} bg-black text-white flex flex-col min-h-screen`}
      >
        <div className="flex flex-row w-full">
          <Navigation />
          <main className="flex-1 md:ml-64 p-5 pt-16 md:pt-5">
            <h1 className="text-3xl font-bold text-red-500 text-center">
              Builder <span className="text-red-500">♥</span>
            </h1>
            <p className="text-sm text-gray-400 text-center mt-2 md:block hidden">
              This app is in beta. Please use the data and analysis presented on
              this page with caution.
            </p>
            {children}
          </main>
        </div>
        <Footer />
      </body>
    </html>
  );
}