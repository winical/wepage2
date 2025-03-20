const express = require("express");
const mysql = require("mysql2");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: "http://localhost:3306", credentials: true })); // Adjust for your frontend URL

// MySQL Connection
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "users_db",
    port: 3306
});

db.connect(err => {
    if (err) throw err;
    console.log("Connected to MySQL database.");
});

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey"; // Use environment variables in production

// **User Registration**
app.post("/register", async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    db.query("INSERT INTO users (username, password_hash) VALUES (?, ?)", [username, hashedPassword], (err) => {
        if (err) return res.status(500).json({ error: "User already exists or database error" });
        res.json({ message: "User registered successfully!" });
    });
});

// **User Login & Cookie Setting**
app.post("/login", (req, res) => {
    const { username, password } = req.body;

    db.query("SELECT * FROM users WHERE username = ?", [username], async (err, results) => {
        if (err) return res.status(500).json({ error: "Database error" });
        if (results.length === 0) return res.status(401).json({ error: "User not found" });

        const user = results[0];
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) return res.status(401).json({ error: "Invalid password" });

        // Generate JWT token
        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: "1h" });

        // Set token in a secure HTTP-only cookie
        res.cookie("auth_token", token, { httpOnly: true, secure: false, maxAge: 3600000 }); // Set 'secure: true' for HTTPS
        res.json({ message: "Login successful", redirect: "/dashboard.html" });
    });
});

// **Protected Route Example**
app.get("/profile", (req, res) => {
    const token = req.cookies.auth_token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ error: "Invalid token" });
        res.json({ message: "Access granted", user: decoded });
    });
});

// **Logout**
app.post("/logout", (req, res) => {
    res.clearCookie("auth_token");
    res.json({ message: "Logged out successfully" });
});

// Start the server
app.listen(3000, () => console.log("Server running on port 3306"));
