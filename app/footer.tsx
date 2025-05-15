// app/footer.tsx
import Link from 'next/link';
import { Footer, FooterLink, FooterIcon } from 'flowbite-react';
import { BsGithub, BsDiscord } from 'react-icons/bs'; // Keep BsGithub and BsDiscord
import XIcon from '@/public/XIcon'; // Assuming you created XIcon.tsx in app/components/icons/

const CustomFooter: React.FC = () => {
  return (
    <Footer
      container // This prop adds padding and max-width
      className="bg-white rounded-lg shadow dark:bg-gray-900 m-4" // Classes from your example
    >
      <div className="w-full max-w-screen-xl mx-auto md:py-8"> {/* Ensure consistent padding with example */}
        <div className="sm:flex sm:items-center sm:justify-between">
          <Link href="/" className="flex items-center mb-4 sm:mb-0 space-x-3 rtl:space-x-reverse">
            {/* Optional: Add your logo here if you have one */}
            {/* <img src="/your-logo.svg" className="h-8" alt="Builder Love Logo" /> */}
            <span className="self-center text-2xl font-semibold whitespace-nowrap dark:text-white">
              Builder Love
            </span>
          </Link>
          <ul className="flex flex-wrap items-center mb-6 text-sm font-medium text-gray-500 sm:mb-0 dark:text-gray-400">
            <li>
              <FooterLink
                as={Link} // Use Next.js Link for client-side navigation
                href="https://docs.builder.love"
                target="_blank" // Opens in new tab
                rel="noopener noreferrer"
                className="hover:underline me-4 md:me-6" // Maintain styling from example
              >
                Knowledge
              </FooterLink>
            </li>
            {/* Social Icons as part of the list or separate, as Flowbite example does */}
            <li className="flex items-center space-x-3 rtl:space-x-reverse">
              <FooterIcon
                href="https://github.com/builder-love"
                target="_blank"
                rel="noopener noreferrer"
                icon={() => <BsGithub className="w-5 h-5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white" />} // Custom render for better control
                aria-label="GitHub community"
              />
              <FooterIcon
                href="https://x.com/builder_love"
                target="_blank"
                rel="noopener noreferrer"
                icon={() => <XIcon className="w-5 h-5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white" />}
                aria-label="X (formerly Twitter) community"
              />
              <FooterIcon
                href="https://discord.gg/qppA8MxTHf"
                target="_blank"
                rel="noopener noreferrer"
                icon={() => <BsDiscord className="w-5 h-5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white" />}
                aria-label="Discord community"
              />
            </li>
          </ul>
        </div>
        {/* Removed the <hr> and copyright span as per your request */}
      </div>
    </Footer>
  );
};

export default CustomFooter;