import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
import cors from 'cors';
import bodyParser from 'body-parser';
import { pool, testConnection, initializeDatabase } from './config/database.js';
import itemRouter from './Routes/Items.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(bodyParser.json());

app.use((req, res, next) => {
    next();
});

app.use('/api', itemRouter);

app.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Server is working!',
        timestamp: new Date().toISOString()
    });
});

async function initializeDatabaseConnection() {
    try {
        const isConnected = await testConnection();

        if (isConnected) {
            await initializeDatabase();
            console.log('✅ Database setup completed!');
        } else {
            console.log('⚠️ Database connection failed, but server is running');
        }
    } catch (error) {
        console.error('❌ Database initialization error:', error);
    }
}

app.use((error, req, res, next) => {
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: `Endpoint ${req.method} ${req.originalUrl} not found`
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    initializeDatabaseConnection();
});