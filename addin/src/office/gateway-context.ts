import { createContext, useContext } from "react";
import type { WordGateway } from "./types";

export const GatewayContext = createContext<WordGateway | null>(null);

export function useGateway(): WordGateway {
  const gateway = useContext(GatewayContext);
  if (!gateway) throw new Error("useGateway must be used inside a GatewayProvider.");
  return gateway;
}
