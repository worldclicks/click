import { offeringConfig } from "./config.js";
import {
  createQuote,
  formatPercent,
  formatPriceUsd,
  formatTokenAmount,
  getPriceIncreaseFromWeekOne,
  getWeeklyPrice,
  getWeeklySchedule
} from "./pricing.js";
import { initI18n, setLanguage, t, getIntlLocale } from "./i18n.js";
import { saleService } from "./sale.js";
import { solUsdOracle } from "./oracle.js";
import {
  connectWallet,
  disconnectWallet,
  getAvailableWallets,
  shortenAddress
} from "./wallet.js";

const state = {
  step: 1,
  asset: "USDC",
  amount: null,
  amountTouched: false,
  quote: null,
  wallet: null,
  sale: null,
  solUsdPrice: null
};

let quoteRequestId = 0;

const el = {};

function cacheElements() {
  el.priceTableBody = document.getElementById("price-table-body");
  el.priceChart = document.getElementById("price-chart");
  el.priceFormula = document.getElementById("price-formula");
  el.heroPrice = document.getElementById("hero-price-value");

  el.paramInitialPrice = document.getElementById("param-initial-price");
  el.paramDuration = document.getElementById("param-duration");
  el.paramWeekly = document.getElementById("param-weekly");
  el.paramAllocation = document.getElementById("param-allocation");
  el.paramPayments = document.getElementById("param-payments");

  el.panelStatusBadge = document.getElementById("panel-status-badge");
  el.panelStatusTitle = document.getElementById("panel-title");
  el.panelStatusNote = document.getElementById("panel-status-note");
  el.panelStage = document.getElementById("panel-stage-value");
  el.panelPriceLabel = document.getElementById("panel-price-label");
  el.panelPrice = document.getElementById("panel-price-value");
  el.panelProgressValue = document.getElementById("panel-progress-value");
  el.panelProgressTrack = document.getElementById("panel-progress-track");
  el.panelProgressFill = document.getElementById("panel-progress-fill");
  el.panelAllocation = document.getElementById("panel-allocation-value");
  el.panelRaised = document.getElementById("panel-raised-value");
  el.panelRemaining = document.getElementById("panel-remaining-value");
  el.panelSoftcap = document.getElementById("panel-softcap-value");
  el.panelHardcap = document.getElementById("panel-hardcap-value");

  el.tokMaxSupply = document.getElementById("tok-max-supply");
  el.tokOfferingAmount = document.getElementById("tok-offering-amount");
  el.tokOfferingPct = document.getElementById("tok-offering-pct");
  el.tokOtherAmount = document.getElementById("tok-other-amount");
  el.tokDonut = document.getElementById("tok-donut");
  el.tokDonutCenter = document.getElementById("tok-donut-center");
  el.tokLegendOffering = document.getElementById("tok-legend-offering-pct");
  el.tokLegendOther = document.getElementById("tok-legend-other-pct");
  el.bbDesc = document.getElementById("bb-desc");

  el.vestInitial = document.getElementById("vest-initial-value");
  el.vestCliff = document.getElementById("vest-cliff-value");
  el.vestLinear = document.getElementById("vest-linear-value");
  el.vestFrequency = document.getElementById("vest-frequency-value");
  el.vestClaim = document.getElementById("vest-claim-value");

  el.buyDialog = document.getElementById("buy-dialog");
  el.buyPanelContainer = document.getElementById("buy-panels");
  el.buyPanels = Array.from(document.querySelectorAll(".buy-panel"));
  el.stepItems = Array.from(document.querySelectorAll(".step-item"));
  el.buyBack = document.getElementById("buy-back");
  el.buyNext = document.getElementById("buy-next");
  el.buyOpeners = Array.from(document.querySelectorAll(".js-open-buy"));

  el.contributionInput = document.getElementById("contribution-input");
  el.contributionSymbol = document.getElementById("contribution-symbol");
  el.contributionAssetLabel = document.getElementById("contribution-asset-label");
  el.contributionWeek = document.getElementById("contribution-week-value");
  el.contributionPrice = document.getElementById("contribution-price-value");
  el.contributionEstimate = document.getElementById("contribution-estimate-value");
  el.contributionError = document.getElementById("contribution-error");

  el.reviewContribution = document.getElementById("review-contribution-value");
  el.reviewEstimate = document.getElementById("review-estimate-value");
  el.reviewPrice = document.getElementById("review-price-value");

  el.walletFeedback = document.getElementById("wallet-feedback");
  el.walletConnected = document.getElementById("wallet-connected");
  el.walletAddress = document.getElementById("wallet-address");
  el.walletDisconnect = document.getElementById("wallet-disconnect");
  el.walletSkip = document.getElementById("wallet-skip");

  el.legalDialog = document.getElementById("legal-dialog");
  el.legalTitle = document.getElementById("legal-title");
  el.legalBody = document.getElementById("legal-body");

  el.menuToggle = document.getElementById("menu-toggle");
  el.mobileNav = document.getElementById("mobile-nav");
  el.siteHeader = document.getElementById("site-header");
}

function formatUsd(amount, locale) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(amount);
}

function getOfferingWeek() {
  if (state.sale?.live && state.sale.currentWeek) return state.sale.currentWeek;
  return 1;
}

function getCurrentClickPrice() {
  return getWeeklyPrice(getOfferingWeek());
}

function renderHeroPrice() {
  if (!el.heroPrice) return;
  el.heroPrice.textContent = formatPriceUsd(getWeeklyPrice(1), getIntlLocale());
}

function renderOfferingParameters() {
  const locale = getIntlLocale();
  const numberLocale = new Intl.NumberFormat(locale);
  const weeklyPercent = new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 1
  }).format(offeringConfig.weeklyIncrease);

  if (el.paramInitialPrice) {
    el.paramInitialPrice.textContent = formatPriceUsd(getWeeklyPrice(1), locale);
  }
  if (el.paramDuration) {
    el.paramDuration.textContent = t("value_weeks", { n: offeringConfig.durationWeeks });
  }
  if (el.paramWeekly) {
    el.paramWeekly.textContent = t("value_weekly_increase", { pct: weeklyPercent });
  }
  if (el.paramAllocation) {
    el.paramAllocation.textContent = `${numberLocale.format(offeringConfig.allocation)} ${offeringConfig.token}`;
  }
  if (el.paramPayments) {
    el.paramPayments.textContent = offeringConfig.acceptedAssets.join(" + ");
  }
  if (el.priceFormula) {
    const multiplier = Number((1 + offeringConfig.weeklyIncrease).toFixed(4));
    el.priceFormula.textContent = `P(n) = ${offeringConfig.initialPriceUsd} × ${multiplier}^(n−1)`;
  }
}

function renderPriceSchedule() {
  const locale = getIntlLocale();
  const schedule = getWeeklySchedule();

  if (el.priceTableBody) {
    const rows = schedule.map((row) => {
      const tr = document.createElement("tr");
      const isActive = Boolean(state.sale?.live && state.sale.currentWeek === row.week);
      if (isActive) tr.classList.add("is-active");

      const cells = [
        String(row.week).padStart(2, "0"),
        formatPriceUsd(row.priceUsd, locale),
        formatPercent(getPriceIncreaseFromWeekOne(row.week), locale),
        isActive ? t("status_active") : t("status_indicative")
      ];

      cells.forEach((value, index) => {
        const td = document.createElement("td");
        td.textContent = value;
        if (index === 1) td.classList.add("mono");
        if (index === 3) td.classList.add("table-status");
        tr.appendChild(td);
      });

      return tr;
    });
    el.priceTableBody.replaceChildren(...rows);
  }

  if (el.priceChart) {
    const maxPrice = schedule[schedule.length - 1].priceUsd;
    const bars = schedule.map((row) => {
      const bar = document.createElement("div");
      bar.className = "price-bar";
      bar.title = `${t("table_week")} ${row.week}: ${formatPriceUsd(row.priceUsd, locale)}`;

      const fill = document.createElement("span");
      fill.className = "price-bar-fill";
      fill.style.height = `${Math.max(8, (row.priceUsd / maxPrice) * 100)}%`;

      const label = document.createElement("span");
      label.className = "price-bar-label";
      label.textContent = String(row.week);

      bar.append(fill, label);
      return bar;
    });
    el.priceChart.replaceChildren(...bars);
    el.priceChart.setAttribute("aria-label", t("price_chart_label"));
  }
}

function renderTokenomics() {
  const locale = getIntlLocale();
  const numberLocale = new Intl.NumberFormat(locale);
  const offeringPercent = (offeringConfig.allocation / offeringConfig.maxSupply) * 100;
  const otherPercent = 100 - offeringPercent;
  const percentValue = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(
    offeringPercent
  );

  if (el.tokMaxSupply) {
    el.tokMaxSupply.textContent = `${numberLocale.format(offeringConfig.maxSupply)} ${offeringConfig.token}`;
  }
  if (el.tokOfferingAmount) {
    el.tokOfferingAmount.textContent = `${numberLocale.format(offeringConfig.allocation)} ${offeringConfig.token}`;
  }
  if (el.tokOfferingPct) {
    el.tokOfferingPct.textContent = t("tok_offering_pct", { pct: percentValue });
  }
  if (el.tokOtherAmount) {
    const other = offeringConfig.maxSupply - offeringConfig.allocation;
    el.tokOtherAmount.textContent = `${numberLocale.format(other)} ${offeringConfig.token}`;
  }
  if (el.tokDonut) {
    el.tokDonut.style.setProperty("--offering-share", `${offeringPercent}%`);
  }
  if (el.tokDonutCenter) {
    el.tokDonutCenter.textContent = `${percentValue}%`;
  }
  if (el.tokLegendOffering) {
    el.tokLegendOffering.textContent = `${percentValue}%`;
  }
  if (el.tokLegendOther) {
    el.tokLegendOther.textContent = `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(otherPercent)}%`;
  }
  if (el.bbDesc) {
    const share = new Intl.NumberFormat(locale, {
      style: "percent",
      maximumFractionDigits: 0
    }).format(offeringConfig.buyback.previousProposalRevenueShare);
    el.bbDesc.textContent = t("bb_desc", { pct: share });
  }
}

function renderVesting() {
  const locale = getIntlLocale();
  const vesting = offeringConfig.vesting;

  const percent = (value) =>
    value == null
      ? t("vest_pending")
      : new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }).format(
          value / 100
        );

  const months = (value) =>
    value == null
      ? t("vest_pending")
      : new Intl.NumberFormat(locale, { style: "unit", unit: "month", unitDisplay: "long" }).format(
          value
        );

  if (el.vestInitial) el.vestInitial.textContent = percent(vesting.initialUnlockPct);
  if (el.vestCliff) el.vestCliff.textContent = months(vesting.cliffMonths);
  if (el.vestLinear) el.vestLinear.textContent = months(vesting.linearVestingMonths);
  if (el.vestFrequency) {
    el.vestFrequency.textContent =
      vesting.releaseFrequency == null ? t("vest_pending") : String(vesting.releaseFrequency);
  }
  if (el.vestClaim) {
    el.vestClaim.textContent =
      vesting.claimMechanism == null ? t("vest_pending") : String(vesting.claimMechanism);
  }
}

async function renderSaleState() {
  try {
    state.sale = await saleService.getSaleState();
  } catch {
    state.sale = { live: false, status: "PREPARATION", currentWeek: null };
  }

  const locale = getIntlLocale();
  const sale = state.sale;
  const live = Boolean(sale.live);

  if (el.panelStatusBadge) {
    el.panelStatusBadge.textContent = live ? t("status_live") : t("status_preparation");
    el.panelStatusBadge.classList.toggle("is-live", live);
  }
  if (el.panelStatusTitle) {
    el.panelStatusTitle.textContent = live ? t("panel_status_live") : t("panel_status_not_live");
  }
  if (el.panelStatusNote) {
    el.panelStatusNote.textContent = live ? t("panel_status_live_note") : t("panel_status_note");
  }
  if (el.panelStage) {
    el.panelStage.textContent =
      live && sale.currentWeek ? t("panel_stage_week", { n: sale.currentWeek }) : t("panel_stage_value");
  }
  if (el.panelPriceLabel) {
    el.panelPriceLabel.textContent = live ? t("panel_current_price") : t("panel_indicative_price");
  }
  if (el.panelPrice) {
    const week = live && sale.currentWeek ? sale.currentWeek : 1;
    el.panelPrice.textContent = formatPriceUsd(getWeeklyPrice(week), locale);
  }
  if (el.panelProgressValue) {
    el.panelProgressValue.textContent = live ? t("panel_progress_live") : t("panel_progress_value");
  }
  if (el.panelProgressTrack && el.panelProgressFill) {
    const hasProgress =
      live &&
      typeof sale.raisedUsd === "number" &&
      typeof sale.hardCapUsd === "number" &&
      sale.hardCapUsd > 0;
    el.panelProgressTrack.classList.toggle("is-pending", !hasProgress);
    el.panelProgressFill.style.width = hasProgress
      ? `${Math.min(100, (sale.raisedUsd / sale.hardCapUsd) * 100)}%`
      : "0%";
  }
  if (el.panelAllocation) {
    el.panelAllocation.textContent = `${new Intl.NumberFormat(locale).format(offeringConfig.allocation)} ${offeringConfig.token}`;
  }
  if (el.panelRaised) {
    el.panelRaised.textContent =
      typeof sale.raisedUsd === "number"
        ? formatUsd(sale.raisedUsd, locale)
        : t("panel_value_unavailable");
  }
  if (el.panelRemaining) {
    el.panelRemaining.textContent =
      typeof sale.remainingTokens === "number"
        ? `${new Intl.NumberFormat(locale).format(sale.remainingTokens)} ${offeringConfig.token}`
        : t("panel_remaining_value");
  }
  if (el.panelSoftcap) {
    el.panelSoftcap.textContent =
      typeof sale.softCapUsd === "number" ? formatUsd(sale.softCapUsd, locale) : t("value_tbc");
  }
  if (el.panelHardcap) {
    el.panelHardcap.textContent =
      typeof sale.hardCapUsd === "number" ? formatUsd(sale.hardCapUsd, locale) : t("value_tbc");
  }
}

function renderWalletOptions() {
  const wallets = getAvailableWallets();

  wallets.forEach((wallet) => {
    const status = document.querySelector(`[data-wallet-status="${wallet.id}"]`);
    const button = document.querySelector(`[data-wallet-connect="${wallet.id}"]`);

    if (status) {
      if (wallet.available) {
        status.textContent = t("wallet_detected");
      } else if (wallet.id === "walletconnect") {
        status.textContent = t("wallet_wc_disabled");
      } else {
        status.textContent = t("wallet_not_installed");
      }
    }

    if (button) {
      button.disabled = !wallet.available;
      button.textContent = t("wallet_connect");
      button.hidden = Boolean(state.wallet && state.wallet.id === wallet.id);
      if (wallet.id === "walletconnect") {
        button.title = t("wallet_wc_note");
      }
    }
  });

  if (state.wallet) {
    el.walletConnected.hidden = false;
    el.walletAddress.textContent = t("wallet_connected_as", {
      address: shortenAddress(state.wallet.publicKey)
    });
    el.walletDisconnect.textContent = t("wallet_disconnect");
    el.walletSkip.hidden = true;
  } else {
    el.walletConnected.hidden = true;
    el.walletSkip.hidden = false;
  }
}

function renderContribution() {
  const locale = getIntlLocale();
  const price = getCurrentClickPrice();
  const amount = state.amount;

  if (el.contributionSymbol) el.contributionSymbol.textContent = state.asset;
  if (el.contributionAssetLabel) el.contributionAssetLabel.textContent = state.asset;
  if (el.contributionWeek) {
    el.contributionWeek.textContent =
      state.sale?.live && state.sale.currentWeek
        ? t("panel_stage_week", { n: state.sale.currentWeek })
        : t("contribution_week_value");
  }
  if (el.contributionPrice) {
    el.contributionPrice.textContent = formatPriceUsd(price, locale);
  }

  const quote = state.quote;
  if (el.contributionEstimate) {
    el.contributionEstimate.textContent =
      quote?.ok && quote.click != null
        ? `${formatTokenAmount(quote.click, locale)} ${offeringConfig.token}`
        : "—";
  }

  if (el.contributionError) {
    let message = "";
    if (state.amountTouched && (!Number.isFinite(amount) || amount <= 0)) {
      message = t("contribution_invalid");
    } else if (quote?.requiresOracle) {
      message = t("contribution_oracle_missing");
    }
    el.contributionError.textContent = message;
    el.contributionError.hidden = !message;
  }

  if (el.reviewContribution) {
    const formattedAmount =
      Number.isFinite(amount) && amount > 0
        ? `${new Intl.NumberFormat(locale, { maximumFractionDigits: 6 }).format(amount)} ${state.asset}`
        : "—";
    el.reviewContribution.textContent = formattedAmount;
  }
  if (el.reviewEstimate) {
    el.reviewEstimate.textContent =
      quote?.ok && quote.click != null
        ? `${formatTokenAmount(quote.click, locale)} ${offeringConfig.token}`
        : "—";
  }
  if (el.reviewPrice) {
    el.reviewPrice.textContent = formatPriceUsd(price, locale);
  }
}

async function refreshQuote() {
  const requestId = ++quoteRequestId;
  const amount = state.amount;

  if (!Number.isFinite(amount) || amount <= 0) {
    state.quote = null;
    renderContribution();
    updateBuyFooter();
    return;
  }

  let solUsdPrice = null;
  if (state.asset === "SOL") {
    try {
      solUsdPrice = await solUsdOracle.getSolUsdPrice();
    } catch {
      solUsdPrice = null;
    }
  }

  if (requestId !== quoteRequestId) return;

  state.solUsdPrice = solUsdPrice;
  state.quote = createQuote({
    asset: state.asset,
    amount,
    clickPriceUsd: getCurrentClickPrice(),
    solUsdPrice
  });

  renderContribution();
  updateBuyFooter();
}

function renderStepIndicator() {
  el.stepItems.forEach((item) => {
    const step = Number(item.dataset.step);
    item.classList.toggle("is-active", step === state.step);
    item.classList.toggle("is-complete", step < state.step);
    if (step === state.step) {
      item.setAttribute("aria-current", "step");
    } else {
      item.removeAttribute("aria-current");
    }
  });
}

function showStep(step, { focus = true } = {}) {
  state.step = Math.min(5, Math.max(1, step));

  el.buyPanels.forEach((panel) => {
    const panelStep = Number(panel.dataset.step);
    panel.hidden = panelStep !== state.step;
  });

  renderStepIndicator();
  renderContribution();
  renderWalletOptions();
  updateBuyFooter();

  if (focus) {
    const panel = el.buyPanels.find((item) => Number(item.dataset.step) === state.step);
    const heading = panel?.querySelector("h3");
    if (heading) {
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    }
  }
}

function updateBuyFooter() {
  if (!el.buyBack || !el.buyNext) return;

  el.buyBack.hidden = state.step === 1;
  el.buyBack.textContent = t("buy_back");

  if (state.step === 5) {
    el.buyNext.hidden = false;
    el.buyNext.disabled = true;
    el.buyNext.textContent = t("confirm_disabled");
    return;
  }

  el.buyNext.hidden = false;
  el.buyNext.textContent = t("buy_continue");

  if (state.step === 2) {
    el.buyNext.disabled = !state.wallet;
  } else if (state.step === 3) {
    el.buyNext.disabled = !(state.quote?.ok);
  } else {
    el.buyNext.disabled = false;
  }
}

function setAsset(asset) {
  if (!offeringConfig.acceptedAssets.includes(asset)) return;
  state.asset = asset;
  document.querySelectorAll('input[name="payment-asset"]').forEach((input) => {
    input.checked = input.value === asset;
  });
  refreshQuote();
}

function resetBuyFlow() {
  state.step = 1;
  state.asset = "USDC";
  state.amount = null;
  state.amountTouched = false;
  state.quote = null;
  state.solUsdPrice = null;
  quoteRequestId += 1;

  document.querySelectorAll('input[name="payment-asset"]').forEach((input) => {
    input.checked = input.value === "USDC";
  });
  if (el.contributionInput) el.contributionInput.value = "";
  if (el.walletFeedback) el.walletFeedback.textContent = "";
  if (el.contributionError) {
    el.contributionError.textContent = "";
    el.contributionError.hidden = true;
  }
  showStep(1, { focus: false });
  renderWalletOptions();
  renderContribution();
}

function openBuyDialog() {
  if (!el.buyDialog) return;
  renderWalletOptions();
  resetBuyFlow();
  el.buyDialog.showModal();
  document.body.classList.add("modal-open");
  const closeButton = el.buyDialog.querySelector("[data-close-buy]");
  closeButton?.focus({ preventScroll: true });
}

function closeBuyDialog() {
  if (!el.buyDialog?.open) return;
  el.buyDialog.close();
}

function handleBuyNext() {
  if (state.step === 5) return;
  if (state.step === 2 && !state.wallet) return;
  if (state.step === 3 && !state.quote?.ok) return;
  showStep(state.step + 1);
}

function handleBuyBack() {
  if (state.step <= 1) return;
  showStep(state.step - 1);
}

function setupBuyDialog() {
  el.buyOpeners.forEach((button) => button.addEventListener("click", openBuyDialog));

  document.querySelectorAll("[data-close-buy]").forEach((button) => {
    button.addEventListener("click", closeBuyDialog);
  });

  if (el.buyDialog) {
    el.buyDialog.addEventListener("close", () => {
      document.body.classList.remove("modal-open");
    });
    el.buyDialog.addEventListener("click", (event) => {
      if (event.target === el.buyDialog) closeBuyDialog();
    });
  }

  if (el.legalDialog) {
    el.legalDialog.addEventListener("close", () => {
      if (!el.buyDialog?.open) document.body.classList.remove("modal-open");
    });
    el.legalDialog.addEventListener("click", (event) => {
      if (event.target === el.legalDialog) el.legalDialog.close();
    });
  }

  document.querySelectorAll("[data-legal-doc]").forEach((button) => {
    button.addEventListener("click", () => {
      const type = button.dataset.legalDoc;
      const titleKey = type === "terms" ? "terms_title" : "privacy_title";
      const bodyKey = type === "terms" ? "terms_body" : "privacy_body";
      if (el.legalTitle) el.legalTitle.textContent = t(titleKey);
      if (el.legalBody) el.legalBody.textContent = t(bodyKey);
      el.legalDialog?.showModal();
      document.body.classList.add("modal-open");
      el.legalDialog?.querySelector("[data-close-legal]")?.focus({ preventScroll: true });
    });
  });

  document.querySelectorAll("[data-close-legal]").forEach((button) => {
    button.addEventListener("click", () => el.legalDialog?.close());
  });

  el.buyBack?.addEventListener("click", handleBuyBack);
  el.buyNext?.addEventListener("click", handleBuyNext);

  document.querySelectorAll('input[name="payment-asset"]').forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) setAsset(input.value);
    });
  });

  el.contributionInput?.addEventListener("input", () => {
    const raw = el.contributionInput.value.trim();
    const parsed = Number.parseFloat(raw);
    state.amountTouched = raw.length > 0;
    state.amount = Number.isFinite(parsed) ? parsed : null;
    refreshQuote();
  });

  document.querySelectorAll("[data-wallet-connect]").forEach((button) => {
    button.addEventListener("click", async () => {
      const walletId = button.dataset.walletConnect;
      if (el.walletFeedback) el.walletFeedback.textContent = "";
      button.disabled = true;
      try {
        state.wallet = await connectWallet(walletId);
        if (el.walletFeedback) {
          el.walletFeedback.textContent = t("wallet_connected_as", {
            address: shortenAddress(state.wallet.publicKey)
          });
        }
      } catch (error) {
        if (el.walletFeedback) {
          el.walletFeedback.textContent =
            error.message === "WALLET_NOT_DETECTED" ? t("wallet_not_detected") : t("error_wallet");
        }
      } finally {
        renderWalletOptions();
        updateBuyFooter();
      }
    });
  });

  el.walletDisconnect?.addEventListener("click", async () => {
    await disconnectWallet(state.wallet);
    state.wallet = null;
    if (el.walletFeedback) el.walletFeedback.textContent = "";
    renderWalletOptions();
    updateBuyFooter();
  });

  el.walletSkip?.addEventListener("click", () => showStep(3));
}

function setupMenu() {
  if (!el.menuToggle || !el.mobileNav) return;

  const updateMenuLabel = () => {
    const open = el.mobileNav.classList.contains("is-open");
    el.menuToggle.setAttribute(
      "aria-label",
      t(open ? "nav_menu_close" : "nav_menu_open")
    );
    el.menuToggle.setAttribute("aria-expanded", String(open));
  };

  const closeMenu = () => {
    el.mobileNav.classList.remove("is-open");
    document.body.classList.remove("menu-open");
    updateMenuLabel();
  };

  el.menuToggle.addEventListener("click", () => {
    el.mobileNav.classList.toggle("is-open");
    updateMenuLabel();
    document.body.classList.toggle("menu-open", el.mobileNav.classList.contains("is-open"));
  });

  el.mobileNav.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 900) closeMenu();
  });

  document.addEventListener("languagechange", updateMenuLabel);
  updateMenuLabel();
}

function setupLanguageSelects() {
  document.querySelectorAll(".lang-select").forEach((select) => {
    select.addEventListener("change", () => {
      setLanguage(select.value);
    });
  });
}

function setupHeaderScroll() {
  if (!el.siteHeader) return;
  const update = () => {
    el.siteHeader.classList.toggle("is-scrolled", window.scrollY > 12);
  };
  update();
  window.addEventListener("scroll", update, { passive: true });
}

function setupReveal() {
  const sections = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    sections.forEach((section) => section.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  sections.forEach((section) => observer.observe(section));
}

async function renderDynamicContent() {
  renderHeroPrice();
  renderOfferingParameters();
  renderPriceSchedule();
  renderTokenomics();
  renderVesting();
  await renderSaleState();
  renderPriceSchedule();
  renderContribution();
  updateBuyFooter();
}

async function init() {
  cacheElements();
  setupMenu();
  setupLanguageSelects();
  setupBuyDialog();
  setupHeaderScroll();
  setupReveal();

  await initI18n();

  await renderDynamicContent();
  resetBuyFlow();

  document.addEventListener("languagechange", async () => {
    await renderDynamicContent();
    renderWalletOptions();
    if (el.contributionInput && el.contributionInput.value.trim() !== "") {
      await refreshQuote();
    }
  });
}

init().catch((error) => {
  console.error(error);
});
