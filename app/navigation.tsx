'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

interface NavProps {} // Explicitly empty interface

const Navigation: React.FC<NavProps> = () => {
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  const [windowWidth, setWindowWidth] = useState(0);

  const toggleNav = () => {
    setIsNavCollapsed(!isNavCollapsed);
  };

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    if (typeof window !== 'undefined') {
      setWindowWidth(window.innerWidth);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  return (
    <div className="flex">
      <nav
        className={`p-5 bg-gray-800 h-screen fixed ${
          isNavCollapsed && windowWidth > 768 ? 'w-20' : 'w-64'
        } transition-all duration-300 ease-in-out`}
      >
        <button onClick={toggleNav} className="text-white focus:outline-none">
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            {isNavCollapsed ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16m-7 6h7"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            )}
          </svg>
        </button>
        <ul className={`list-none p-0 ${isNavCollapsed ? 'hidden' : ''}`}>
          <li className="mb-2">
            <Link href="/" className="text-white hover:underline" prefetch>
              Builder Love
            </Link>
          </li>
          <li className="mb-2">
            <Link
              href="/languages"
              className="text-white hover:underline"
              prefetch
            >
              Languages
            </Link>
          </li>
          <li className="mb-2">
            <Link
              href="/developers"
              className="text-white hover:underline"
              prefetch
            >
              Builder Segments
            </Link>
          </li>
          <li className="mb-2">
            <Link
              href="/economics"
              className="text-white hover:underline"
              prefetch
            >
              Economics
            </Link>
          </li>
          <li className="mb-2">
            <Link href="/research" className="text-white hover:underline" prefetch>
              Research
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default Navigation;