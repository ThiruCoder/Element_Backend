import express from 'express'
import { pool } from '../config/database.js';

const itemRouter = express.Router();

// Get all inventory items
itemRouter.get('/items', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM inventory_items ORDER BY id DESC'
        );
        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('Error fetching items:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch items'
        });
    }
});

// Get single item by ID
itemRouter.get('/items/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.execute(
            'SELECT * FROM inventory_items WHERE id = ?',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Item not found'
            });
        }

        res.json({
            success: true,
            data: rows[0]
        });
    } catch (error) {
        console.error('Error fetching item:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch item'
        });
    }
});

// Add new item
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

        const [result] = await pool.execute(
            'INSERT INTO inventory_items (item_name, quantity, per_unit_price, total_price) VALUES (?, ?, ?, ?)',
            [item_name, quantity, per_unit_price, total_price]
        );

        // Fetch the newly created item
        const [newItem] = await pool.execute(
            'SELECT * FROM inventory_items WHERE id = ?',
            [result.insertId]
        );

        res.status(201).json({
            success: true,
            message: 'Item added successfully',
            data: newItem[0]
        });
    } catch (error) {
        console.error('Error adding item:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add item'
        });
    }
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

        const [result] = await pool.execute(
            'UPDATE inventory_items SET item_name = ?, quantity = ?, per_unit_price = ?, total_price = ? WHERE id = ?',
            [item_name, quantity, per_unit_price, total_price, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: 'Item not found'
            });
        }

        // Fetch the updated item
        const [updatedItem] = await pool.execute(
            'SELECT * FROM inventory_items WHERE id = ?',
            [id]
        );

        res.json({
            success: true,
            message: 'Item updated successfully',
            data: updatedItem[0]
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
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const { items } = req.body;

        if (!items || !Array.isArray(items)) {
            return res.status(400).json({
                success: false,
                error: 'Items array is required'
            });
        }

        const updatePromises = items.map(async (item) => {
            const total_price = item.quantity * item.per_unit_price;
            await connection.execute(
                'UPDATE inventory_items SET item_name = ?, quantity = ?, per_unit_price = ?, total_price = ? WHERE id = ?',
                [item.item_name, item.quantity, item.per_unit_price, total_price, item.id]
            );
        });

        await Promise.all(updatePromises);
        await connection.commit();

        // Fetch all updated items
        const [updatedItems] = await pool.execute(
            'SELECT * FROM inventory_items ORDER BY id DESC'
        );

        res.json({
            success: true,
            message: 'All items updated successfully',
            data: updatedItems
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error updating items:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update items'
        });
    } finally {
        connection.release();
    }
});

// Delete item
itemRouter.delete('/items/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await pool.execute(
            'DELETE FROM inventory_items WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
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

itemRouter.get('/discount/:couponCode', async (req, res) => {
    try {
        const { couponCode } = req.params;
        const couponCodeClean = couponCode.trim();
        const [rows] = await pool.execute(
            'SELECT * FROM discount_coupons WHERE coupon_code = ? AND is_active = TRUE',
            [couponCodeClean]
        );

        if (rows.length > 0) {
            console.log('Fetched coupon:', rows[0]);
            res.json({
                success: true,
                data: rows[0]
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

itemRouter.get('/health', async (req, res) => {
    try {
        const [result] = await pool.execute('SELECT 1');
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