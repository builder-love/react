// app/navigation.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sidebar, SidebarItems, SidebarItemGroup, SidebarItem } from 'flowbite-react';
import {
  HiTrendingUp,
  HiViewBoards,
  HiUser,
  HiShoppingBag,
  HiInbox,
  HiMenu, // Hamburger icon
  HiX,
} from 'react-icons/hi'; // Using react-icons

// Your navigation items data
const navItems = [
  { href: "/", label: "Top Projects", icon: HiTrendingUp },
  { href: "/languages", label: "Languages", icon: HiViewBoards },
  { href: "/developers", label: "Top Builders", icon: HiUser },
  { href: "/economics", label: "Economics", icon: HiShoppingBag },
  { href: "/research", label: "Research", icon: HiInbox },
];

const CustomNavigation: React.FC<React.PropsWithChildren> = ({ children }) => {
  const pathname = usePathname();
  // State to manage sidebar visibility on mobile
  // The Flowbite example uses data attributes for toggling,
  // but with React, state is more idiomatic.
  // We'll use Flowbite's responsive classes to handle visibility on larger screens.
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Toggle Button for Mobile: sm:hidden means it's hidden on sm screens and up */}
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
        // Core classes for positioning and transition from Flowbite example:
        // - `fixed top-0 left-0 z-40 w-64 h-screen`
        // - `transition-transform`
        // - `-translate-x-full` (initial state for mobile, hidden)
        // - `sm:translate-x-0` (visible by default on sm screens and up)
        // We control the mobile visibility with `isMobileSidebarOpen`
        className={`fixed top-0 left-0 z-40 w-64 h-screen transition-transform 
                    ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
                    sm:translate-x-0`}
        // Flowbite React's Sidebar doesn't have a 'collapsed' prop that works exactly like the HTML example's drawer.
        // Instead, we manipulate the transform class based on state for mobile.
      >
        {/* Add a close button inside the sidebar for mobile if desired */}
        <button
            onClick={toggleMobileSidebar}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-500 sm:hidden"
        >
            <HiX className="w-6 h-6" />
        </button>
        <div className={`h-full px-3 overflow-y-auto bg-gray-50 dark:bg-gray-800 
                      pb-4 ${isMobileSidebarOpen ? 'pt-16' : 'pt-4'} sm:pt-4`}>
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
        </div>
      </Sidebar>

      {/* Main Content Area */}
      {/* `sm:ml-64` pushes content to the right ON sm SCREENS AND UP to make space for the sidebar */}
      <div className="p-0 sm:ml-64"> {/* p-0 here, actual padding will be on <main> in RootLayout */}
        {children}
      </div>
    </>
  );
};

export default CustomNavigation;