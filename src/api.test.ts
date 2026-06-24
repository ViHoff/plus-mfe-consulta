import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  refreshAccessToken,
  secureFetch,
  RefreshTokenNotFoundError,
  InvalidRefreshTokenError,
  AuthServerUnreachableError,
} from "./api";

// Mock localStorage and fetch globally
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
  };
})();

Object.defineProperty(global, "localStorage", { value: localStorageMock });
global.fetch = vi.fn();

describe("Authentication API Helper Tests", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("refreshAccessToken", () => {
    it("should throw RefreshTokenNotFoundError if no refresh token is stored", async () => {
      await expect(refreshAccessToken()).rejects.toThrow(RefreshTokenNotFoundError);
    });

    it("should refresh the access token and store it on success", async () => {
      localStorage.setItem("refresh_token", "valid_refresh");
      
      const mockResponse = {
        access_token: "new_access_token",
        refresh_token: "new_refresh_token",
        token_type: "bearer"
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const token = await refreshAccessToken();
      expect(token).toBe("new_access_token");
      expect(localStorage.setItem).toHaveBeenCalledWith("access_token", "new_access_token");
      expect(localStorage.setItem).toHaveBeenCalledWith("refresh_token", "new_refresh_token");
    });

    it("should throw InvalidRefreshTokenError on non-ok response status", async () => {
      localStorage.setItem("refresh_token", "expired_refresh");

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ detail: "Token expirado" }),
      });

      await expect(refreshAccessToken()).rejects.toThrow(InvalidRefreshTokenError);
    });

    it("should throw AuthServerUnreachableError if fetch fails entirely (network offline)", async () => {
      localStorage.setItem("refresh_token", "any_token");

      (global.fetch as any).mockRejectedValueOnce(new Error("Network failed"));

      await expect(refreshAccessToken()).rejects.toThrow(AuthServerUnreachableError);
    });
  });

  describe("secureFetch", () => {
    it("should fetch successfully with bearer token when token is valid", async () => {
      localStorage.setItem("access_token", "valid_access");

      (global.fetch as any).mockResolvedValueOnce({
        status: 200,
        ok: true,
      });

      const response = await secureFetch("http://localhost:3067/data");
      expect(response.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:3067/data",
        expect.objectContaining({
          headers: expect.any(Headers)
        })
      );
    });

    it("should auto-refresh token and retry on 401 Unauthorized", async () => {
      localStorage.setItem("access_token", "expired_access");
      localStorage.setItem("refresh_token", "valid_refresh");

      // 1st call (GET to resource) -> 401 Unauthorized
      (global.fetch as any).mockResolvedValueOnce({
        status: 401,
        ok: false,
      });

      // 2nd call (POST to refresh) -> 200 OK with new tokens
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "new_access",
          refresh_token: "new_refresh",
          token_type: "bearer",
        }),
      });

      // 3rd call (GET to resource retry) -> 200 OK
      (global.fetch as any).mockResolvedValueOnce({
        status: 200,
        ok: true,
      });

      const response = await secureFetch("http://localhost:3067/data");
      
      expect(response.status).toBe(200);
      expect(localStorage.setItem).toHaveBeenCalledWith("access_token", "new_access");
      expect(global.fetch).toHaveBeenCalledTimes(3); // Initial fetch -> refresh -> retry fetch
    });

    it("should clear localStorage and propagate error when refresh fails during a 401", async () => {
      localStorage.setItem("access_token", "expired_access");
      localStorage.setItem("refresh_token", "invalid_refresh");

      // 1st call (GET to resource) -> 401 Unauthorized
      (global.fetch as any).mockResolvedValueOnce({
        status: 401,
        ok: false,
      });

      // 2nd call (POST to refresh) -> 401 Unauthorized
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ detail: "Invalid refresh token" }),
      });

      await expect(secureFetch("http://localhost:3067/data")).rejects.toThrow(InvalidRefreshTokenError);
      
      expect(localStorage.clear).toHaveBeenCalled();
    });
  });
});
