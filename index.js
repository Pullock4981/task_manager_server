require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;

// Enable CORS for all origins
app.use(cors());
app.use(express.json());

// MongoDB connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.7wyxuei.mongodb.net/?retryWrites=true&w=majority`;
let client;
let db;

async function connectDB() {
    if (!client) {
        client = new MongoClient(uri);
        await client.connect();
        db = client.db("taskManager");
        console.log("MongoDB connected");
    }
    return db;
}

// ===================== TASK ROUTES =====================

// GET all tasks
app.get("/tasks", async (req, res) => {
    try {
        const db = await connectDB();
        const tasks = await db.collection("tasks").find().toArray();
        res.json(tasks);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch tasks" });
    }
});

// GET single task
app.get("/tasks/:id", async (req, res) => {
    try {
        const db = await connectDB();
        const task = await db.collection("tasks").findOne({ _id: new ObjectId(req.params.id) });
        res.json(task);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch task" });
    }
});

// CREATE task
app.post("/tasks", async (req, res) => {
    const { title, description, userEmail } = req.body;
    if (!title || !userEmail) return res.status(400).json({ message: "Title and userEmail are required" });

    const newTask = { title, description: description || "", userEmail, completed: false, createdAt: new Date() };

    try {
        const db = await connectDB();
        const result = await db.collection("tasks").insertOne(newTask);
        const createdTask = await db.collection("tasks").findOne({ _id: result.insertedId });
        res.status(201).json(createdTask);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to add task" });
    }
});

// UPDATE task
app.put("/tasks/:id", async (req, res) => {
    try {
        const db = await connectDB();
        const result = await db.collection("tasks").updateOne({ _id: new ObjectId(req.params.id) }, { $set: req.body });
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to update task" });
    }
});

// DELETE task
app.delete("/tasks/:id", async (req, res) => {
    try {
        const db = await connectDB();
        const result = await db.collection("tasks").deleteOne({ _id: new ObjectId(req.params.id) });
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to delete task" });
    }
});

// GET tasks for a specific user
app.get("/tasks/users/:email", async (req, res) => {
    const email = req.params.email;
    if (!email) return res.status(400).json({ message: "Email is required" });

    try {
        const db = await connectDB();
        const tasks = await db.collection("tasks").find({ userEmail: email }).toArray();
        res.json(tasks);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch user tasks" });
    }
});

// ===================== USER ROUTES =====================

// GET user by email
app.get("/users", async (req, res) => {
    try {
        const db = await connectDB();
        const email = req.query.email;
        const query = email ? { email } : {};
        const users = await db.collection("users").find(query).toArray();
        res.json(email ? users[0] : users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch user" });
    }
});

// Add or update user
app.post("/users", async (req, res) => {
    const { name, email, photoURL } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    try {
        const db = await connectDB();
        const usersCollection = db.collection("users");
        const existingUser = await usersCollection.findOne({ email });

        if (existingUser) {
            await usersCollection.updateOne({ email }, { $set: { name, photoURL } });
            const updatedUser = await usersCollection.findOne({ email });
            res.json(updatedUser);
        } else {
            const newUser = { name, email, photoURL, createdAt: new Date() };
            const result = await usersCollection.insertOne(newUser);
            const createdUser = await usersCollection.findOne({ _id: result.insertedId });
            res.status(201).json(createdUser);
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to add/update user" });
    }
});

// Health check
app.get("/", (req, res) => res.send("Task Manager API is running!"));

// Start server
app.listen(port, () => console.log(`Server running on port ${port}`));
