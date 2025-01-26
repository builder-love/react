// useScreenOrientation.ts (create a new file for this hook)
import { useState, useEffect } from 'react';

export const useScreenOrientation = () => {
  const [screenWidth, setScreenWidth] = useState(0);
  const [screenHeight, setScreenHeight] = useState(0);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleOrientationChange = (event: MediaQueryListEvent | MediaQueryList) => {
        console.log("orientation changed");
      setScreenWidth(window.innerWidth);
      setScreenHeight(window.innerHeight);

      if (event.matches) {
        setOrientation("landscape");
      } else {
        setOrientation("portrait");
      }
    };

    const handleResize = () => {
        console.log("resize event");
        setIsMobile(window.innerWidth < 768);
    };

    if (typeof window !== 'undefined') {
      console.log("window object is defined: setting initial values"); 
      const mediaQuery = window.matchMedia("(orientation: landscape)");
      console.log("mediaQuery: ", mediaQuery);
      console.log("mediaQuery.matches: ", mediaQuery.matches);
      console.log("window.innerWidth: ", window.innerWidth);
      console.log("window.innerHeight: ", window.innerHeight);

      // Set initial values
      setScreenWidth(window.innerWidth);
      setScreenHeight(window.innerHeight);
      setOrientation(mediaQuery.matches ? "landscape" : "portrait");
      setIsMobile(window.innerWidth < 768);

      mediaQuery.addEventListener("change", handleOrientationChange);
      window.addEventListener("resize", handleResize);
      return () => {
        mediaQuery.removeEventListener("change", handleOrientationChange);
        window.removeEventListener("resize", handleResize);
      };
    }
  }, []);

  return { screenWidth, screenHeight, orientation, isMobile };
};