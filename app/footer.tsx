// app/footer.tsx
'use client';
import Link from 'next/link';
import { Footer, FooterLink, FooterIcon } from 'flowbite-react';
import { BsGithub, BsDiscord } from 'react-icons/bs';
import XIcon from '@/app/components/icons/XIcon'; 

const CustomFooter: React.FC = () => {
  // Define icon components with their classes applied
  // This makes the Footer.Icon usage cleaner
  const GitHubIcon = () => <BsGithub className="w-5 h-5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white" />;
  const TwitterXIcon = () => <XIcon className="w-5 h-5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white" />;
  const DiscordIcon = () => <BsDiscord className="w-5 h-5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white" />;

  return (
    <Footer
      container
      className="bg-white rounded-lg shadow dark:bg-gray-900 m-4"
    >
      <div className="w-full max-w-screen-xl mx-auto md:py-8">
        <div className="sm:flex sm:items-center sm:justify-between">
          <Link href="/" className="flex items-center mb-4 sm:mb-0 space-x-3 rtl:space-x-reverse">
            <span className="self-center text-2xl font-semibold whitespace-nowrap dark:text-white">
              Builder Love
            </span>
          </Link>
          <ul className="flex flex-wrap items-center mb-6 text-sm font-medium text-gray-500 sm:mb-0 dark:text-gray-400">
            <li>
              <FooterLink
                as={Link}
                href="https://docs.builder.love"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline me-4 md:me-6"
              >
                Knowledge
              </FooterLink>
            </li>
            <li className="flex items-center space-x-3 rtl:space-x-reverse">
              <FooterIcon
                href="https://github.com/builder-love"
                target="_blank"
                rel="noopener noreferrer"
                icon={GitHubIcon}
                aria-label="GitHub community"
              />
              <FooterIcon
                href="https://x.com/builder_love"
                target="_blank"
                rel="noopener noreferrer"
                icon={TwitterXIcon}
                aria-label="X (formerly Twitter) community"
              />
              <FooterIcon
                href="https://discord.gg/qppA8MxTHf"
                target="_blank"
                rel="noopener noreferrer"
                icon={DiscordIcon}
                aria-label="Discord community"
              />
            </li>
          </ul>
        </div>
      </div>
    </Footer>
  );
};

export default CustomFooter;