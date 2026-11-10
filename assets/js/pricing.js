import { offeringConfig } from "./config.js";

function assertWeek(week, config) {
  if (!Number.isInteger(week) || week < 1 || week > config.durationWeeks) {
    throw new RangeError("Invalid offering week");
  }
}

function assertAmount(amount) {
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    throw new TypeError("Contribution must be a finite number");
  }
  if (amount < 0) {
    throw new RangeError("Contribution cannot be negative");
  }
}

function assertPrice(priceUsd) {
  if (typeof priceUsd !== "number" || !Number.isFinite(priceUsd) || priceUsd <= 0) {
    throw new RangeError("CLICK price must be a positive number");
  }
}

export function getWeeklyPrice(week, config = offeringConfig) {
  assertWeek(week, config);
  return config.initialPriceUsd * Math.pow(1 + config.weeklyIncrease, week - 1);
}

export function getPriceIncreaseFromWeekOne(week, config = offeringConfig) {
  assertWeek(week, config);
  return Math.pow(1 + config.weeklyIncrease, week - 1) - 1;
}

export function getWeeklySchedule(config = offeringConfig) {
  return Array.from({ length: config.durationWeeks }, (_, index) => {
    const week = index + 1;
    return {
      week,
      priceUsd: getWeeklyPrice(week, config),
      increaseFromWeekOne: getPriceIncreaseFromWeekOne(week, config)
    };
  });
}

export function estimateClickFromUsdc(contributionUsdc, clickPriceUsd) {
  assertAmount(contributionUsdc);
  assertPrice(clickPriceUsd);
  return contributionUsdc / clickPriceUsd;
}

export function estimateClickFromSol(contributionSol, clickPriceUsd, solUsdPrice) {
  assertAmount(contributionSol);
  assertPrice(clickPriceUsd);
  if (typeof solUsdPrice !== "number" || !Number.isFinite(solUsdPrice) || solUsdPrice <= 0) {
    throw new Error("SOL/USD price oracle unavailable");
  }
  return (contributionSol * solUsdPrice) / clickPriceUsd;
}

export function createQuote({ asset, amount, clickPriceUsd, solUsdPrice = null }) {
  if (asset === "USDC") {
    return {
      ok: true,
      click: estimateClickFromUsdc(amount, clickPriceUsd),
      requiresOracle: false
    };
  }

  if (asset === "SOL") {
    if (typeof solUsdPrice !== "number" || !Number.isFinite(solUsdPrice) || solUsdPrice <= 0) {
      return {
        ok: false,
        click: null,
        requiresOracle: true,
        errorCode: "SOL_USD_ORACLE_UNAVAILABLE"
      };
    }
    return {
      ok: true,
      click: estimateClickFromSol(amount, clickPriceUsd, solUsdPrice),
      requiresOracle: false
    };
  }

  throw new RangeError("Unsupported payment asset");
}

export function formatPriceUsd(priceUsd, locale = "en-US") {
  const value = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 6,
    maximumFractionDigits: 6
  }).format(priceUsd);
  return `$${value}`;
}

export function formatPercent(ratio, locale = "en-US") {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(ratio);
}

export function formatTokenAmount(amount, locale = "en-US") {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2
  }).format(amount);
}
