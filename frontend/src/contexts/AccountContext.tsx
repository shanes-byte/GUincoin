import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type AccountMode = 'personal' | 'allotment';

interface AccountContextType {
  accountMode: AccountMode;
  setAccountMode: (mode: AccountMode) => void;
  isManager: boolean;
  setIsManager: (isManager: boolean) => void;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

interface AccountProviderProps {
  children: ReactNode;
}

export function AccountProvider({ children }: AccountProviderProps) {
  // Initialize from localStorage if available
  const [accountMode, setAccountModeState] = useState<AccountMode>(() => {
    const stored = localStorage.getItem('guincoin_account_mode');
    return (stored === 'allotment' ? 'allotment' : 'personal') as AccountMode;
  });
  const [isManager, setIsManager] = useState(false);

  // Persist account mode to localStorage
  const setAccountMode = (mode: AccountMode) => {
    setAccountModeState(mode);
    localStorage.setItem('guincoin_account_mode', mode);
  };

  // Reset to personal mode if user is not a manager
  useEffect(() => {
    if (!isManager && accountMode === 'allotment') {
      setAccountMode('personal');
    }
  }, [isManager, accountMode]);

  return (
    <AccountContext.Provider
      value={{
        accountMode,
        setAccountMode,
        isManager,
        setIsManager,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error('useAccount must be used within an AccountProvider');
  }
  return context;
}
