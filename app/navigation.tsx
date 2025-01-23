'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

const Navigation: React.FC<React.PropsWithChildren> = () => {
  const [isNavCollapsed, setIsNavCollapsed] = useState(true); // Default collapsed on mobile
  const [windowWidth, setWindowWidth] = useState(0);

  const toggleNav = () => {
    setIsNavCollapsed(!isNavCollapsed);
  };

  const collapseNav = () => {
    if (windowWidth < 768) {
      setIsNavCollapsed(true);
    }
  }

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

  useEffect(() => {
    if (windowWidth >= 768) {
      setIsNavCollapsed(false); // Expand by default on larger screens
    } else {
      setIsNavCollapsed(true); // Collapse by default on smaller screens
    }
  }, [windowWidth]);

  return (
    <div className="md:block relative z-10">
      <nav
        className={`bg-gray-800 md:h-screen md:w-64 w-full fixed ${
          isNavCollapsed
            ? 'h-auto bg-transparent'
            : 'h-screen w-64'
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
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16m-7 6h7"
              />
            </svg>
          </button>
          {/* Title/Logo */}
          {windowWidth < 768 && isNavCollapsed && (
            <Link
              href="/"
              className="text-white text-lg font-bold pr-5"
              prefetch
            >
              BL
            </Link>
          )}
        </div>
        <ul
          className={`list-none p-0 ${
            isNavCollapsed ? 'hidden md:block' : 'block'
          }`}
        >
          <li className="mb-2">
            <Link
              href="/"
              className="text-white hover:underline block px-5"
              prefetch
              onClick={collapseNav}
            >
              Builder Love
            </Link>
          </li>
          <li className="mb-2">
            <Link
              href="/languages"
              className="text-white hover:underline block px-5"
              prefetch
              onClick={collapseNav}
            >
              Languages
            </Link>
          </li>
          <li className="mb-2">
            <Link
              href="/developers"
              className="text-white hover:underline block px-5"
              prefetch
              onClick={collapseNav}
            >
              Builder Segments
            </Link>
          </li>
          <li className="mb-2">
            <Link
              href="/economics"
              className="text-white hover:underline block px-5"
              prefetch
              onClick={collapseNav}
            >
              Economics
            </Link>
          </li>
          <li className="mb-2">
            <Link
              href="/research"
              className="text-white hover:underline block px-5"
              prefetch
              onClick={collapseNav}
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