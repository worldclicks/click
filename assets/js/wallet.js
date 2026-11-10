function getPhantomProvider() {
  if (window.phantom?.solana?.isPhantom) return window.phantom.solana;
  if (window.solana?.isPhantom) return window.solana;
  return null;
}

function getSolflareProvider() {
  if (window.solflare?.isSolflare) return window.solflare;
  return null;
}

function getProvider(walletId) {
  if (walletId === "phantom") return getPhantomProvider();
  if (walletId === "solflare") return getSolflareProvider();
  return null;
}

export function getAvailableWallets() {
  return [
    { id: "phantom", name: "Phantom", available: Boolean(getPhantomProvider()) },
    { id: "solflare", name: "Solflare", available: Boolean(getSolflareProvider()) },
    {
      id: "walletconnect",
      name: "WalletConnect",
      available: false,
      reason: "WALLETCONNECT_SDK_REQUIRED"
    }
  ];
}

export async function connectWallet(walletId) {
  const provider = getProvider(walletId);
  if (!provider) {
    throw new Error("WALLET_NOT_DETECTED");
  }

  const response = await provider.connect();
  const publicKey =
    provider.publicKey?.toString?.() ?? response?.publicKey?.toString?.() ?? null;

  if (!publicKey) {
    throw new Error("WALLET_CONNECTION_FAILED");
  }

  return { id: walletId, publicKey, provider };
}

export async function disconnectWallet(connection) {
  if (!connection?.provider?.disconnect) return;
  try {
    await connection.provider.disconnect();
  } catch {
    // The wallet may already be disconnected. The UI state is cleared regardless.
  }
}

export function shortenAddress(address) {
  if (typeof address !== "string" || address.length < 10) return address ?? "";
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}
