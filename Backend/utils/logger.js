const { createLogger, format, transports } = require("winston");

const logger = createLogger({
    level: process.env.LOG_LEVEL || "info",
    format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.json()
    ),
    defaultMeta: { service: "healthflow-backend" },
    transports: [
        new transports.Console(),
        new transports.File({ filename: "app.log" }),
    ],
});

module.exports = logger;
