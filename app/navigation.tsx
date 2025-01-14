'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function Navigation() {
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
        {/* GitHub Link */}
        <div className="absolute bottom-5 left-5"> {/* Position at the bottom */}
          <a 
            href="https://github.com/treboryatska/execution_vm" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-white hover:underline"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="24" 
              viewBox="0 0 24 24"
              className="fill-current" // Make sure the logo inherits text color
            >
              {/* GitHub logo SVG path */}
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </a>
        </div>
      </nav>
    </div>
  );
}