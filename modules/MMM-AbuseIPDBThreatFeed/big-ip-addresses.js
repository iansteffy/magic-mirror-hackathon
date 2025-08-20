
(function(root) {
	const staticIPs = [

	];

	console.log("ABUSE Initializing static IP data", staticIPs);

	// Handle both browser and Node.js environments
	if (typeof root !== 'undefined') {
		root.staticIPs = staticIPs;
		console.log("ABUSE Static IPs initialized with", staticIPs.length, "entries");
	}
})(typeof window !== 'undefined' ? window : global);
