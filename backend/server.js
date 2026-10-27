require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});

// Test PostgreSQL connection
pool.connect()
    .then((client) => {
        console.log("PostgreSQL connected successfully");
        client.release();
    })
    .catch((err) => {
        console.error("PostgreSQL connection failed:", err.message);
    });

// =========================
// HEALTH CHECK
// =========================

app.get("/health", (req, res) => {
    res.json({
        success: true,
        message: "FoodRush API is running"
    });
});

// =========================
// FOOD DATA
// =========================

const foods = [
    {
        id: 1,
        name: "Margherita Pizza",
        restaurant: "Pizza Corner",
        category: "Pizza",
        price: 249,
        rating: 4.7,
        image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800"
    },
    {
        id: 2,
        name: "Chicken Burger",
        restaurant: "Burger House",
        category: "Burger",
        price: 199,
        rating: 4.6,
        image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800"
    },
    {
        id: 3,
        name: "Chicken Biryani",
        restaurant: "Biryani House",
        category: "Biryani",
        price: 299,
        rating: 4.8,
        image: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=800"
    },
    {
        id: 4,
        name: "Chicken Noodles",
        restaurant: "Wok & Noodles",
        category: "Chinese",
        price: 229,
        rating: 4.5,
        image: "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=800"
    },
    {
        id: 5,
        name: "Paneer Pizza",
        restaurant: "Pizza Corner",
        category: "Pizza",
        price: 279,
        rating: 4.6,
        image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800"
    },
    {
        id: 6,
        name: "Classic Cheeseburger",
        restaurant: "Burger House",
        category: "Burger",
        price: 219,
        rating: 4.7,
        image: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=800"
    },
    {
        id: 7,
        name: "Mutton Biryani",
        restaurant: "Biryani House",
        category: "Biryani",
        price: 349,
        rating: 4.9,
        image: "https://images.unsplash.com/photo-1631515242808-497c3fbd3972?w=800"
    },
    {
        id: 8,
        name: "Chocolate Cake",
        restaurant: "Sweet Treats",
        category: "Dessert",
        price: 179,
        rating: 4.5,
        image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800"
    }
];

// =========================
// GET FOODS
// =========================

app.get("/api/foods", (req, res) => {
    res.json({
        success: true,
        count: foods.length,
        foods
    });
});

// =========================
// REGISTER
// =========================

app.post("/api/auth/register", async (req, res) => {

    try {

        const { name, email, phone, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email and password are required"
            });
        }

        const existingUser = await pool.query(
            "SELECT id FROM users WHERE email = $1",
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Email already registered"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.query(
            `INSERT INTO users
            (name, email, phone, password)
            VALUES ($1, $2, $3, $4)
            RETURNING id, name, email, phone, role`,
            [name, email, phone || null, hashedPassword]
        );

        res.status(201).json({
            success: true,
            message: "Registration successful",
            user: result.rows[0]
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Registration failed"
        });
    }
});

// =========================
// LOGIN
// =========================

app.post("/api/auth/login", async (req, res) => {

    try {

        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        const result = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const user = result.rows[0];

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d"
            }
        );

        res.json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role
            }
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Login failed"
        });
    }
});

// =========================
// AUTH MIDDLEWARE
// =========================

function authenticateToken(req, res, next) {

    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            success: false,
            message: "Access token required"
        });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Invalid token"
        });
    }

    jwt.verify(
        token,
        process.env.JWT_SECRET,
        (err, user) => {

            if (err) {
                return res.status(403).json({
                    success: false,
                    message: "Invalid or expired token"
                });
            }

            req.user = user;

            next();
        }
    );
}

// =========================
// GET USERS
// =========================

app.get("/api/users", async (req, res) => {

    try {

        const result = await pool.query(
            `SELECT id, name, email, phone, role, created_at
             FROM users
             ORDER BY id DESC`
        );

        res.json({
            success: true,
            users: result.rows
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch users"
        });
    }
});

// =========================
// CREATE ORDER
// =========================

app.post("/api/orders", authenticateToken, async (req, res) => {

    try {

        const {
            items,
            total_amount,
            delivery_address,
            payment_method = "COD"
        } = req.body;

        if (
            !Array.isArray(items) ||
            items.length === 0 ||
            !Number.isFinite(Number(total_amount)) ||
            Number(total_amount) <= 0 ||
            typeof delivery_address !== "string" ||
            !delivery_address.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Valid items, total amount and delivery address are required"
            });
        }

        if (!["COD", "UPI"].includes(payment_method)) {
            return res.status(400).json({
                success: false,
                message: "Payment method must be COD or UPI"
            });
        }

        const result = await pool.query(
            `INSERT INTO orders
            (user_id, items, total_amount, delivery_address, payment_method)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *`,
            [
                req.user.id,
                JSON.stringify(items),
                Number(total_amount),
                delivery_address.trim(),
                payment_method
            ]
        );

        res.status(201).json({
            success: true,
            message: "Order placed successfully",
            order: result.rows[0]
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to place order"
        });
    }
});

// =========================
// GET MY ORDERS
// =========================

app.get("/api/orders", authenticateToken, async (req, res) => {

    try {

        const result = await pool.query(
            `SELECT *
             FROM orders
             WHERE user_id = $1
             ORDER BY created_at DESC`,
            [req.user.id]
        );

        res.json({
            success: true,
            orders: result.rows
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch orders"
        });
    }
});


// =========================
// MY PROFILE
// =========================

app.get("/api/profile", authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, name, email, phone, address, role, created_at
             FROM users WHERE id = $1`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.json({ success: true, profile: result.rows[0] });
    } catch (error) {
        console.error("Get profile error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch profile"
        });
    }
});

app.put("/api/profile", authenticateToken, async (req, res) => {
    try {
        const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
        const phone = typeof req.body.phone === "string" ? req.body.phone.trim() : "";
        const address = typeof req.body.address === "string" ? req.body.address.trim() : "";

        if (!name || name.length > 150) {
            return res.status(400).json({
                success: false,
                message: "Name is required and must be at most 150 characters"
            });
        }

        if (phone.length > 30 || address.length > 2000) {
            return res.status(400).json({
                success: false,
                message: "Phone or address is too long"
            });
        }

        const result = await pool.query(
            `UPDATE users
             SET name = $1, phone = $2, address = $3
             WHERE id = $4
             RETURNING id, name, email, phone, address, role, created_at`,
            [name, phone || null, address || null, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.json({
            success: true,
            message: "Profile updated successfully",
            profile: result.rows[0]
        });
    } catch (error) {
        console.error("Update profile error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update profile"
        });
    }
});

// =========================
// GET ONE OF MY ORDERS
// =========================

app.get("/api/orders/:id", authenticateToken, async (req, res) => {
    try {
        const orderId = Number(req.params.id);

        if (!Number.isInteger(orderId) || orderId < 1) {
            return res.status(400).json({
                success: false,
                message: "Invalid order ID"
            });
        }

        const result = await pool.query(
            `SELECT o.*, r.rating, r.review,
                    r.created_at AS review_created_at
             FROM orders o
             LEFT JOIN order_reviews r
               ON r.order_id = o.id AND r.user_id = o.user_id
             WHERE o.id = $1 AND o.user_id = $2`,
            [orderId, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        res.json({ success: true, order: result.rows[0] });
    } catch (error) {
        console.error("Get order detail error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch order details"
        });
    }
});

// =========================
// RATE OR REVIEW MY ORDER
// =========================

app.post("/api/orders/:id/review", authenticateToken, async (req, res) => {
    try {
        const orderId = Number(req.params.id);
        const rating = Number(req.body.rating);
        const review = typeof req.body.review === "string"
            ? req.body.review.trim()
            : "";

        if (!Number.isInteger(orderId) || orderId < 1) {
            return res.status(400).json({
                success: false,
                message: "Invalid order ID"
            });
        }

        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: "Rating must be between 1 and 5 stars"
            });
        }

        if (review.length > 2000) {
            return res.status(400).json({
                success: false,
                message: "Review must be 2000 characters or fewer"
            });
        }

        const ownedOrder = await pool.query(
            "SELECT id FROM orders WHERE id = $1 AND user_id = $2",
            [orderId, req.user.id]
        );

        if (ownedOrder.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        const result = await pool.query(
            `INSERT INTO order_reviews (order_id, user_id, rating, review)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (order_id) DO UPDATE
             SET rating = EXCLUDED.rating,
                 review = EXCLUDED.review,
                 created_at = CURRENT_TIMESTAMP
             WHERE order_reviews.user_id = EXCLUDED.user_id
             RETURNING id, order_id, user_id, rating, review, created_at`,
            [orderId, req.user.id, rating, review || null]
        );

        if (result.rows.length === 0) {
            return res.status(409).json({
                success: false,
                message: "This order already has a review from another user"
            });
        }

        res.status(200).json({
            success: true,
            message: "Review saved successfully",
            review: result.rows[0]
        });
    } catch (error) {
        console.error("Save review error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to save review"
        });
    }
});

// =========================
// START SERVER
// =========================

app.listen(PORT, "0.0.0.0", () => {

    console.log(
        `FoodRush backend running on port ${PORT}`
    );

});
