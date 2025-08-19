const NodeHelper = require("node_helper");
const { exec } = require("child_process");

module.exports = NodeHelper.create({
	start: function() {
		console.log("MMPowerScheduler helper started...");
	},

	socketNotificationReceived: function(notification) {
		console.log("Node helper received notification:", notification);
		switch(notification) {
			case "WAKE_MONITOR":
				console.log("Executing wake command...");
				this.executeCommand("vcgencmd display_power 1");
				break;
			case "SLEEP_MONITOR":
				console.log("Executing sleep command...");
				this.executeCommand("vcgencmd display_power 0");
				break;
		}
	},

	executeCommand: function(command) {
		console.log("Attempting to execute command:", command);
		exec(command, (error, stdout, stderr) => {
			if (error) {
				console.error(`Error executing command: ${error}`);
				return;
			}
			console.log(`Command executed successfully: ${command}`);
			if (stdout) console.log("Command output:", stdout);
			if (stderr) console.log("Command stderr:", stderr);
		});
	}
});
