/* Config Sample
 *
 * For more information on how you can configure this file
 * see https://docs.magicmirror.builders/configuration/introduction.html
 * and https://docs.magicmirror.builders/modules/configuration.html
 *
 * You can use environment variables using a `config.js.template` file instead of `config.js`
 * which will be converted to `config.js` while starting. For more information
 * see https://docs.magicmirror.builders/configuration/introduction.html#enviromnent-variables
 */
let config = {
	address: "localhost",	// Address to listen on, can be:
							// - "localhost", "127.0.0.1", "::1" to listen on loopback interface
							// - another specific IPv4/6 to listen on a specific interface
							// - "0.0.0.0", "::" to listen on any interface
							// Default, when address config is left out or empty, is "localhost"
	port: 8080,
	basePath: "/",	// The URL path where MagicMirror² is hosted. If you are using a Reverse proxy
									// you must set the sub path here. basePath must end with a /
	ipWhitelist: ["127.0.0.1", "::ffff:127.0.0.1", "::1"],	// Set [] to allow all IP addresses
									// or add a specific IPv4 of 192.168.1.5 :
									// ["127.0.0.1", "::ffff:127.0.0.1", "::1", "::ffff:192.168.1.5"],
									// or IPv4 range of 192.168.3.0 --> 192.168.3.15 use CIDR format :
									// ["127.0.0.1", "::ffff:127.0.0.1", "::1", "::ffff:192.168.3.0/28"],

	useHttps: false,			// Support HTTPS or not, default "false" will use HTTP
	httpsPrivateKey: "",	// HTTPS private key path, only require when useHttps is true
	httpsCertificate: "",	// HTTPS Certificate path, only require when useHttps is true

	language: "en",
	locale: "en-US",   // this variable is provided as a consistent location
			   // it is currently only used by 3rd party modules. no MagicMirror code uses this value
			   // as we have no usage, we  have no constraints on what this field holds
			   // see https://en.wikipedia.org/wiki/Locale_(computer_software) for the possibilities

	logLevel: ["INFO", "LOG", "WARN", "ERROR"], // Add "DEBUG" for even more logging
	timeFormat: 24,
	units: "metric",

	modules: [
		{
			module: "alert",
		},
		{
			module: "MMPowerScheduler",
			config: {
				schedule: [
					{ action: "off", time: "16:30" },
        			{ action: "on", time: "09:00" }
				]
			}
		},
		{
			module: "clock",
			position: "top_left"
		},
		{
			module: "weather",
			position: "top_right",
			config: {
				weatherProvider: "openmeteo",
				type: "current",
				lat: 48.3658,
				lon: 10.8865
			}
		},
		{
			module: "weather",
			position: "top_right",
			header: "Weather Forecast",
			config: {
				weatherProvider: "openmeteo",
				type: "forecast",
				lat: 48.3658,
				lon: 10.8865
			}
		},
		{
			module: "MMM-HolidayCountdown",
			header: "Upcoming Public Holidays",
			position: "bottom_left",
		},
		{
			module: "MMM-AbuseIPDBThreatFeed",
			position: "bottom_right",
			config: {
				apiKey: "08d13c52da71a7b08efd5035f905d22e484677d5aaaffaafd2df455cbc86fa5caa42b67a90e4c5d7",
				ipAddresses: [
					"1.2.3.4",
					"5.6.7.8",
					"9.10.11.12",
					"88.217.0.1",      // M-net Telekommunikations GmbH, Munich, Bavaria (AS8767)
					"160.46.226.1",    // Bayerische Motoren Werke Aktiengesellschaft (BMW), Munich, Bavaria (AS8590)
					"185.53.178.1",    // Team Internet AG, Munich, Bavaria (AS61969)
					"194.8.56.1",      // MAN Truck & Bus SE, Munich, Bavaria (AS8450)
					"193.26.160.1",    // KUKA Systems GmbH, Augsburg, Bavaria (AS25073)
					"217.7.0.1",       // LEW TelNet GmbH, Augsburg, Bavaria (AS8823)
					"192.166.192.1",   // Muenchener Rueckversicherungs Gesellschaft AG, Munich, Bavaria (AS15953)
					"195.145.0.1",     // Siemens AG, Munich, Bavaria (AS12888)
					"80.156.86.1",     // T-Systems International GmbH, Munich, Bavaria (AS34086)
					"185.17.204.1",    // manroland IP GmbH, Augsburg, Bavaria (AS8767, sub-allocated)
					"80.148.0.1",      // SpaceNet AG, Munich, Bavaria (AS5539)
					"212.95.32.1",     // myLoc managed IT AG, Munich, Bavaria (AS24961)
					"212.77.160.1",    // RelAix Networks GmbH, Munich, Bavaria (AS34928)
					"80.241.208.1",    // Optitrust GmbH, Munich, Bavaria (AS208049)
					"193.138.29.1",    // Technische Universitaet Muenchen, Munich, Bavaria (AS12816)
					"185.94.188.1",    // Travian Games GmbH, Munich, Bavaria (AS200062)
					"80.242.208.1",    // S.WERK GMBH, Munich, Bavaria (AS208771)
					"185.140.140.1",   // synaforce GmbH, Augsburg, Bavaria (AS201785)
					"193.141.104.1",   // SWM Services GmbH, Munich, Bavaria (AS203329)
					"185.128.120.1",   // Prager Connect GmbH, Munich, Bavaria (AS207252)
					"185.181.60.1",    // NorthC Deutschland GmbH, Munich, Bavaria (AS199610)
					"185.69.148.1",    // Trusted Network GmbH, Munich, Bavaria (AS202617)
					"185.107.44.1",    // meerfarbig GmbH & Co. KG, Munich, Bavaria (AS203969)
					"185.103.104.1",   // Michael Rack, Munich, Bavaria (AS203507)
					"185.183.156.1",   // SWS Computersysteme AG, Augsburg, Bavaria (AS205915)
					"185.172.148.1",   // System Crew GmbH, Munich, Bavaria (AS205543)
					"185.189.180.1",   // Pufferfish Studios LLC, Munich, Bavaria (AS206264)
					"185.198.8.1",     // Sebastian Fohler, Munich, Bavaria (AS206813)
					"185.201.144.1",   // MUC-RAD, Munich, Bavaria (AS206858)
					"188.191.144.1",   // Unify GmbH & Co. KG, Munich, Bavaria (AS34372)
					"193.158.32.1"     // RSG Group GmbH, Munich, Bavaria (AS34788)
				],
				minConfidence: 0,  // Changed from confidenceMinimum
				rotateInterval: 5000
			}
		}

	]
};

/*************** DO NOT EDIT THE LINE BELOW ***************/
if (typeof module !== "undefined") { module.exports = config; }
