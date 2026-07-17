import { createContext, useContext } from "react";

export const ClientContext = createContext(null);

export function useClient() {
  const ctx = useContext(ClientContext);
  if (!ctx) throw new Error("useClient must be used within ClientDashboard");
  return ctx;
}
