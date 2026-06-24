/**
 * Response structure returned by the /auth/refresh endpoint.
 */
export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
}

/**
 * Error thrown when the refresh token is missing from localStorage.
 */
export class RefreshTokenNotFoundError extends Error {
  constructor(message: string = "Refresh token not found in localStorage.") {
    super(message);
    this.name = "RefreshTokenNotFoundError";
  }
}

/**
 * Error thrown when the authentication server is offline or unreachable.
 */
export class AuthServerUnreachableError extends Error {
  constructor(message: string = "Authentication server is not responding. Please check if the auth service is running.") {
    super(message);
    this.name = "AuthServerUnreachableError";
  }
}

/**
 * Error thrown when the auth server rejects the refresh token (e.g. expired or invalid).
 */
export class InvalidRefreshTokenError extends Error {
  public status: number;
  public details: any;

  constructor(message: string = "Refresh token is expired or invalid.", status: number = 401, details: any = null) {
    super(message);
    this.name = "InvalidRefreshTokenError";
    this.status = status;
    this.details = details;
  }
}

/**
 * Refreshes the access token using the stored refresh token.
 * 
 * This function:
 * 1. Retrieves the refresh token from localStorage.
 * 2. Calls the auth refresh endpoint (default: http://localhost:3001/auth/refresh).
 * 3. Updates the access token (and refresh token, if a new one is returned) in localStorage.
 * 4. Handles specific error states: missing token, server down, or invalid/expired token.
 * 
 * @param baseUrl Base URL of the authentication microservice. Defaults to "http://localhost:3001".
 * @returns The newly received access token.
 */
/**
 * Performs a silent login using the seeded admin developer credentials.
 * This is used to initialize the frontend with valid tokens without requiring manual user login.
 * 
 * @param baseUrl Base URL of the authentication microservice.
 * @returns The new access token.
 */
async function silentLogin(baseUrl: string): Promise<string> {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: "admindev@admin.com",
      password: "Senha123"
    }),
  });

  if (!response.ok) {
    throw new Error("Silent autologin failed: credentials invalid or auth server down.");
  }

  const data = await response.json();
  if (!data.access_token) {
    throw new Error("Invalid response from auth server during silent login.");
  }

  localStorage.setItem("access_token", data.access_token);
  if (data.refresh_token) {
    localStorage.setItem("refresh_token", data.refresh_token);
  }

  return data.access_token;
}

/**
 * Refreshes the access token using the stored refresh token.
 * 
 * This function:
 * 1. Retrieves the refresh token from localStorage.
 * 2. Calls the auth refresh endpoint (default: http://localhost:3001/auth/refresh).
 * 3. Updates the access token (and refresh token, if a new one is returned) in localStorage.
 * 4. Handles specific error states: missing token, server down, or invalid/expired token.
 * 
 * @param baseUrl Base URL of the authentication microservice. Defaults to "http://localhost:3001".
 * @returns The newly received access token.
 */
export async function refreshAccessToken(
  baseUrl: string = "http://localhost:3001"
): Promise<string> {
  // 1. Retrieve the refresh token from localStorage
  const refreshToken = localStorage.getItem("refresh_token");

  // If no refresh token exists, perform a silent autologin to fetch a new set of tokens.
  if (!refreshToken) {
    return await silentLogin(baseUrl);
  }

  let response: Response;

  // 2. Fetch the refresh endpoint from auth by passing the refresh token
  try {
    response = await fetch(`${baseUrl}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  } catch (error: any) {
    // Handle error: auth server not responding (network or connection error)
    throw new AuthServerUnreachableError(
      `Auth server is unreachable: ${error?.message || error}`
    );
  }

  // Handle error: refresh token is expired, invalid, or server returned other error code
  if (!response.ok) {
    // If the refresh token is expired/invalid, try a silent autologin fallback
    try {
      return await silentLogin(baseUrl);
    } catch {
      let errorDetail = "Refresh token is expired or invalid.";
      let details = null;
      try {
        details = await response.json();
        if (details && details.detail) {
          errorDetail = details.detail;
        }
      } catch {
        // Response was not JSON
      }
      throw new InvalidRefreshTokenError(errorDetail, response.status, details);
    }
  }

  const data: TokenResponse = await response.json();

  if (!data.access_token) {
    throw new Error("Invalid response from auth server: access_token is missing.");
  }

  // 3. Store the received access token in localStorage
  localStorage.setItem("access_token", data.access_token);

  // Also update the refresh token if the server returned a new one
  if (data.refresh_token) {
    localStorage.setItem("refresh_token", data.refresh_token);
  }

  return data.access_token;
}

/**
 * Makes a secure GET fetch request to the specified endpoint using the stored access token.
 * Passes the access token in the Authorization header as a Bearer token.
 * 
 * If the request fails with a 401 Unauthorized status (suggesting the token is expired),
 * it attempts to refresh the access token. If the refresh is successful, it retries
 * the request once. If the refresh flow fails, it clears localStorage and throws the error.
 * 
 * @param url The endpoint URL to fetch.
 * @param options Custom fetch options (optional).
 * @param authBaseUrl The base URL for the auth service. Defaults to http://localhost:3001.
 * @returns A Promise that resolves to the fetch Response.
 */
export async function secureFetch(
  url: string,
  options: RequestInit = {},
  authBaseUrl: string = "http://localhost:3001"
): Promise<Response> {
  const requestOptions: RequestInit = {
    ...options,
    method: options.method || "GET",
  };

  // Get the token and attach it as Bearer. 
  // If no token exists, attempt to run the refresh flow (which triggers silent autologin).
  let accessToken = localStorage.getItem("access_token") || "";
  if (!accessToken) {
    try {
      accessToken = await refreshAccessToken(authBaseUrl);
    } catch (err) {
      console.warn("Could not retrieve initial access token silently:", err);
    }
  }

  const headers = new Headers(requestOptions.headers);
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  requestOptions.headers = headers;

  let response: Response;
  try {
    response = await fetch(url, requestOptions);
  } catch (error) {
    // Propagate network-level errors directly
    throw error;
  }

  // If the access token is expired/invalid (401 Unauthorized)
  if (response.status === 401) {
    try {
      // Attempt to refresh the access token (which will fall back to silentLogin if needed)
      const newAccessToken = await refreshAccessToken(authBaseUrl);
      
      // Update authorization header with the new access token
      const retryHeaders = new Headers(requestOptions.headers);
      retryHeaders.set("Authorization", `Bearer ${newAccessToken}`);
      requestOptions.headers = retryHeaders;
      
      // Retry the fetch request
      response = await fetch(url, requestOptions);
    } catch (refreshError) {
      // If the refresh flow fails (e.g. missing token, invalid/expired refresh token, or server unreachable), clear localStorage
      localStorage.clear();
      throw refreshError;
    }
  }

  return response;
}

