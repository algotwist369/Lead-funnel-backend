/**
 * Utility to wrap async functions and catch errors, passing them to the next middleware.
 * This removes the need for repeated try-catch blocks in controllers.
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
