const sanitizeBaseUrl = (value) => value?.replace(/\/$/, "");

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

  let primary = envBaseUrl || inferredBaseUrl;
  if (!primary) {
    primary = "http://localhost:8000/api";
  }

  let fallback;

  if (
    envBaseUrl &&
    inferredBaseUrl &&
    typeof window !== "undefined" &&
    window.location
  ) {
    try {
      const envUrl = new URL(envBaseUrl, window.location.origin);
      if (shouldMirrorUiHostname(envUrl.hostname, window.location.hostname)) {
        primary = inferredBaseUrl;
        if (envBaseUrl !== inferredBaseUrl) {
          fallback = envBaseUrl;
        }
      }
    } catch {
      /* ignore invalid URLs and fall back to the configured value */
    }
  }

  if (!fallback && inferredBaseUrl && inferredBaseUrl !== primary) {
    fallback = inferredBaseUrl;
  }

  if (!fallback && envBaseUrl && envBaseUrl !== primary) {
    fallback = envBaseUrl;
  }

  return { primary, fallback };
};

const { primary, fallback } = resolveApiBaseUrls();
let activeApiBaseUrl = primary;
let standbyApiBaseUrl = fallback;
const isDevEnvironment = Boolean(import.meta.env && import.meta.env.DEV);

if (isDevEnvironment) {
  const fallbackLabel = standbyApiBaseUrl
    ? ` (fallback: ${standbyApiBaseUrl})`
    : "";
  console.info(`[api] Using API base URL: ${activeApiBaseUrl}${fallbackLabel}`);
}

const isLikelyNetworkError = (error) =>
  error &&
  (error.name === "TypeError" ||
    /Network request failed/i.test(error.message || "") ||
    /Failed to fetch/i.test(error.message || ""));

const performRequest = async (baseUrl, path, options = {}) => {
  const url = `${baseUrl}${path}`;
  return fetch(url, {
    headers: {
      Accept: "application/json",
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json", ...(options.headers || {}) }),
    },
    ...options,
  });
};

async function request(path, options = {}) {
  const attemptFetch = async () => {
    const response = await performRequest(activeApiBaseUrl, path, options);

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

  try {
    return await attemptFetch();
  } catch (error) {
    if (standbyApiBaseUrl && isLikelyNetworkError(error)) {
      const previousBaseUrl = activeApiBaseUrl;
      const nextBaseUrl = standbyApiBaseUrl;
      standbyApiBaseUrl = null;
      activeApiBaseUrl = nextBaseUrl;
      if (isDevEnvironment) {
        console.warn(
          `Falling back to ${nextBaseUrl} after network error from ${previousBaseUrl}`
        );
      }
      return attemptFetch();
    }
    throw error;
  }
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
  return activeApiBaseUrl;
}
