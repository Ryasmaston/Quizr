import { useState, useEffect } from 'react';

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      // Robust detection: combination of media query and user agent
      const mobileQuery = window.matchMedia('(max-width: 768px)');
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const isMobileUA = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
      
      setIsMobile(mobileQuery.matches || isMobileUA);
    };

    checkMobile();
    
    const query = window.matchMedia('(max-width: 768px)');
    query.addEventListener('change', checkMobile);
    
    return () => query.removeEventListener('change', checkMobile);
  }, []);

  return isMobile;
}
