import express from 'express';
import { pool } from '../config/database.js';

const itemRouter = express.Router();

itemRouter.get('/items', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM inventory_items ORDER BY id DESC'
        );
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching items:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch items'
        });
    }
});

itemRouter.get('/items/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'SELECT * FROM inventory_items WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Item not found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching item:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch item'
        });
    }
});

itemRouter.post('/addItems', async (req, res) => {
    try {
        const { item_name, quantity, per_unit_price } = req.body;

        // Validation
        if (!item_name || !quantity || !per_unit_price) {
            return res.status(400).json({
                success: false,
                error: 'All fields are required'
            });
        }

        if (quantity <= 0 || per_unit_price <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Quantity and price must be positive values'
            });
        }

        const total_price = quantity * per_unit_price;

        const result = await pool.query(
            'INSERT INTO inventory_items (item_name, quantity, per_unit_price, total_price) VALUES ($1, $2, $3, $4) RETURNING *',
            [item_name, quantity, per_unit_price, total_price]
        );

        console.log('✅ Item added successfully:', result.rows[0]);

        res.status(201).json({
            success: true,
            message: 'Item added successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error adding item:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add item: ' + error.message
        });
    }
});

itemRouter.get('/health-simple', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// Update item
itemRouter.put('/items/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { item_name, quantity, per_unit_price } = req.body;

        // Validation
        if (!item_name || !quantity || !per_unit_price) {
            return res.status(400).json({
                success: false,
                error: 'All fields are required'
            });
        }

        const total_price = quantity * per_unit_price;

        const result = await pool.query(
            'UPDATE inventory_items SET item_name = $1, quantity = $2, per_unit_price = $3, total_price = $4 WHERE id = $5 RETURNING *',
            [item_name, quantity, per_unit_price, total_price, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Item not found'
            });
        }

        res.json({
            success: true,
            message: 'Item updated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating item:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update item'
        });
    }
});

// Update multiple items
itemRouter.put('/items/bulk/update', async (req, res) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const { items } = req.body;

        if (!items || !Array.isArray(items)) {
            return res.status(400).json({
                success: false,
                error: 'Items array is required'
            });
        }

        const updatePromises = items.map(async (item) => {
            const total_price = item.quantity * item.per_unit_price;
            await client.query(
                'UPDATE inventory_items SET item_name = $1, quantity = $2, per_unit_price = $3, total_price = $4 WHERE id = $5',
                [item.item_name, item.quantity, item.per_unit_price, total_price, item.id]
            );
        });

        await Promise.all(updatePromises);
        await client.query('COMMIT');

        // Fetch all updated items
        const result = await pool.query(
            'SELECT * FROM inventory_items ORDER BY id DESC'
        );

        res.json({
            success: true,
            message: 'All items updated successfully',
            data: result.rows
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating items:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update items'
        });
    } finally {
        client.release();
    }
});

// Delete item
itemRouter.delete('/items/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM inventory_items WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Item not found'
            });
        }

        res.json({
            success: true,
            message: 'Item deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting item:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete item'
        });
    }
});

// Get discount by coupon code
itemRouter.get('/discount/:couponCode', async (req, res) => {
    try {
        const { couponCode } = req.params;
        const couponCodeClean = couponCode.trim();

        const result = await pool.query(
            'SELECT * FROM discount_coupons WHERE coupon_code = $1 AND is_active = TRUE',
            [couponCodeClean]
        );

        if (result.rows.length > 0) {
            console.log('Fetched coupon:', result.rows[0]);
            res.json({
                success: true,
                data: result.rows[0]
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'Invalid or inactive coupon code'
            });
        }
    } catch (error) {
        console.error('Error fetching discount:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch discount'
        });
    }
});

// Health check
itemRouter.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({
            success: true,
            message: 'Server and database are running properly',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Database connection failed'
        });
    }
});

export default itemRouter;