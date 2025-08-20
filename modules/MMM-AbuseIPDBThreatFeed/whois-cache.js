/**
 * Cache implementation for WHOIS lookups to reduce API calls
 * and improve performance.
 */
class WhoisCache {
	/**
	 * Initialize the cache
	 * @param {number} maxAge Maximum age of cache entries in milliseconds (default: 24 hours)
	 */
	constructor(maxAge = 24 * 60 * 60 * 1000) {
		this.cache = new Map();
		this.maxAge = maxAge;
	}

	/**
	 * Store WHOIS data in cache
	 * @param {string} ip IP address to use as key
	 * @param {object} data WHOIS data to cache
	 */
	set(ip, data) {
		this.cache.set(ip, {
			timestamp: Date.now(),
			data
		});
	}

	/**
	 * Retrieve WHOIS data from cache
	 * @param {string} ip IP address to lookup
	 * @returns {object|null} Cached WHOIS data or null if not found/expired
	 */
	get(ip) {
		const entry = this.cache.get(ip);
		if (!entry) return null;
		if (Date.now() - entry.timestamp > this.maxAge) {
			this.cache.delete(ip);
			return null;
		}
		return entry.data;
	}

	/**
	 * Clear all entries from the cache
	 */
	clear() {
		this.cache.clear();
	}

	/**
	 * Get the number of entries in the cache
	 * @returns {number} Number of cached entries
	 */
	size() {
		return this.cache.size;
	}
}

module.exports = WhoisCache;
