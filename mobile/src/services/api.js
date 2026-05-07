import { config } from "../config";

function makeQuery(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    if (Array.isArray(value)) value.forEach((item) => search.append(key, item));
    else search.append(key, value);
  });
  const query = search.toString();
  return query ? `?${query}` : "";
}

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export function createApi(getToken) {
  async function request(path, options = {}) {
    const token = await getToken();
    const headers = {
      Accept: "application/json",
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    };

    const response = await fetch(`${config.backendUrl}${path}`, {
      ...options,
      headers,
      body:
        options.body && !(options.body instanceof FormData)
          ? JSON.stringify(options.body)
          : options.body
    });

    const text = await response.text();
    const body = text ? JSON.parse(text) : null;
    if (!response.ok) {
      throw new ApiError(body?.error?.message || body?.error || body?.message || "Request failed", response.status, body);
    }
    return body;
  }

  return {
    get: (path, params) => request(`${path}${makeQuery(params)}`),
    post: (path, body) => request(path, { method: "POST", body }),
    put: (path, body) => request(path, { method: "PUT", body }),
    patch: (path, body) => request(path, { method: "PATCH", body }),
    del: (path) => request(path, { method: "DELETE" })
  };
}
