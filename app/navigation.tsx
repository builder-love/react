'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useScreenOrientation } from './hooks/useScreenOrientation';

const Navigation: React.FC<React.PropsWithChildren> = () => {
  const { isMobile } = useScreenOrientation();
  const [isNavCollapsed, setIsNavCollapsed] = useState(isMobile);
  const pathname = usePathname();

  const toggleNav = () => {
    setIsNavCollapsed(!isNavCollapsed);
  };

  const collapseNav = () => {
    if (isMobile) {
      setIsNavCollapsed(true);
    }
  };

  useEffect(() => {
    setIsNavCollapsed(isMobile);
  }, [isMobile]);

  // Collapse the navbar whenever the route changes
  useEffect(() => {
    collapseNav();
  }, [pathname]);

  return (
    <div className="md:block relative z-10">
      <nav
        className={`bg-gray-800 md:h-screen md:w-64 w-full fixed ${
          isNavCollapsed ? 'h-auto bg-transparent' : 'h-screen w-64'
        } transition-all duration-300 ease-in-out`}
      >
        <div className="flex justify-between items-center">
          <button
            onClick={toggleNav}
            className="text-white focus:outline-none p-5"
          >
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
          {/* Title/Logo */}
          {isMobile && isNavCollapsed && (
            <Link href="/" className="text-white text-lg font-bold pr-5" prefetch>
              BL
            </Link>
          )}
        </div>
        <ul
          className={`list-none p-0 ${isNavCollapsed ? 'hidden md:block' : 'block'}`}
        >
          <li className="mb-2">
            <Link
              href="/"
              className="text-white hover:underline block px-5"
              prefetch
            >
              Builder Love
            </Link>
          </li>
          <li className="mb-2">
            <Link
              href="/languages"
              className="text-white hover:underline block px-5"
              prefetch
            >
              Languages
            </Link>
          </li>
          <li className="mb-2">
            <Link
              href="/developers"
              className="text-white hover:underline block px-5"
              prefetch
            >
              Builder Segments
            </Link>
          </li>
          <li className="mb-2">
            <Link
              href="/economics"
              className="text-white hover:underline block px-5"
              prefetch
            >
              Economics
            </Link>
          </li>
          <li className="mb-2">
            <Link
              href="/research"
              className="text-white hover:underline block px-5"
              prefetch
            >
              Research
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default Navigation;