import type { ReactNode } from "react";
import { GatewayContext } from "./gateway-context";
import type { WordGateway } from "./types";

export function GatewayProvider({ gateway, children }: { gateway: WordGateway; children: ReactNode }) {
  return <GatewayContext.Provider value={gateway}>{children}</GatewayContext.Provider>;
}
