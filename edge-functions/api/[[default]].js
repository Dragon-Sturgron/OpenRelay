const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
  "access-control-allow-headers": "Authorization,Content-Type,X-OpenRelay-Admin",
};

const PROVIDERS_INDEX = "providers_index";
const MODELS_INDEX = "models_index";
const GATEWAY_KEYS_INDEX = "gateway_keys_index";
const MODEL_CACHE_TTL_MS = 15 * 60 * 1000;
const APP_VERSION = "0.2.0";
const PASSWORD_KEY_CONTEXT = "OpenRelay:v0.1.3:provider-key-encryption";

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...CORS_HEADERS, ...extraHeaders },
  });
}

function secretJson(data, status = 200) {
  return json(data, status, {
    "cache-control": "no-store, no-cache, must-revalidate, max-age=0",
    pragma: "no-cache",
    expires: "0",
    "x-content-type-options": "nosniff",
  });
}

function withCors(response) {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function error(code, message, status = 400, details) {
  return json({ error: { code, message, ...(details === undefined ? {} : { details }) } }, status);
}

function getEnv(context, name) {
  return context?.env?.[name] ?? undefined;
}

function getKV(context) {
  // EdgeOne Makers injects a bound KV namespace as a global variable.
  // context.env fallback is kept for local/compatible runtimes.
  if (context?.env?.OPENRELAY_KV?.get) return context.env.OPENRELAY_KV;
  if (typeof OPENRELAY_KV !== "undefined" && OPENRELAY_KV?.get) return OPENRELAY_KV;
  throw new Error("KV_NOT_BOUND: bind a KV namespace with variable name OPENRELAY_KV");
}

function id(prefix) {
  const raw = crypto.randomUUID().replaceAll("-", "");
  return `${prefix}${raw}`;
}

function kvKey(prefix, value) {
  // EdgeOne KV keys accept letters, digits and underscore only.
  const safe = String(value).replace(/[^A-Za-z0-9_]/g, "_");
  return `${prefix}_${safe}`;
}

async function kvGetJson(kv, key, fallback = null) {
  const value = await kv.get(key);
  if (!value) return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}

async function kvPutJson(kv, key, value) {
  await kv.put(key, JSON.stringify(value));
}

async function listIds(kv, key) {
  const value = await kvGetJson(kv, key, []);
  return Array.isArray(value) ? value : [];
}

async function saveIds(kv, key, ids) {
  await kvPutJson(kv, key, [...new Set(ids)]);
}

function bytesToBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function getOpenRelayPassword(context) {
  const password = getEnv(context, "OPENRELAY_PASSWORD");
  if (!password) throw new Error("OPENRELAY_PASSWORD is not configured");
  if (String(password).length < 12) throw new Error("OPENRELAY_PASSWORD must be at least 12 characters");
  return String(password);
}

let cachedDerivedPassword = null;
let cachedEncryptionKeyPromise = null;

// EdgeOne Edge Functions have a tight CPU budget. A high-iteration PBKDF2
// is unnecessarily expensive here and can fail on some edge runtimes.
// OpenRelay therefore derives a deterministic 256-bit AES key by hashing
// a domain-separated context together with the user-supplied strong password.
// Use a long, unique, high-entropy OPENRELAY_PASSWORD.
async function importPasswordDerivedKey(context) {
  const password = getOpenRelayPassword(context);
  if (cachedEncryptionKeyPromise && cachedDerivedPassword === password) return cachedEncryptionKeyPromise;

  cachedDerivedPassword = password;
  cachedEncryptionKeyPromise = (async () => {
    try {
      const material = new TextEncoder().encode(`${PASSWORD_KEY_CONTEXT}\0${password}`);
      const digest = await crypto.subtle.digest("SHA-256", material);
      return await crypto.subtle.importKey(
        "raw",
        digest,
        { name: "AES-GCM" },
        false,
        ["encrypt", "decrypt"],
      );
    } catch (e) {
      throw new Error(`CRYPTO_KEY_DERIVATION_FAILED: ${e?.message || String(e)}`);
    }
  })();
  return cachedEncryptionKeyPromise;
}

async function encryptSecret(context, plaintext) {
  const key = await importPasswordDerivedKey(context);
  try {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = new TextEncoder().encode(plaintext);
    const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
    return {
      v: 3,
      alg: "AES-256-GCM",
      kdf: "SHA-256-CONTEXT",
      iv: bytesToBase64(iv),
      data: bytesToBase64(new Uint8Array(encrypted)),
    };
  } catch (e) {
    throw new Error(`CRYPTO_ENCRYPT_FAILED: ${e?.message || String(e)}`);
  }
}

async function decryptSecret(context, payload) {
  if (!payload?.iv || !payload?.data) throw new Error("Provider API key is not configured");
  if (payload.v && payload.v !== 3) throw new Error("Encrypted API key format is from OpenRelay v0.1.2 or older; please re-enter this provider API key once after upgrading to v0.1.3");
  const key = await importPasswordDerivedKey(context);
  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToBytes(payload.iv) },
      key,
      base64ToBytes(payload.data),
    );
    return new TextDecoder().decode(decrypted);
  } catch (e) {
    throw new Error(`CRYPTO_DECRYPT_FAILED: ${e?.message || String(e)}`);
  }
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(a, b) {
  a = String(a || "");
  b = String(b || "");
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

function bearer(request) {
  const h = request.headers.get("authorization") || "";
  return h.toLowerCase().startsWith("bearer ") ? h.slice(7).trim() : "";
}

function requireAdmin(context) {
  let expected;
  try { expected = getOpenRelayPassword(context); }
  catch (e) { return error("PASSWORD_NOT_CONFIGURED", e.message, 500); }
  const supplied = bearer(context.request) || context.request.headers.get("x-openrelay-admin") || "";
  if (!constantTimeEqual(supplied, expected)) return error("UNAUTHORIZED", "Invalid OpenRelay password", 401);
  return null;
}

async function requireGatewayKey(context, kv) {
  const token = bearer(context.request);
  if (!token) return error("UNAUTHORIZED", "Missing gateway API key", 401);
  const hash = await sha256Hex(token);
  const record = await kvGetJson(kv, kvKey("gateway_key", hash));
  if (!record || record.enabled === false) return error("UNAUTHORIZED", "Invalid gateway API key", 401);
  return null;
}

function providerPublic(provider) {
  if (!provider) return provider;
  const { encryptedApiKey, ...safe } = provider;
  return { ...safe, hasApiKey: Boolean(encryptedApiKey), apiKeyMasked: provider.apiKeyLast4 ? `••••${provider.apiKeyLast4}` : "" };
}

function normalizeBaseUrl(url) {
  return String(url || "").trim().replace(/\/+$/, "");
}

const SUPPORTED_PROVIDER_TYPES = [
  "openai",
  "anthropic",
  "gemini",
  "xai",
  "qwen",
  "deepseek",
  "glm",
  "doubao",
  "kimi",
  "custom",
  // Backward compatibility with OpenRelay <= v0.1.5.
  "openai_compatible",
];

function providerProtocol(type) {
  return type === "anthropic" ? "anthropic" : "openai";
}

function validateHttpUrl(value, field) {
  try {
    const u = new URL(value);
    if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error();
    return u.toString().replace(/\/$/, "");
  } catch {
    throw new Error(`${field} must be a valid http/https URL`);
  }
}

function providerHeaders(type, apiKey) {
  if (providerProtocol(type) === "anthropic") {
    return {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    };
  }
  return { authorization: `Bearer ${apiKey}`, "content-type": "application/json" };
}

function deriveModelsUrl(provider) {
  if (provider.modelsUrl) return provider.modelsUrl;
  return `${normalizeBaseUrl(provider.baseUrl)}/models`;
}

function extractModelArray(payload) {
  const candidates = [
    payload?.data,
    payload?.models,
    payload?.output?.models,
    payload?.output?.data,
    payload?.result?.models,
  ];
  for (const c of candidates) if (Array.isArray(c)) return c;
  return [];
}

function normalizeModels(payload) {
  const rows = extractModelArray(payload);
  const seen = new Set();
  const result = [];
  for (const row of rows) {
    const modelId = typeof row === "string" ? row : row?.id || row?.model || row?.name || row?.model_name;
    if (!modelId || seen.has(modelId)) continue;
    seen.add(modelId);
    result.push({
      id: modelId,
      name: row?.display_name || row?.displayName || row?.name || modelId,
      ownedBy: row?.owned_by || row?.ownedBy || row?.provider || "",
      created: row?.created_at || row?.created || null,
      capabilities: row?.capabilities || null,
    });
  }
  result.sort((a, b) => a.id.localeCompare(b.id));
  return result;
}

async function fetchProviderModels(context, provider) {
  const apiKey = await decryptSecret(context, provider.encryptedApiKey);
  const url = deriveModelsUrl(provider);
  const headers = providerHeaders(provider.type, apiKey);
  const response = await fetch(url, { method: "GET", headers });
  const text = await response.text();
  let payload;
  try { payload = JSON.parse(text); } catch { payload = { raw: text.slice(0, 1000) }; }
  if (!response.ok) {
    throw new Error(`Upstream ${response.status}: ${payload?.error?.message || payload?.message || text.slice(0, 300)}`);
  }
  return { models: normalizeModels(payload), sourceUrl: url };
}

async function getProvider(kv, providerId) {
  return kvGetJson(kv, kvKey("provider", providerId));
}

async function getEnabledModel(kv, requestedModel) {
  const ids = await listIds(kv, MODELS_INDEX);
  const models = [];
  for (const modelId of ids) {
    const row = await kvGetJson(kv, kvKey("model", modelId));
    if (row?.enabled !== false) models.push(row);
  }
  return models.find((m) => m.alias === requestedModel || m.upstreamModel === requestedModel || m.id === requestedModel) || null;
}

async function listEnabledModels(kv) {
  const ids = await listIds(kv, MODELS_INDEX);
  const rows = [];
  for (const modelId of ids) {
    const model = await kvGetJson(kv, kvKey("model", modelId));
    if (model?.enabled !== false) rows.push(model);
  }
  rows.sort((a, b) => (a.order ?? 100) - (b.order ?? 100) || a.alias.localeCompare(b.alias));
  return rows;
}

function openAIModelObject(model) {
  return {
    id: model.alias,
    object: "model",
    created: 0,
    owned_by: "openrelay",
    upstream_model: model.upstreamModel,
    provider_id: model.providerId,
    display_name: model.displayName || model.alias,
  };
}

async function readJson(request) {
  try { return await request.json(); } catch { throw new Error("Request body must be valid JSON"); }
}

function openAIToAnthropicMessages(messages = []) {
  let system = "";
  const converted = [];
  for (const m of messages) {
    if (m.role === "system") {
      const text = typeof m.content === "string" ? m.content : JSON.stringify(m.content);
      system += (system ? "\n\n" : "") + text;
      continue;
    }
    if (m.role !== "user" && m.role !== "assistant") continue;
    let content = m.content;
    if (typeof content !== "string") {
      if (Array.isArray(content)) {
        content = content.map((part) => part?.text || part?.content || "").join("\n");
      } else content = JSON.stringify(content ?? "");
    }
    converted.push({ role: m.role, content });
  }
  return { system: system || undefined, messages: converted };
}

function anthropicToOpenAI(payload, requestedModel) {
  const text = Array.isArray(payload?.content)
    ? payload.content.filter((p) => p?.type === "text").map((p) => p.text || "").join("")
    : "";
  return {
    id: payload?.id || `chatcmpl_${crypto.randomUUID().replaceAll("-", "")}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: requestedModel,
    choices: [{ index: 0, message: { role: "assistant", content: text }, finish_reason: payload?.stop_reason || "stop" }],
    usage: payload?.usage ? {
      prompt_tokens: payload.usage.input_tokens || 0,
      completion_tokens: payload.usage.output_tokens || 0,
      total_tokens: (payload.usage.input_tokens || 0) + (payload.usage.output_tokens || 0),
    } : undefined,
  };
}

async function proxyOpenAICompatible(context, provider, model, endpoint) {
  const apiKey = await decryptSecret(context, provider.encryptedApiKey);
  const body = await readJson(context.request);
  body.model = model.upstreamModel;
  const url = `${normalizeBaseUrl(provider.baseUrl)}${endpoint}`;
  const headers = providerHeaders(provider.type, apiKey);
  const upstream = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  return withCors(upstream);
}

async function proxyChatCompletions(context, kv) {
  const authError = await requireGatewayKey(context, kv);
  if (authError) return authError;
  const body = await readJson(context.request);
  if (!body.model) return error("MODEL_REQUIRED", "model is required", 400);
  const model = await getEnabledModel(kv, body.model);
  if (!model) return error("MODEL_NOT_ENABLED", `Model '${body.model}' is not enabled in OpenRelay`, 404);
  const provider = await getProvider(kv, model.providerId);
  if (!provider || provider.enabled === false) return error("PROVIDER_UNAVAILABLE", "Provider is disabled or missing", 503);

  if (providerProtocol(provider.type) !== "anthropic") {
    const fakeRequest = new Request(context.request.url, {
      method: context.request.method,
      headers: context.request.headers,
      body: JSON.stringify(body),
    });
    return proxyOpenAICompatible({ ...context, request: fakeRequest }, provider, model, "/chat/completions");
  }

  if (body.stream) {
    return error("ANTHROPIC_STREAM_NOT_SUPPORTED_HERE", "For Claude streaming in V1, call /v1/messages. /v1/chat/completions supports Claude with stream=false.", 400);
  }
  const apiKey = await decryptSecret(context, provider.encryptedApiKey);
  const converted = openAIToAnthropicMessages(body.messages || []);
  const anthropicBody = {
    model: model.upstreamModel,
    messages: converted.messages,
    max_tokens: body.max_tokens || body.max_completion_tokens || 4096,
    ...(converted.system ? { system: converted.system } : {}),
    ...(body.temperature !== undefined ? { temperature: body.temperature } : {}),
    ...(body.top_p !== undefined ? { top_p: body.top_p } : {}),
  };
  const upstream = await fetch(`${normalizeBaseUrl(provider.baseUrl)}/messages`, {
    method: "POST",
    headers: providerHeaders("anthropic", apiKey),
    body: JSON.stringify(anthropicBody),
  });
  const text = await upstream.text();
  let payload;
  try { payload = JSON.parse(text); } catch { payload = { raw: text }; }
  if (!upstream.ok) return json(payload, upstream.status);
  return json(anthropicToOpenAI(payload, body.model));
}

async function proxyAnthropicMessages(context, kv) {
  const authError = await requireGatewayKey(context, kv);
  if (authError) return authError;
  const body = await readJson(context.request);
  if (!body.model) return error("MODEL_REQUIRED", "model is required", 400);
  const model = await getEnabledModel(kv, body.model);
  if (!model) return error("MODEL_NOT_ENABLED", `Model '${body.model}' is not enabled in OpenRelay`, 404);
  const provider = await getProvider(kv, model.providerId);
  if (!provider || provider.enabled === false || providerProtocol(provider.type) !== "anthropic") {
    return error("ANTHROPIC_PROVIDER_REQUIRED", "The selected model is not backed by an Anthropic provider", 400);
  }
  const apiKey = await decryptSecret(context, provider.encryptedApiKey);
  body.model = model.upstreamModel;
  const upstream = await fetch(`${normalizeBaseUrl(provider.baseUrl)}/messages`, {
    method: "POST",
    headers: providerHeaders("anthropic", apiKey),
    body: JSON.stringify(body),
  });
  return withCors(upstream);
}

async function proxyResponses(context, kv) {
  const authError = await requireGatewayKey(context, kv);
  if (authError) return authError;
  const body = await readJson(context.request);
  if (!body.model) return error("MODEL_REQUIRED", "model is required", 400);
  const model = await getEnabledModel(kv, body.model);
  if (!model) return error("MODEL_NOT_ENABLED", `Model '${body.model}' is not enabled in OpenRelay`, 404);
  const provider = await getProvider(kv, model.providerId);
  if (!provider || provider.enabled === false) return error("PROVIDER_UNAVAILABLE", "Provider is disabled or missing", 503);
  if (providerProtocol(provider.type) === "anthropic") return error("ENDPOINT_NOT_SUPPORTED", "Anthropic models use /v1/messages or /v1/chat/completions (non-stream) in OpenRelay V1", 400);
  const fakeRequest = new Request(context.request.url, {
    method: context.request.method,
    headers: context.request.headers,
    body: JSON.stringify(body),
  });
  return proxyOpenAICompatible({ ...context, request: fakeRequest }, provider, model, "/responses");
}

async function adminListProviders(kv) {
  const ids = await listIds(kv, PROVIDERS_INDEX);
  const result = [];
  for (const providerId of ids) {
    const provider = await getProvider(kv, providerId);
    if (provider) result.push(providerPublic(provider));
  }
  result.sort((a, b) => (a.order ?? 100) - (b.order ?? 100) || a.name.localeCompare(b.name));
  return json({ data: result });
}

async function adminSaveProvider(context, kv, providerId) {
  const body = await readJson(context.request);
  const existing = providerId ? await getProvider(kv, providerId) : null;
  if (providerId && !existing) return error("NOT_FOUND", "Provider not found", 404);

  const type = String(body.type || existing?.type || "").trim();
  if (!SUPPORTED_PROVIDER_TYPES.includes(type)) {
    return error("INVALID_PROVIDER_TYPE", `Unsupported provider type: ${type}`, 400);
  }
  const name = String(body.name || existing?.name || "").trim();
  if (!name) return error("NAME_REQUIRED", "Provider name is required", 400);

  let baseUrl;
  let modelsUrl = "";
  try {
    baseUrl = validateHttpUrl(body.baseUrl || existing?.baseUrl, "baseUrl");
    if (body.modelsUrl || existing?.modelsUrl) modelsUrl = validateHttpUrl(body.modelsUrl || existing?.modelsUrl, "modelsUrl");
  } catch (e) { return error("INVALID_URL", e.message, 400); }

  const now = new Date().toISOString();
  const nextId = existing?.id || id("p_");
  const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  if (!existing && !apiKey) return error("API_KEY_REQUIRED", "API key is required", 400);

  const record = {
    ...(existing || {}),
    id: nextId,
    type,
    name,
    baseUrl: normalizeBaseUrl(baseUrl),
    modelsUrl: modelsUrl || "",
    enabled: body.enabled !== undefined ? Boolean(body.enabled) : (existing?.enabled ?? true),
    order: Number.isFinite(Number(body.order)) ? Number(body.order) : (existing?.order ?? 100),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
  if (apiKey) {
    record.encryptedApiKey = await encryptSecret(context, apiKey);
    record.apiKeyLast4 = apiKey.slice(-4);
  }

  await kvPutJson(kv, kvKey("provider", nextId), record);
  const ids = await listIds(kv, PROVIDERS_INDEX);
  if (!ids.includes(nextId)) await saveIds(kv, PROVIDERS_INDEX, [...ids, nextId]);
  // Invalidate cached models after any provider configuration/API key change.
  await kv.delete(kvKey("models_cache", nextId));
  return json({ data: providerPublic(record) }, existing ? 200 : 201);
}

async function adminRevealProviderKey(context, kv, providerId) {
  const provider = await getProvider(kv, providerId);
  if (!provider) return error("NOT_FOUND", "Provider not found", 404);
  if (!provider.encryptedApiKey) return error("API_KEY_NOT_CONFIGURED", "Provider API key is not configured", 404);
  try {
    const apiKey = await decryptSecret(context, provider.encryptedApiKey);
    return secretJson({
      data: {
        id: provider.id,
        name: provider.name,
        apiKey,
        revealedAt: new Date().toISOString(),
      },
    });
  } catch (e) {
    return error("API_KEY_DECRYPT_FAILED", `Unable to decrypt provider API key: ${e.message}`, 500);
  }
}

async function adminDeleteProvider(kv, providerId) {
  const provider = await getProvider(kv, providerId);
  if (!provider) return error("NOT_FOUND", "Provider not found", 404);
  const enabledModels = await listEnabledModels(kv);
  if (enabledModels.some((m) => m.providerId === providerId)) {
    return error("PROVIDER_IN_USE", "Delete or disable models using this provider first", 409);
  }
  await kv.delete(kvKey("provider", providerId));
  await kv.delete(kvKey("models_cache", providerId));
  const ids = await listIds(kv, PROVIDERS_INDEX);
  await saveIds(kv, PROVIDERS_INDEX, ids.filter((id) => id !== providerId));
  return json({ ok: true });
}

async function adminProviderModels(context, kv, providerId) {
  const provider = await getProvider(kv, providerId);
  if (!provider) return error("NOT_FOUND", "Provider not found", 404);
  const url = new URL(context.request.url);
  const refresh = url.searchParams.get("refresh") === "1";
  const cacheKey = kvKey("models_cache", providerId);
  const cached = await kvGetJson(kv, cacheKey);
  const fresh = cached?.fetchedAt && Date.now() - Date.parse(cached.fetchedAt) < MODEL_CACHE_TTL_MS;
  if (!refresh && cached && fresh) return json({ data: cached, cached: true });
  try {
    const result = await fetchProviderModels(context, provider);
    const payload = { providerId, fetchedAt: new Date().toISOString(), sourceUrl: result.sourceUrl, models: result.models };
    await kvPutJson(kv, cacheKey, payload);
    return json({ data: payload, cached: false });
  } catch (e) {
    if (cached) return json({ data: cached, cached: true, warning: e.message }, 200);
    return error("UPSTREAM_MODEL_LIST_FAILED", e.message, 502);
  }
}

async function adminTestProvider(context, kv, providerId) {
  const provider = await getProvider(kv, providerId);
  if (!provider) return error("NOT_FOUND", "Provider not found", 404);
  try {
    const result = await fetchProviderModels(context, provider);
    return json({ ok: true, modelCount: result.models.length, sourceUrl: result.sourceUrl });
  } catch (e) {
    return error("PROVIDER_TEST_FAILED", e.message, 502);
  }
}

async function adminListModels(kv) {
  const ids = await listIds(kv, MODELS_INDEX);
  const rows = [];
  for (const modelId of ids) {
    const model = await kvGetJson(kv, kvKey("model", modelId));
    if (model) rows.push(model);
  }
  rows.sort((a, b) => (a.order ?? 100) - (b.order ?? 100) || a.alias.localeCompare(b.alias));
  return json({ data: rows });
}

async function adminSaveModel(context, kv, modelId) {
  const body = await readJson(context.request);
  const existing = modelId ? await kvGetJson(kv, kvKey("model", modelId)) : null;
  if (modelId && !existing) return error("NOT_FOUND", "Model mapping not found", 404);

  const providerId = String(body.providerId || existing?.providerId || "");
  const provider = await getProvider(kv, providerId);
  if (!provider) return error("INVALID_PROVIDER", "Provider not found", 400);
  const upstreamModel = String(body.upstreamModel || existing?.upstreamModel || "").trim();
  const alias = String(body.alias || existing?.alias || upstreamModel).trim();
  if (!upstreamModel || !alias) return error("INVALID_MODEL", "providerId, upstreamModel and alias are required", 400);
  if (!/^[A-Za-z0-9._:@/+\-]{1,128}$/.test(alias)) return error("INVALID_ALIAS", "Alias contains unsupported characters", 400);

  const ids = await listIds(kv, MODELS_INDEX);
  for (const idValue of ids) {
    if (idValue === modelId) continue;
    const row = await kvGetJson(kv, kvKey("model", idValue));
    if (row?.alias === alias) return error("ALIAS_EXISTS", `Alias '${alias}' already exists`, 409);
  }

  const now = new Date().toISOString();
  const nextId = existing?.id || id("m_");
  const record = {
    ...(existing || {}),
    id: nextId,
    providerId,
    upstreamModel,
    alias,
    displayName: String(body.displayName || existing?.displayName || upstreamModel).trim(),
    enabled: body.enabled !== undefined ? Boolean(body.enabled) : (existing?.enabled ?? true),
    order: Number.isFinite(Number(body.order)) ? Number(body.order) : (existing?.order ?? 100),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
  await kvPutJson(kv, kvKey("model", nextId), record);
  if (!ids.includes(nextId)) await saveIds(kv, MODELS_INDEX, [...ids, nextId]);
  return json({ data: record }, existing ? 200 : 201);
}

async function adminDeleteModel(kv, modelId) {
  const existing = await kvGetJson(kv, kvKey("model", modelId));
  if (!existing) return error("NOT_FOUND", "Model mapping not found", 404);
  await kv.delete(kvKey("model", modelId));
  const ids = await listIds(kv, MODELS_INDEX);
  await saveIds(kv, MODELS_INDEX, ids.filter((id) => id !== modelId));
  return json({ ok: true });
}

async function adminListGatewayKeys(kv) {
  const hashes = await listIds(kv, GATEWAY_KEYS_INDEX);
  const rows = [];
  for (const hash of hashes) {
    const item = await kvGetJson(kv, kvKey("gateway_key", hash));
    if (item) rows.push(item);
  }
  rows.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return json({ data: rows });
}

async function adminCreateGatewayKey(context, kv) {
  const body = await readJson(context.request);
  const name = String(body.name || "Default").trim() || "Default";
  const random = crypto.getRandomValues(new Uint8Array(32));
  const token = `or_${[...random].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
  const hash = await sha256Hex(token);
  const record = {
    id: id("k_"),
    name,
    prefix: token.slice(0, 7),
    last4: token.slice(-4),
    enabled: true,
    createdAt: new Date().toISOString(),
  };
  await kvPutJson(kv, kvKey("gateway_key", hash), record);
  const hashes = await listIds(kv, GATEWAY_KEYS_INDEX);
  await saveIds(kv, GATEWAY_KEYS_INDEX, [...hashes, hash]);
  return json({ data: record, token }, 201);
}

async function adminDeleteGatewayKey(kv, recordId) {
  const hashes = await listIds(kv, GATEWAY_KEYS_INDEX);
  let foundHash = "";
  for (const hash of hashes) {
    const item = await kvGetJson(kv, kvKey("gateway_key", hash));
    if (item?.id === recordId) { foundHash = hash; break; }
  }
  if (!foundHash) return error("NOT_FOUND", "Gateway key not found", 404);
  await kv.delete(kvKey("gateway_key", foundHash));
  await saveIds(kv, GATEWAY_KEYS_INDEX, hashes.filter((h) => h !== foundHash));
  return json({ ok: true });
}

async function route(context) {
  if (context.request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  const url = new URL(context.request.url);
  const path = url.pathname;
  const method = context.request.method.toUpperCase();

  if (path === "/api/health" && method === "GET") {
    let kvBound = false;
    let passwordConfigured = false;
    let healthError = "";
    try { getKV(context); kvBound = true; } catch (e) { healthError = e.message; }
    try { getOpenRelayPassword(context); passwordConfigured = true; } catch (e) { if (!healthError) healthError = e.message; }
    const ok = kvBound && passwordConfigured;
    return json({
      ok,
      app: "OpenRelay",
      version: APP_VERSION,
      kvBound,
      passwordConfigured,
      ...(healthError ? { error: healthError } : {}),
    }, ok ? 200 : 503);
  }

  let kv;
  try { kv = getKV(context); } catch (e) { return error("KV_NOT_BOUND", e.message, 500); }

  // Public gateway endpoints use generated OpenRelay gateway keys.
  if (path === "/v1/models" && method === "GET") {
    const authError = await requireGatewayKey(context, kv);
    if (authError) return authError;
    const models = await listEnabledModels(kv);
    return json({ object: "list", data: models.map(openAIModelObject) });
  }
  if (path === "/v1/chat/completions" && method === "POST") return proxyChatCompletions(context, kv);
  if (path === "/v1/messages" && method === "POST") return proxyAnthropicMessages(context, kv);
  if (path === "/v1/responses" && method === "POST") return proxyResponses(context, kv);

  if (!path.startsWith("/api/admin/")) return error("NOT_FOUND", "Route not found", 404);
  const adminError = requireAdmin(context);
  if (adminError) return adminError;

  if (path === "/api/admin/providers" && method === "GET") return adminListProviders(kv);
  if (path === "/api/admin/providers" && method === "POST") return adminSaveProvider(context, kv, null);
  if (path === "/api/admin/models" && method === "GET") return adminListModels(kv);
  if (path === "/api/admin/models" && method === "POST") return adminSaveModel(context, kv, null);
  if (path === "/api/admin/gateway-keys" && method === "GET") return adminListGatewayKeys(kv);
  if (path === "/api/admin/gateway-keys" && method === "POST") return adminCreateGatewayKey(context, kv);

  let m = path.match(/^\/api\/admin\/providers\/([^/]+)$/);
  if (m && method === "PUT") return adminSaveProvider(context, kv, m[1]);
  if (m && method === "DELETE") return adminDeleteProvider(kv, m[1]);
  m = path.match(/^\/api\/admin\/providers\/([^/]+)\/models$/);
  if (m && method === "GET") return adminProviderModels(context, kv, m[1]);
  m = path.match(/^\/api\/admin\/providers\/([^/]+)\/test$/);
  if (m && method === "POST") return adminTestProvider(context, kv, m[1]);
  m = path.match(/^\/api\/admin\/providers\/([^/]+)\/reveal-key$/);
  if (m && method === "POST") return adminRevealProviderKey(context, kv, m[1]);

  m = path.match(/^\/api\/admin\/models\/([^/]+)$/);
  if (m && method === "PUT") return adminSaveModel(context, kv, m[1]);
  if (m && method === "DELETE") return adminDeleteModel(kv, m[1]);

  m = path.match(/^\/api\/admin\/gateway-keys\/([^/]+)$/);
  if (m && method === "DELETE") return adminDeleteGatewayKey(kv, m[1]);

  return error("NOT_FOUND", "Admin route not found", 404);
}

export async function onRequest(context) {
  try {
    return await route(context);
  } catch (e) {
    return error("INTERNAL_ERROR", e?.message || String(e), 500);
  }
}
