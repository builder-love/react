'use client';

import React from 'react';
import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useScreenOrientation } from './hooks/useScreenOrientation';

const Navigation: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { isMobile } = useScreenOrientation();
  const [isNavCollapsed, setIsNavCollapsed] = useState(true); // Start collapsed on mobile
  const pathname = usePathname();
  const navRef = useRef<HTMLDivElement>(null);

  // Only allow toggling on mobile
  const toggleNav = () => {
    if (isMobile) {
      setIsNavCollapsed(!isNavCollapsed);
    }
  };

  // Collapse on route change (only on mobile)
  const collapseNav = useCallback(() => { // Make sure collapseNav is memoized if it's complex or passed down
    if (isMobile) {
      setIsNavCollapsed(true);
    }
  }, [isMobile]); // Add isMobile as a dependency here

  // Collapse by default on mobile, always expanded on desktop
  useEffect(() => {
    setIsNavCollapsed(isMobile);
  }, [isMobile]);

  useEffect(() => {
    collapseNav();
  }, [pathname, collapseNav]); // ADD collapseNav HERE

  const getNavWidth = () => {
    if (!isMobile) {
      return navRef.current?.offsetWidth || 256; // Default width when expanded on desktop
    }
    return 0; // No width on mobile when collapsed
  };

  return (
    <div className="md:block relative z-10">
      <nav
        ref={navRef}
        className={`bg-gray-800 md:h-screen md:w-64 w-full fixed ${
          isNavCollapsed && isMobile ? 'h-auto bg-transparent' : 'h-screen w-64'
        } transition-all duration-300 ease-in-out`}
      >
        <div className="flex justify-between items-center">
          {/* Show toggle button only on mobile */}
          {isMobile && (
            <button onClick={toggleNav} className="text-white focus:outline-none p-5">
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
          )}
          {/* Title/Logo */}
          {isMobile && isNavCollapsed && (
            <Link href="/" className="text-white text-lg font-bold pr-5" prefetch>
              BL
            </Link>
          )}
        </div>

        {/* Add mt-10 for top margin on desktop */}
        <ul className={`list-none p-0 ${isNavCollapsed && isMobile ? 'hidden' : ''} ${!isMobile ? 'mt-10' : ''}`}>
          <li className="mb-2">
            <Link href="/" className="text-white hover:underline block px-5" prefetch>
              Builder Love
            </Link>
          </li>
          <li className="mb-2">
            <Link href="/languages" className="text-white hover:underline block px-5" prefetch>
              Languages
            </Link>
          </li>
          <li className="mb-2">
            <Link href="/developers" className="text-white hover:underline block px-5" prefetch>
              Builder Segments
            </Link>
          </li>
          <li className="mb-2">
            <Link href="/economics" className="text-white hover:underline block px-5" prefetch>
              Economics
            </Link>
          </li>
          <li className="mb-2">
            <Link href="/research" className="text-white hover:underline block px-5" prefetch>
              Research
            </Link>
          </li>
        </ul>
      </nav>

      {/* Adjust content based on navWidth */}
      <NavContext.Provider value={{ navWidth: getNavWidth() }}>
        <div style={{ marginLeft: isMobile ? '0' : `${getNavWidth()}px` }}>
          {children}
        </div>
      </NavContext.Provider>
    </div>
  );
};

export const NavContext = React.createContext({ navWidth: 0 });

export default Navigation;