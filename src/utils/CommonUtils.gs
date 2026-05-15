/**
 * src/utils/CommonUtils.gs
 * Shared utilities for URL normalization, hashing, and retry logic.
 */

const CommonUtils = {
  normalizeUrl: function (url) {
    if (!url) return "";

    const rawUrl = String(url).trim();
    if (!rawUrl) return "";

    try {
      const parsedUrl = new URL(rawUrl);
      parsedUrl.hash = "";

      const removableParams = [
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_term",
        "utm_content",
        "fbclid",
        "gclid",
        "mc_cid",
        "mc_eid",
      ];

      removableParams.forEach((param) => parsedUrl.searchParams.delete(param));

      const sortedParams = Array.from(parsedUrl.searchParams.entries()).sort(
        ([leftKey, leftValue], [rightKey, rightValue]) => {
          const keyComparison = leftKey.localeCompare(rightKey);
          if (keyComparison !== 0) return keyComparison;
          return String(leftValue).localeCompare(String(rightValue));
        },
      );

      parsedUrl.search = "";
      sortedParams.forEach(([key, value]) =>
        parsedUrl.searchParams.append(key, value),
      );
      parsedUrl.hostname = parsedUrl.hostname.toLowerCase();

      return parsedUrl.toString().replace(/\/$/, "");
    } catch (e) {
      return rawUrl.replace(/#.*$/, "").replace(/\/$/, "");
    }
  },

  computeHash: function (text) {
    const value = String(text || "");
    const bytes = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      value,
      Utilities.Charset.UTF_8,
    );

    return bytes
      .map((byte) => {
        const unsignedByte = byte < 0 ? byte + 256 : byte;
        return unsignedByte.toString(16).padStart(2, "0");
      })
      .join("");
  },

  retryRequest: function (fn, retries, backoffMs) {
    const attempts = Math.max(1, Number(retries) || 1);
    const initialDelay = Math.max(0, Number(backoffMs) || 0);
    let lastError = null;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return fn(attempt);
      } catch (error) {
        lastError = error;
        if (attempt < attempts && initialDelay > 0) {
          const waitTime = initialDelay * Math.pow(2, attempt - 1);
          Utilities.sleep(waitTime);
        }
      }
    }

    throw lastError;
  },
};
