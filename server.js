import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { pool, testConnection, initializeDatabase } from './config/database.js';
import itemRouter from './Routes/Items.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Database initialization
async function startServer() {
    try {
        // Test database connection
        const isConnected = await testConnection();
        if (!isConnected) {
            console.error('❌ Cannot start server without database connection');
            process.exit(1);
        }

        // Initialize database tables
        await initializeDatabase();

        // Start server
        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('❌ Server startup failed:', error);
        process.exit(1);
    }
}

// API Routes
app.use('/api', itemRouter);

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: `Endpoint ${req.method} ${req.originalUrl} not found`
    });
});

// Start the server
startServer();