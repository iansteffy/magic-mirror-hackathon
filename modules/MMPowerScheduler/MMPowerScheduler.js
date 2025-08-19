Module.register("MMPowerScheduler", {
    defaults: {
        schedule: [
            { action: "on", time: "07:00" },
            { action: "off", time: "23:00" }
        ]
    },

    start: function() {
        // Initial schedule check
        this.checkSchedule();

        // Check schedule every minute
        setInterval(() => {
            this.checkSchedule();
        }, 60 * 1000); // 60 seconds * 1000 milliseconds
    },

    checkSchedule: function() {
        const now = moment();
        const currentTime = now.format("HH:mm");

        this.config.schedule.forEach(entry => {
            if (entry.time === currentTime) {
                if (entry.action === "on") {
                    this.sendSocketNotification("WAKE_MONITOR");
                } else if (entry.action === "off") {
                    this.sendSocketNotification("SLEEP_MONITOR");
                }
            }
        });
    },

    socketNotificationReceived: function(notification, payload) {
        console.log("MMPowerScheduler Module received notification:", notification);
    }
});
