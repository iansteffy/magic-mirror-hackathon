/* eslint-disable no-console */
const NodeHelper = require("node_helper");
const whois = require("whois-json");
const { fetch } = require("undici"); // ensure fetch is available in the Node/Electron helper

const DEFAULT_API_BASE = process.env.API_URL || "https://api.abuseipdb.com/api/v2";
const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_BLACKLIST_INTERVAL_MS = 60 * 60 * 1000; // 60 minutes

module.exports = NodeHelper.create({
  start() {
    this.whoisCache = new Map();
    this._rateLimitedNotified = false;
    this._intervals = { check: null, blacklist: null };
    this._cfg = null;

    console.log(`[${this.name}] Helper started`);
  },

  stop() {
    this._clearIntervals();
    console.log(`[${this.name}] Helper stopped`);
  },

  // Socket bridge from the front-end module
  socketNotificationReceived(notification, payload) {
    try {
      console.log(`[${this.name}] socketNotificationReceived: ${notification}`);

      switch (notification) {
        case "CONFIG": {
          // Normalize and store config
          const cfg = this._normalizeConfig(payload);
          this._cfg = cfg;

          console.log(`[${this.name}] CONFIG received`, {
            hasApiKey: Boolean(cfg.apiKey),
            ipCount: Array.isArray(cfg.ipAddresses) ? cfg.ipAddresses.length : 0,
            maxAgeInDays: cfg.maxAgeInDays,
            checkIntervalMs: cfg.checkIntervalMs || DEFAULT_CHECK_INTERVAL_MS,
            blacklistIntervalMs: cfg.blacklistIntervalMs || DEFAULT_BLACKLIST_INTERVAL_MS
          });

          if (!cfg.apiKey) {
            console.error(`[${this.name}] Missing apiKey in CONFIG`);
            this.sendSocketNotification("ERROR", { scope: "config", message: "Missing apiKey" });
            return;
          }

          // Run immediately on config
          if (Array.isArray(cfg.ipAddresses) && cfg.ipAddresses.length > 0) {
            this.checkIpAddresses(cfg).catch((e) => {
              console.error(`[${this.name}] Initial checkIpAddresses failed: ${e.message}`);
            });
          } else {
            console.warn(`[${this.name}] No ipAddresses provided; emitting empty IP_DATA`);
            this.sendSocketNotification("IP_DATA", []);
          }

          // Also fetch blacklist immediately if requested
          if (cfg.fetchBlacklist === true) {
            this.fetchBlacklist(cfg).catch((e) => {
              console.error(`[${this.name}] Initial fetchBlacklist failed: ${e.message}`);
            });
          }

          // Schedule loops
          this._scheduleLoops(cfg);
          break;
        }

        case "FETCH_NOW": {
          const cfg = this._cfg || this._normalizeConfig(payload || {});
          console.log(`[${this.name}] FETCH_NOW requested`);
          this.checkIpAddresses(cfg).catch((e) => {
            console.error(`[${this.name}] FETCH_NOW failed: ${e.message}`);
          });
          break;
        }

        case "FETCH_BLACKLIST_NOW": {
          const cfg = this._cfg || this._normalizeConfig(payload || {});
          console.log(`[${this.name}] FETCH_BLACKLIST_NOW requested`);
          this.fetchBlacklist(cfg).catch((e) => {
            console.error(`[${this.name}] FETCH_BLACKLIST_NOW failed: ${e.message}`);
          });
          break;
        }

        default:
          console.log(`[${this.name}] Unhandled notification: ${notification}`);
      }
    } catch (e) {
      console.error(`[${this.name}] socketNotificationReceived error: ${e.message}`);
      this.sendSocketNotification("ERROR", { scope: "socket", message: e.message });
    }
  },

  // Normalize config with safe defaults
  _normalizeConfig(cfg = {}) {
    const ipAddresses = Array.isArray(cfg.ipAddresses)
      ? cfg.ipAddresses.filter(Boolean)
      : typeof cfg.ipAddresses === "string" && cfg.ipAddresses.trim()
        ? [cfg.ipAddresses.trim()]
        : [];

    return {
      apiKey: cfg.apiKey,
      ipAddresses,
      maxAgeInDays: Number.isFinite(cfg.maxAgeInDays) ? cfg.maxAgeInDays : 30,
      timeoutMs: Number.isFinite(cfg.timeoutMs) ? cfg.timeoutMs : DEFAULT_TIMEOUT_MS,
      checkIntervalMs: Number.isFinite(cfg.checkIntervalMs) ? cfg.checkIntervalMs : DEFAULT_CHECK_INTERVAL_MS,
      fetchBlacklist: cfg.fetchBlacklist === true,
      blacklistIntervalMs: Number.isFinite(cfg.blacklistIntervalMs)
        ? cfg.blacklistIntervalMs
        : DEFAULT_BLACKLIST_INTERVAL_MS,
			includeRegionalIPs: cfg.includeRegionalIPs === true
    };
  },

  _clearIntervals() {
    if (this._intervals.check) {
      clearInterval(this._intervals.check);
      this._intervals.check = null;
    }
    if (this._intervals.blacklist) {
      clearInterval(this._intervals.blacklist);
      this._intervals.blacklist = null;
    }
  },

  _scheduleLoops(cfg) {
    this._clearIntervals();

    if (Array.isArray(cfg.ipAddresses) && cfg.ipAddresses.length > 0) {
      // We don't need the automatic interval anymore since the front-end
      // will request new data when rotating
      console.log(`[${this.name}] checkIpAddresses will be triggered by rotation`);
    }

    // Keep the blacklist functionality as is
    if (cfg.fetchBlacklist === true) {
      this._intervals.blacklist = setInterval(() => {
        console.log(`[${this.name}] Scheduled fetchBlacklist tick`);
        this.fetchBlacklist(this._cfg || cfg).catch((e) => {
          console.error(`[${this.name}] Scheduled fetchBlacklist failed: ${e.message}`);
        });
      }, cfg.blacklistIntervalMs || DEFAULT_BLACKLIST_INTERVAL_MS);
      console.log(
        `[${this.name}] fetchBlacklist scheduled every ${cfg.blacklistIntervalMs || DEFAULT_BLACKLIST_INTERVAL_MS}ms`
      );
    }
  },

  // Safely build common headers
  _getHeaders(apiKey) {
    return { Accept: "application/json", Key: apiKey };
  },

  // Simple fetch with timeout support
  async _fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      return res;
    } finally {
      clearTimeout(id);
    }
  },

	// Add this method to the existing node_helper.js
	async getRegionalIPs() {
		const targetISPs = [
			"M-net",
			"Vodafone Kabel Deutschland",
			"Deutsche Telekom AG",
			"Telefonica Germany"
		];

		const results = [];

		for (const isp of targetISPs) {
			try {
				// Use the existing WHOIS lookup method
				const whoisData = await this.lookupWhois(isp);
				if (whoisData && whoisData.networks) {
					whoisData.networks.forEach(network => {
						if (network.range) {
							results.push(network.range);
						}
					});
				}
			} catch (error) {
				console.warn(`ABUSE failed to get IPs for ISP ${isp}:`, error.message);
			}
		}

		return results;
	},

  // WHOIS lookup with best-effort error handling and short timeout
  async lookupWhois(ip) {
    try {
      const data = await whois(ip, { follow: 2, timeout: 5000 });
      return data || undefined;
    } catch (e) {
      console.warn(`WHOIS lookup failed for ${ip}: ${e.message}`);
      return undefined;
    }
  },

  // Check a list of IP addresses against AbuseIPDB
  async checkIpAddresses(cfg) {
    try {
      if (!cfg || !cfg.apiKey) {
        console.error("ABUSE missing configuration or API key");
        this.sendSocketNotification("ERROR", { scope: "check", message: "Missing API key" });
        return;
      }

      if (!Array.isArray(cfg.ipAddresses) || cfg.ipAddresses.length === 0) {
        console.warn("ABUSE no IP addresses provided to check");
        this.sendSocketNotification("IP_DATA", []);
        return;
      }

      if (!this.whoisCache) this.whoisCache = new Map();

      const headers = this._getHeaders(cfg.apiKey);
      const results = [];
      const maxAgeInDays = String(cfg.maxAgeInDays || 30);
      const timeoutMs = Number(cfg.timeoutMs) > 0 ? Number(cfg.timeoutMs) : DEFAULT_TIMEOUT_MS;

      console.log(`ABUSE starting checks for ${cfg.ipAddresses.length} IP(s)`);

      for (const ip of cfg.ipAddresses) {
        try {
          console.log(`ABUSE checking IP: ${ip}`);

          const params = new URLSearchParams({ ipAddress: ip, maxAgeInDays });
          const url = `${DEFAULT_API_BASE}/check?${params.toString()}`;

          const res = await this._fetchWithTimeout(url, { headers }, timeoutMs);

          if (res.status === 429) {
            console.warn("AbuseIPDB check rate-limited (429). Skipping remaining IPs this cycle.");
            if (!this._rateLimitedNotified) {
              this._rateLimitedNotified = true;
              this.sendSocketNotification("RATE_LIMITED", { source: "check" });
            }
            break; // stop processing further IPs this cycle
          } else {
            // Reset flag once we get a non-429 response
            this._rateLimitedNotified = false;
          }

          if (!res.ok) throw new Error(`AbuseIPDB check HTTP ${res.status}`);

          const data = await res.json();

          // Ensure we push a consistent item shape
          const item = {
            ipAddress: data?.data?.ipAddress || ip,
            abuseConfidenceScore: data?.data?.abuseConfidenceScore ?? 0,
            countryCode: data?.data?.countryCode,
            // whois will be filled below (best-effort)
            whois: undefined
          };

          // WHOIS (cached)
          let whoisData = this.whoisCache.get(ip);
          if (!whoisData) {
            whoisData = await this.lookupWhois(ip);
            if (whoisData) this.whoisCache.set(ip, whoisData);
          }
          item.whois = whoisData;
          console.log(`WHOIS data found for ${ip}:`, whoisData ? "ok" : "undefined");

          results.push(item);
        } catch (e) {
          console.error(`ABUSE error for ${ip}:`, e.message);
        }
      }

      console.log("ABUSE sending IP_DATA with items:", results.length, results.map(r => r.ipAddress).join(", "));
      this.sendSocketNotification("IP_DATA", results);
    } catch (e) {
      console.error("ABUSE checkIpAddresses failed:", e.message);
      this.sendSocketNotification("ERROR", { scope: "check", message: e.message });
    }
  },

  // Fetch AbuseIPDB blacklist
  async fetchBlacklist(cfg) {
    try {
      if (!cfg || !cfg.apiKey) {
        console.error("ABUSE missing configuration or API key (blacklist)");
        this.sendSocketNotification("ERROR", { scope: "blacklist", message: "Missing API key" });
        return;
      }

      const url = `${DEFAULT_API_BASE}/blacklist`;
      const res = await this._fetchWithTimeout(url, { headers: this._getHeaders(cfg.apiKey) }, DEFAULT_TIMEOUT_MS);

      if (res.status === 429) {
        console.warn("AbuseIPDB blacklist rate-limited (429). Skipping this cycle.");
        if (!this._rateLimitedNotified) {
          this._rateLimitedNotified = true;
          this.sendSocketNotification("RATE_LIMITED", { source: "blacklist" });
        }
        return;
      } else {
        this._rateLimitedNotified = false;
      }

      if (!res.ok) throw new Error(`AbuseIPDB blacklist HTTP ${res.status}`);

      const data = await res.json();
      const items = Array.isArray(data?.data) ? data.data : [];
      console.log("ABUSE sending BLACKLIST_DATA with items:", items.length);
      this.sendSocketNotification("BLACKLIST_DATA", items);
    } catch (e) {
      console.error("ABUSE blacklist fetch failed:", e.message);
      this.sendSocketNotification("ERROR", { scope: "blacklist", message: e.message });
    }
  }
});
