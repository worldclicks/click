import { offeringConfig, saleStatus } from "./config.js";

export const saleService = {
  async getSaleState() {
    return {
      status: saleStatus.PREPARATION,
      live: false,
      currentWeek: null,
      raisedUsd: null,
      remainingTokens: null,
      softCapUsd: offeringConfig.softCapUsd,
      hardCapUsd: offeringConfig.hardCapUsd,
      source: null
    };
  }
};

export function createSaleService(adapter) {
  return {
    async getSaleState() {
      const state = await adapter.getSaleState();
      if (!state || typeof state !== "object") {
        throw new TypeError("Sale adapter returned an invalid state");
      }
      return {
        status: state.status ?? saleStatus.PREPARATION,
        live: Boolean(state.live),
        currentWeek: state.currentWeek ?? null,
        raisedUsd: state.raisedUsd ?? null,
        remainingTokens: state.remainingTokens ?? null,
        softCapUsd: state.softCapUsd ?? null,
        hardCapUsd: state.hardCapUsd ?? null,
        source: state.source ?? null
      };
    }
  };
}
