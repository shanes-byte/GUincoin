declare namespace Express {
  // [ORIGINAL - 2026-02-12] No isGameMaster field
  interface User {
    id: string;
    email: string;
    name: string;
    isManager: boolean;
    isAdmin: boolean;
    isGameMaster: boolean;
  }
}
