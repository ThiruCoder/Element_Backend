import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

const dbConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
};

// Alternative configuration using individual environment variables
if (!process.env.DATABASE_URL) {
    dbConfig.connectionString = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}/${process.env.DB_NAME}`;
    dbConfig.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(dbConfig);

async function testConnection() {
    try {
        const client = await pool.connect();
        client.release();
        return true;
    } catch (error) {
        return false;
    }
}

async function initializeDatabase() {
    try {
        const client = await pool.connect();

        // Create inventory_items table
        await client.query(`
            CREATE TABLE IF NOT EXISTS inventory_items (
                id SERIAL PRIMARY KEY,
                item_name VARCHAR(255) NOT NULL,
                quantity INT NOT NULL,
                per_unit_price DECIMAL(10,2) NOT NULL,
                total_price DECIMAL(10,2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create discount_coupons table
        await client.query(`
            CREATE TABLE IF NOT EXISTS discount_coupons (
                id SERIAL PRIMARY KEY,
                coupon_code VARCHAR(50) UNIQUE NOT NULL,
                discount_percentage DECIMAL(5,2) NOT NULL,
                is_active BOOLEAN DEFAULT TRUE
            )
        `);

        // Insert test coupons
        await client.query(`
            INSERT INTO discount_coupons (coupon_code, discount_percentage, is_active) 
            VALUES 
            ('1212', 5, TRUE),
            ('1313', 10, TRUE),
            ('1414', 15, TRUE),
            ('1515', 20, TRUE),
            ('1616', 25, TRUE),
            ('1717', 50, TRUE)
            ON CONFLICT (coupon_code) DO NOTHING
        `);

        client.release();
        console.log('✅ Database tables initialized successfully!');
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
    }
}

export { pool, testConnection, initializeDatabase };