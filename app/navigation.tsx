// app/navigation.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image'; // You are using Image component
import { usePathname } from 'next/navigation';
import { Sidebar, SidebarItem, SidebarItemGroup, SidebarItems } from 'flowbite-react'; // Corrected imports
import {
  HiTrendingUp,
  HiViewBoards,
  HiUser,
  HiShoppingBag,
  HiInbox,
  HiMenu, // Hamburger icon
  HiX,
  HiSearch,
  HiFire
} from 'react-icons/hi'; // Using react-icons

// navigation items data
const navItems = [
  { href: "/", label: "Top Projects", icon: HiTrendingUp },
  { href: "/trending", label: "Trending", icon: HiFire },
  { href: "/developers", label: "Top Builders", icon: HiUser },
  { href: "/industry", label: "Find a Project", icon: HiSearch }, // New "Find a Project" item
  { href: "/languages", label: "Languages", icon: HiViewBoards },
  { href: "/economics", label: "Economics", icon: HiShoppingBag },
  { href: "/research", label: "Research", icon: HiInbox }, // Consider changing HiInbox if it's not fitting for "Research"
];

const CustomNavigation: React.FC<React.PropsWithChildren> = ({ children }) => {
  const pathname = usePathname();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [pathname]);

  // Optional: Close mobile sidebar if window is resized to desktop width
  useEffect(() => {
    if (isMobileSidebarOpen) {
        const handleResize = () => {
            if (window.innerWidth >= 640) { // sm breakpoint
                setIsMobileSidebarOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }
  }, [isMobileSidebarOpen]);

  return (
    <>
      <button
        onClick={toggleMobileSidebar}
        aria-controls="default-sidebar"
        type="button"
        className="fixed top-4 left-4 z-50 inline-flex items-center p-2 mt-2 ms-3 text-sm text-gray-500 rounded-lg sm:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600"
      >
        <span className="sr-only">Open sidebar</span>
        <HiMenu className="w-6 h-6" />
      </button>

      <Sidebar
        id="default-sidebar"
        aria-label="Default sidebar example"
        className={`fixed top-0 left-0 z-40 w-64 h-screen transition-transform
                    ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                    sm:translate-x-0`}
      >
        {/* This div is the direct child of Sidebar, make it flex-col and h-full */}
        <div
          className={`flex flex-col h-full px-3 overflow-y-auto bg-gray-50 dark:bg-gray-800
                      pb-4 ${isMobileSidebarOpen ? 'pt-16' : 'pt-4'} sm:pt-4`}
        >
          {/* Optional: Close button inside mobile sidebar */}
          {isMobileSidebarOpen && ( // Only show X button when mobile sidebar is open
            <button
                onClick={toggleMobileSidebar}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-500 sm:hidden" // sm:hidden to hide on desktop
            >
                <HiX className="w-6 h-6" />
            </button>
          )}

          {/* Navigation Items Section */}
          {/* No need for an extra flex-grow div here if mt-auto is on the last item of a flex-col parent */}
          <SidebarItems>
            <SidebarItemGroup>
              {navItems.map((item) => (
                <SidebarItem
                  key={item.href}
                  as={Link}
                  href={item.href}
                  icon={item.icon}
                  active={pathname === item.href}
                  // Close sidebar on mobile item click
                  onClick={() => { if (isMobileSidebarOpen) setIsMobileSidebarOpen(false); }}
                  className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {item.label}
                </SidebarItem>
              ))}
            </SidebarItemGroup>
          </SidebarItems>

          {/* Builder Love Logo/Brand at the bottom - DESKTOP ONLY */}
          <div className="mt-auto hidden sm:block pt-4 border-t border-gray-200 dark:border-gray-700">
            <Link
              href="/"
              className="flex items-center justify-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group"
            >
              <Image
                src="/favicon-32x32.png" // Ensure this path is correct in your public folder
                alt="Builder Love Logo"
                width={24} // Set explicit width
                height={24} // Set explicit height
                className="h-6 w-auto me-2" // Use me-2 for margin-end, adjust if needed
              />
              <span className="self-center text-lg font-semibold whitespace-nowrap"> {/* Adjusted to text-lg */}
                Builder Love
              </span>
            </Link>
          </div>
        </div>
      </Sidebar>

      <div className="p-0 sm:ml-64">
        {children}
      </div>
    </>
  );
};

export default CustomNavigation;