const DEFAULT_BASE_URL = "http://localhost:8000/api";
const UI_PROXY_BASE = "/api";
const REQUEST_TIMEOUT_MS = 8000;

const sanitizeBaseUrl = (value) => value?.replace(/\/$/, "");

const trackCandidate = (collector, candidate) => {
  const sanitized = sanitizeBaseUrl(candidate);
  if (!sanitized || collector.set.has(sanitized)) {
    return;
  }
  collector.set.add(sanitized);
  collector.values.push(sanitized);
};

const inferDefaultBaseUrl = () => {
  if (typeof window === "undefined" || !window.location) {
    return "http://localhost:8000/api";
  }

  const { protocol, hostname, port } = window.location;
  const normalizedProtocol = protocol || "http:";
  const normalizedHost = hostname || "localhost";

  const portOverrides = {
    "5173": "8000",
    "4173": "8000",
    "5174": "8000",
    "3000": "8000",
  };

  let targetPort = portOverrides[port] || port || "";
  if (targetPort === "80" || targetPort === "443") {
    targetPort = "";
  }

  const portSegment = targetPort ? `:${targetPort}` : "";
  return `${normalizedProtocol}//${normalizedHost}${portSegment}/api`;
};

const isLocalhostHostname = (hostname) =>
  ["localhost", "127.0.0.1", "[::1]"].includes(hostname?.toLowerCase?.() ?? "");

const isPrivateNetworkHostname = (hostname) => {
  const normalized = hostname?.toLowerCase?.() ?? "";
  if (!normalized) {
    return false;
  }
  if (isLocalhostHostname(normalized)) {
    return true;
  }
  return (
    /^10\./.test(normalized) ||
    /^192\.168\./.test(normalized) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(normalized)
  );
};

const shouldMirrorUiHostname = (envHostname, currentHostname) => {
  if (!currentHostname || isLocalhostHostname(currentHostname)) {
    return false;
  }
  if (!envHostname || envHostname === currentHostname) {
    return false;
  }
  return isPrivateNetworkHostname(envHostname);
};

const resolveApiBaseUrls = () => {
  const envBaseUrl = sanitizeBaseUrl(import.meta.env.VITE_API_BASE_URL);
  const inferredBaseUrl = sanitizeBaseUrl(inferDefaultBaseUrl());
  const relativeBaseUrl =
    typeof window !== "undefined" && window.location ? UI_PROXY_BASE : null;

  let preferredBase = envBaseUrl || inferredBaseUrl || DEFAULT_BASE_URL;

  if (
    envBaseUrl &&
    inferredBaseUrl &&
    typeof window !== "undefined" &&
    window.location
  ) {
    try {
      const envUrl = new URL(envBaseUrl, window.location.origin);
      if (shouldMirrorUiHostname(envUrl.hostname, window.location.hostname)) {
        preferredBase = inferredBaseUrl || relativeBaseUrl || DEFAULT_BASE_URL;
      }
    } catch {
      /* ignore invalid URLs and fall back to the configured value */
    }
  }

  const collector = { set: new Set(), values: [] };
  trackCandidate(collector, preferredBase);
  trackCandidate(collector, inferredBaseUrl);
  trackCandidate(collector, envBaseUrl);
  trackCandidate(collector, relativeBaseUrl);
  trackCandidate(collector, DEFAULT_BASE_URL);

  return collector.values.length > 0 ? collector.values : [DEFAULT_BASE_URL];
};

const apiBaseUrls = resolveApiBaseUrls();
let activeBaseUrlIndex = 0;
const isDevEnvironment = Boolean(import.meta.env && import.meta.env.DEV);

if (isDevEnvironment) {
  const priorityMessage = apiBaseUrls
    .map((url, index) => `${index === activeBaseUrlIndex ? "*" : "-"} ${url}`)
    .join("\n  ");
  console.info(`[api] Base URL priority:\n  ${priorityMessage}`);
}

const isLikelyNetworkError = (error) =>
  error &&
  (error.name === "TypeError" ||
    error.name === "AbortError" ||
    /Network request failed/i.test(error.message || "") ||
    /Failed to fetch/i.test(error.message || ""));

const performRequest = async (baseUrl, path, options = {}) => {
  const { timeout, headers: customHeaders, ...restOptions } = options;
  const headers = {
    Accept: "application/json",
    ...(restOptions.body instanceof FormData
      ? {}
      : { "Content-Type": "application/json" }),
    ...(customHeaders || {}),
  };

  const fetchOptions = {
    ...restOptions,
    headers,
  };

  let controller;
  let timeoutId;
  const resolvedTimeout =
    typeof timeout === "number" ? timeout : REQUEST_TIMEOUT_MS;

  if (typeof fetchOptions.signal === "undefined" && resolvedTimeout > 0) {
    controller = new AbortController();
    fetchOptions.signal = controller.signal;
    timeoutId = setTimeout(() => controller.abort(), resolvedTimeout);
  }

  try {
    return await fetch(`${baseUrl}${path}`, fetchOptions);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

const parseResponse = async (response) => {
  if (!response.ok) {
    let errorDetail = `Request failed with status ${response.status}`;
    try {
      const data = await response.json();
      if (data?.detail) {
        errorDetail = Array.isArray(data.detail)
          ? data.detail.map((item) => item.msg || item).join(", ")
          : data.detail;
      }
    } catch {
      /* ignore JSON parsing errors */
    }
    throw new Error(errorDetail);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
};

async function request(path, options = {}) {
  const candidateOrder = [];
  for (let i = 0; i < apiBaseUrls.length; i += 1) {
    const index = (activeBaseUrlIndex + i) % apiBaseUrls.length;
    if (!candidateOrder.includes(index)) {
      candidateOrder.push(index);
    }
  }

  let lastError = null;

  for (let i = 0; i < candidateOrder.length; i += 1) {
    const index = candidateOrder[i];
    const baseUrl = apiBaseUrls[index];
    try {
      const response = await performRequest(baseUrl, path, options);
      const data = await parseResponse(response);
      if (activeBaseUrlIndex !== index && isDevEnvironment) {
        console.info(`[api] Switched active API base to ${baseUrl}`);
      }
      activeBaseUrlIndex = index;
      return data;
    } catch (error) {
      lastError = error;
      const hasAlternatives = i < candidateOrder.length - 1;
      if (!isLikelyNetworkError(error) || !hasAlternatives) {
        throw error;
      }
      if (isDevEnvironment) {
        const nextBaseUrl = apiBaseUrls[candidateOrder[i + 1]];
        console.warn(
          `[api] ${baseUrl} failed (${error.message}). Retrying with ${nextBaseUrl}.`
        );
      }
    }
  }

  throw lastError || new Error("All API hosts failed");
}

export const apiClient = {
  get(path) {
    return request(path, { method: "GET" });
  },
  post(path, body) {
    return request(path, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  patch(path, body) {
    return request(path, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },
  delete(path) {
    return request(path, { method: "DELETE" });
  },
  postForm(path, formData) {
    return request(path, {
      method: "POST",
      body: formData,
    });
  },
};

export function getApiBaseUrl() {
  return apiBaseUrls[activeBaseUrlIndex] || DEFAULT_BASE_URL;
}
