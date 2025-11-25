import mysql from 'mysql2/promise';

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'thiru12',
    database: 'inventory_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// connection pool
const pool = mysql.createPool(dbConfig);

async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Connected to MySQL database successfully!');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
}

// Initialize database and tables
async function initializeDatabase() {
    try {
        const connection = await pool.getConnection();

        // Create database if not exists
        await connection.query(`CREATE DATABASE IF NOT EXISTS inventory_db`);
        await connection.query(`USE inventory_db`);

        // Create inventory_items table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS inventory_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                item_name VARCHAR(255) NOT NULL,
                quantity INT NOT NULL,
                per_unit_price DECIMAL(10,2) NOT NULL,
                total_price DECIMAL(10,2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Create discount_coupons table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS discount_coupons (
                id INT AUTO_INCREMENT PRIMARY KEY,
                coupon_code VARCHAR(50) UNIQUE NOT NULL,
                discount_percentage DECIMAL(5,2) NOT NULL,
                is_active BOOLEAN DEFAULT TRUE
            )
        `);

        // Insert multiple test coupons
        await connection.query(`
            INSERT IGNORE INTO discount_coupons (coupon_code, discount_percentage, is_active) 
            VALUES 
        ('1212', 5, TRUE),
        ('1313', 10, TRUE),
        ('1414', 15, TRUE),
        ('1515', 20, TRUE),
        ('1616', 25, TRUE),
        ('1717', 50, TRUE)
        `);

        connection.release();

    } catch (error) {
        console.error('❌ Database initialization failed:', error);
    }
}

export { pool, testConnection, initializeDatabase };