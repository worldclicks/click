export function createSolUsdOracle({ getPrice, source = null } = {}) {
  if (typeof getPrice !== "function") {
    throw new TypeError("A SOL/USD price source must provide a getPrice function");
  }
  return {
    source,
    async getSolUsdPrice() {
      const price = await getPrice();
      if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
        throw new Error("SOL/USD price oracle unavailable");
      }
      return price;
    }
  };
}

export const solUsdOracle = {
  source: null,
  async getSolUsdPrice() {
    return null;
  }
};
