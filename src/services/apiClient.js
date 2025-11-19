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

const resolveApiBaseUrl = () => {
  const envBaseUrl = sanitizeBaseUrl(import.meta.env.VITE_API_BASE_URL);
  const inferredBaseUrl = sanitizeBaseUrl(inferDefaultBaseUrl());

  if (!envBaseUrl) {
    return inferredBaseUrl;
  }

  if (typeof window !== "undefined" && window.location) {
    const envUrl = new URL(envBaseUrl, window.location.origin);
    if (isLocalhostHostname(envUrl.hostname) && !isLocalhostHostname(window.location.hostname)) {
      // The app is being accessed from another device (non-localhost) but the
      // environment variable still points at localhost. Use the inferred base
      // URL so mobile clients call the same host that served the UI.
      return inferredBaseUrl;
    }
  }

  return envBaseUrl;
};

const API_BASE_URL = resolveApiBaseUrl();

async function request(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json", ...(options.headers || {}) }),
    },
    ...options,
  });

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
  return API_BASE_URL;
}
