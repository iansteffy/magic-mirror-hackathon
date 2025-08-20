Module.register("MMM-AbuseIPDBThreatFeed", {
    defaults: {
        rotateInterval: 10000,
        minConfidence: 0,
        loadingText: "Loading AbuseIPDB data…",
        header: "Company IP Threat Score (lower is better)",
    },

    start() {
        this.items = [];
        this.loaded = false;
        this.rotationTimer = null;
        this.currentIndex = 0;
        this.allData = new Map(); // Store all fetched data

        // Load both static IPs and prepare for dynamic ones
        this.config.ipAddresses = [...(global.staticIPs || [])];
    },

    getHeader() {
        return this.config.header || "AbuseIPDB Threat Feed";
    },

    notificationReceived(notification, payload, sender) {
        if (notification === "DOM_OBJECTS_CREATED") {
            // Send full config initially
            this.sendSocketNotification("CONFIG", this.config);

            setTimeout(() => {
                this.sendSocketNotification("FETCH_NOW");
            }, 250);
        }
    },

    socketNotificationReceived(notification, payload) {
        console.log("[ABUSE FE] socketNotificationReceived:", notification);

        switch (notification) {
            case "IP_DATA": {
                const list = Array.isArray(payload) ? payload : [];
                const filtered = list.filter(
                    (it) => (Number(it.abuseConfidenceScore) || 0) >= this.config.minConfidence
                );

                // Store the data
                filtered.forEach(item => {
                    if (item.ipAddress) {
                        this.allData.set(item.ipAddress, item);
                    }
                });

                // Get visible items from our stored data
                this.items = this.getVisibleItems();
                this.loaded = true;
                this.updateDom(300);
                this.startRotation();
                break;
            }
            case "BLACKLIST_DATA": {
                // Optional: If you also render blacklist items, merge or store them here.
                console.log(`[ABUSE FE] received BLACKLIST_DATA: count=${Array.isArray(payload) ? payload.length : 0}`);
                break;
            }
            case "RATE_LIMITED": {
                console.warn("[ABUSE FE] AbuseIPDB rate-limited. Displaying current/empty list.");
                // Ensure UI doesn’t get stuck on “Loading…”
                this.loaded = true;
                this.updateDom(300);
                break;
            }
            case "ERROR": {
                console.error("[ABUSE FE] ERROR from helper:", payload);
                // Don’t block UI forever if helper had an error
                this.loaded = true;
                this.items = this.items || [];
                this.updateDom(300);
                break;
            }
        }
    },

    getVisibleItems() {
        const start = this.currentIndex;
        const end = start + 3;
        return this.config.ipAddresses
            .slice(start, end)
            .map(ip => this.allData.get(ip))
            .filter(Boolean);
    },

    startRotation() {
        if (this.rotationTimer) {
            clearInterval(this.rotationTimer);
            this.rotationTimer = null;
        }
        if (!this.config.rotateInterval || this.config.rotateInterval <= 0) return;

        this.rotationTimer = setInterval(() => {
            // Update current index
            this.currentIndex = (this.currentIndex + 3) % this.config.ipAddresses.length;

            // Update visible items from our stored data
            this.items = this.getVisibleItems();

            // Update the display
            this.updateDom(300);
        }, this.config.rotateInterval);
    },


	getDom() {
		const wrapper = document.createElement("div");
		wrapper.className = "abuseipdb";

		if (this.loading) {
			wrapper.innerHTML = this.translate("LOADING");
			return wrapper;
		}

		const ul = document.createElement("ul");
		ul.className = "abuseipdb-list";

		this.items
			.filter(item => {
				// Only show items that have organization information
				const org = item.whois && (
					item.whois.orgName ||
					item.whois.org ||
					item.whois.netname
				);
				return Boolean(org);
			})
			.forEach((item) => {
				const li = document.createElement("li");
				li.className = "abuseipdb-item";

				const icon = document.createElement("span");
				icon.className = "icon fa fa-bolt";

				const org = document.createElement("span");
				org.className = "org";
				const orgName = item.whois && (
					item.whois.orgName ||
					item.whois.org ||
					item.whois.netname
				);
				org.textContent = orgName;

                const separator1 = document.createElement("span");
                separator1.className = "separator";
                separator1.textContent = " • ";

				const score = document.createElement("span");
				score.className = "score";
				const confidenceScore = Number(item.abuseConfidenceScore) || 0;

				if (confidenceScore >= 76) {
					score.className += " high-risk";
				} else if (confidenceScore >= 26) {
					score.className += " medium-risk";
				} else {
					score.className += " low-risk";
				}
				score.textContent = `${confidenceScore}/100`;

				const country = item.countryCode || item.country || "";
				if (country) {
                    const separator2 = document.createElement("span");
                    separator2.className = "separator";
                    separator2.textContent = " • ";

					const meta = document.createElement("span");
					meta.className = "meta";
					meta.textContent = country;

                    li.append(icon, " ", org, separator1, score, separator2, meta);
				} else {
                    li.append(icon, " ", org, separator1, score);
				}

				ul.appendChild(li);
			});

		wrapper.appendChild(ul);
		return wrapper;
	}
});
