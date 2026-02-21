const mongoose = require("mongoose");
const dotenv = require("dotenv");
const app = require("./app.js");

dotenv.config();

const port = process.env.PORT || 5000;
const mongoUri = process.env.MONGO_URI;

if (!mongoUri) {
    console.error("MONGO_URI is required");
    process.exit(1);
}

// MongoDB Connection with improved options
mongoose
    .connect(mongoUri)
    .then(() => {
        console.log("Connected to MongoDB successfully");
        const server = app.listen(port, () => {
            console.log(`Server is running on port ${port} in ${process.env.NODE_ENV || 'development'} mode`);
        });

        // Graceful Shutdown
        const shutdown = () => {
            console.log("Shutting down gracefully...");
            server.close(() => {
                console.log("Closed out remaining connections.");
                mongoose.connection.close(false).then(() => {
                    console.log("MongoDB connection closed.");
                    process.exit(0);
                });
            });

            // Force close after 10s
            setTimeout(() => {
                console.error("Could not close connections in time, forcefully shutting down");
                process.exit(1);
            }, 10000);
        };

        process.on("SIGTERM", shutdown);
        process.on("SIGINT", shutdown);
    })
    .catch((error) => {
        console.error("Failed to connect to MongoDB", error);
        process.exit(1);
    });

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
    console.log(`Error: ${err.message}`);
    // We don't exit here to keep the server running, but we log the error
});
