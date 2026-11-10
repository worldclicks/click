export const offeringConfig = Object.freeze({
  token: "CLICK",
  network: "solana",
  maxSupply: 1_000_000_000,
  allocation: 100_000_000,
  initialPriceUsd: 0.001,
  weeklyIncrease: 0.05,
  durationWeeks: 12,
  acceptedAssets: ["SOL", "USDC"],
  softCapUsd: null,
  hardCapUsd: null,
  status: "PREPARATION",
  vesting: Object.freeze({
    model: "HYBRID",
    initialUnlockPct: null,
    cliffMonths: null,
    linearVestingMonths: null,
    releaseFrequency: null,
    claimMechanism: null
  }),
  buyback: Object.freeze({
    previousProposalRevenueShare: 0.5,
    currentCommitment: false
  }),
  marketLaunch: Object.freeze({
    venue: "Meteora DBC",
    finalized: false
  }),
  worldClickTarget: "Q1 2027"
});

export const saleStatus = Object.freeze({
  PREPARATION: "PREPARATION",
  LIVE: "LIVE",
  CLOSED: "CLOSED"
});

export const acceptedAssets = offeringConfig.acceptedAssets;
