// Force rebuild - site gate context v2
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SiteGateContextType {
  isUnlocked: boolean;
  unlock: (password: string) => boolean;
  lock: () => void;
}

const SiteGateContext = createContext<SiteGateContextType | undefined>(undefined);

// Change this password to whatever you want
const SITE_PASSWORD = "shrihit2026";
const STORAGE_KEY = "shrihit_site_access_v3";

export const SiteGateProvider = ({ children }: { children: ReactNode }) => {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "unlocked") {
      setIsUnlocked(true);
    }
  }, []);

  const unlock = (password: string): boolean => {
    if (password === SITE_PASSWORD) {
      setIsUnlocked(true);
      localStorage.setItem(STORAGE_KEY, "unlocked");
      return true;
    }
    return false;
  };

  const lock = () => {
    setIsUnlocked(false);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <SiteGateContext.Provider value={{ isUnlocked, unlock, lock }}>
      {children}
    </SiteGateContext.Provider>
  );
};

export const useSiteGate = () => {
  const context = useContext(SiteGateContext);
  if (context === undefined) {
    throw new Error('useSiteGate must be used within a SiteGateProvider');
  }
  return context;
};
