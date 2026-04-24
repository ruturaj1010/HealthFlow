const logger = require("../utils/logger");

const errorHandler = (err, req, res, next) => {
    logger.error("Unhandled application error", {
        path: req.path,
        method: req.method,
        message: err.message,
        stack: err.stack,
    });

    return res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal Server Error",
    });
};

module.exports = errorHandler;
