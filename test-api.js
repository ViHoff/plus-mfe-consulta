const fs = require("fs");
const path = require("path");
const assert = require("assert");

// 1. Read api.ts and strip TypeScript type annotations to make it run in plain Node.js
const apiPath = path.join(__dirname, "src", "api.ts");
let tsCode = fs.readFileSync(apiPath, "utf8");

// Stripping type annotations and exports/imports via basic string cleanups
let jsCode = tsCode
  .replace(/export interface [\s\S]*?\n\}/g, "") // remove interfaces
  .replace(/: Promise<[^>]+>/g, "")
  .replace(/: string/g, "")
  .replace(/: RequestInit/g, "")
  .replace(/: Response/g, "")
  .replace(/: any/g, "")
  .replace(/: number/g, "")
  .replace(/: TokenResponse/g, "")
  .replace(/public /g, "")
  .replace(/private /g, "")
  .replace(/as any/g, "")
  .replace(/export /g, "")
  .replace(/import.meta.env/g, "{}");

// 2. Mock browser global environment
const localStorageStore = {};
global.Headers = class Headers {
  constructor(init) {
    this.map = {};
    if (init && init.map) {
      this.map = { ...init.map };
    }
  }
  set(key, val) {
    this.map[key.toLowerCase()] = val;
  }
  get(key) {
    return this.map[key.toLowerCase()] || null;
  }
};
global.localStorage = {
  getItem: (key) => localStorageStore[key] || null,
  setItem: (key, value) => {
    localStorageStore[key] = String(value);
  },
  clear: () => {
    for (const k in localStorageStore) {
      delete localStorageStore[k];
    }
  },
  removeItem: (key) => {
    delete localStorageStore[key];
  },
};

// 3. Evaluate the transpiled code into a context
const context = {};
const evaluator = new Function(
  "exports",
  jsCode +
    `
    exports.refreshAccessToken = refreshAccessToken;
    exports.secureFetch = secureFetch;
    exports.RefreshTokenNotFoundError = RefreshTokenNotFoundError;
    exports.InvalidRefreshTokenError = InvalidRefreshTokenError;
    exports.AuthServerUnreachableError = AuthServerUnreachableError;
  `
);
evaluator(context);

const {
  refreshAccessToken,
  secureFetch,
  RefreshTokenNotFoundError,
  InvalidRefreshTokenError,
  AuthServerUnreachableError,
} = context;

// 4. Test Suite Execution
async function runTests() {
  console.log("==========================================");
  console.log("RURRING API REFRESH & SECURE FETCH TESTS");
  console.log("==========================================\n");

  // Test 1: Refresh token missing
  localStorage.clear();
  try {
    await refreshAccessToken();
    assert.fail("Deveria ter lançado RefreshTokenNotFoundError");
  } catch (err) {
    assert.strictEqual(err.name, "RefreshTokenNotFoundError");
    console.log("✅ Test 1: Lançou RefreshTokenNotFoundError quando o refresh token estava ausente.");
  }

  // Test 2: Successful fetch using valid token
  localStorage.clear();
  localStorage.setItem("access_token", "valid_access");
  global.fetch = async (url, init) => {
    assert.strictEqual(init.headers.get("Authorization"), "Bearer valid_access");
    return { status: 200, ok: true };
  };
  const res = await secureFetch("http://localhost:3067/test");
  assert.strictEqual(res.status, 200);
  console.log("✅ Test 2: secureFetch enviou o token Bearer correto e retornou status 200.");

  // Test 3: Auto refresh token and retry on 401
  localStorage.clear();
  localStorage.setItem("access_token", "expired_access");
  localStorage.setItem("refresh_token", "valid_refresh");

  let fetchCalls = 0;
  global.fetch = async (url, init) => {
    fetchCalls++;
    if (fetchCalls === 1) {
      assert.strictEqual(init.headers.get("Authorization"), "Bearer expired_access");
      return { status: 401, ok: false };
    }
    if (fetchCalls === 2) {
      assert.ok(url.endsWith("/auth/refresh"));
      const body = JSON.parse(init.body);
      assert.strictEqual(body.refresh_token, "valid_refresh");
      return {
        ok: true,
        json: async () => ({
          access_token: "new_access",
          refresh_token: "new_refresh",
          token_type: "bearer",
        }),
      };
    }
    if (fetchCalls === 3) {
      assert.strictEqual(init.headers.get("Authorization"), "Bearer new_access");
      return { status: 200, ok: true };
    }
  };

  const res3 = await secureFetch("http://localhost:3067/test");
  assert.strictEqual(res3.status, 200);
  assert.strictEqual(localStorage.getItem("access_token"), "new_access");
  assert.strictEqual(localStorage.getItem("refresh_token"), "new_refresh");
  console.log("✅ Test 3: secureFetch renovou o token após 401 e repetiu a chamada com sucesso.");

  // Test 4: Clear storage on refresh failure
  localStorage.clear();
  localStorage.setItem("access_token", "expired_access");
  localStorage.setItem("refresh_token", "invalid_refresh");

  fetchCalls = 0;
  global.fetch = async (url, init) => {
    fetchCalls++;
    if (fetchCalls === 1) return { status: 401, ok: false };
    if (fetchCalls === 2) {
      return {
        status: 401,
        ok: false,
        json: async () => ({ detail: "Refresh token inválido" }),
      };
    }
  };

  try {
    await secureFetch("http://localhost:3067/test");
    assert.fail("Deveria ter falhado no refresh");
  } catch (err) {
    assert.strictEqual(err.name, "InvalidRefreshTokenError");
    assert.strictEqual(localStorage.getItem("access_token"), null);
    assert.strictEqual(localStorage.getItem("refresh_token"), null);
    console.log("✅ Test 4: Limpou o localStorage e lançou InvalidRefreshTokenError quando o refresh falhou.");
  }

  console.log("\n🎉 TODOS OS TESTES PASSARAM COM SUCESSO!");
}

runTests().catch((err) => {
  console.error("❌ Um dos testes falhou:", err);
  process.exit(1);
});
