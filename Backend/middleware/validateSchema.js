const { ZodError } = require("zod");

const formatZodErrors = (issues) =>
    issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
    }));

const validateBody = (schema) => async (req, res, next) => {
    try {
        const parsed = await schema.parseAsync(req.body);
        req.body = parsed;
        return next();
    } catch (error) {
        if (error instanceof ZodError) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: formatZodErrors(error.issues),
            });
        }

        return res.status(500).json({
            success: false,
            message: "Validation error",
            error: error.message,
        });
    }
};

module.exports = {
    validateBody,
};
