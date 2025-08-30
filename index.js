require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId, ServerApiVersion } = require("mongodb");


const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.7wyxuei.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

async function run() {
    try {
        // await client.connect();
        console.log("Connected to MongoDB");

        const db = client.db("taskManager");
        const tasksCollection = db.collection("tasks");
        const usersCollection = db.collection("users");

        // Health check
        app.get("/", (req, res) => {
            res.send("Task Manager API is running!");
        });

        // ===================== TASK ROUTES =====================

        // GET all tasks
        app.get("/tasks", async (req, res) => {
            try {
                const tasks = await tasksCollection.find().toArray();
                res.send(tasks);
            } catch (err) {
                res.status(500).send({ message: "Failed to fetch tasks" });
            }
        });

        // GET single task
        app.get("/tasks/:id", async (req, res) => {
            try {
                const task = await tasksCollection.findOne({ _id: new ObjectId(req.params.id) });
                res.send(task);
            } catch (err) {
                res.status(500).send({ message: "Failed to fetch task" });
            }
        });

        // CREATE task
        app.post("/tasks", async (req, res) => {
            const { title, description, userEmail } = req.body;
            if (!title || !userEmail) {
                return res.status(400).send({ message: "Title and userEmail are required" });
            }

            const newTask = {
                title,
                description: description || "",
                userEmail,
                completed: false,
                createdAt: new Date(),
            };

            try {
                const result = await tasksCollection.insertOne(newTask);
                const createdTask = await tasksCollection.findOne({ _id: result.insertedId });
                res.send(createdTask);
            } catch (err) {
                res.status(500).send({ message: "Failed to add task" });
            }
        });

        // UPDATE task
        app.put("/tasks/:id", async (req, res) => {
            try {
                const result = await tasksCollection.updateOne(
                    { _id: new ObjectId(req.params.id) },
                    { $set: req.body }
                );
                res.send(result);
            } catch (err) {
                res.status(500).send({ message: "Failed to update task" });
            }
        });

        // DELETE task
        app.delete("/tasks/:id", async (req, res) => {
            try {
                const result = await tasksCollection.deleteOne({ _id: new ObjectId(req.params.id) });
                res.send(result);
            } catch (err) {
                res.status(500).send({ message: "Failed to delete task" });
            }
        });

        // GET tasks for a specific user
        app.get("/tasks/users/:email", async (req, res) => {
            const email = req.params.email;
            if (!email) return res.status(400).send({ message: "Email is required" });

            try {
                const userTasks = await tasksCollection.find({ userEmail: email }).toArray();
                res.send(userTasks);
            } catch (err) {
                res.status(500).send({ message: "Failed to fetch user tasks" });
            }
        });

        // ===================== USER ROUTES =====================

        // GET user by email
        app.get("/users", async (req, res) => {
            const email = req.query.email;
            if (!email) return res.status(400).send({ message: "Email is required" });

            try {
                const user = await usersCollection.findOne({ email });
                res.send(user);
            } catch (err) {
                res.status(500).send({ message: "Failed to fetch user" });
            }
        });

        // Add or update user
        app.post("/users", async (req, res) => {
            const { name, email, photoURL } = req.body;
            if (!email) return res.status(400).send({ message: "Email is required" });

            try {
                const existingUser = await usersCollection.findOne({ email });

                if (existingUser) {
                    await usersCollection.updateOne(
                        { email },
                        { $set: { name, photoURL } }
                    );
                    const updatedUser = await usersCollection.findOne({ email });
                    res.send(updatedUser);
                } else {
                    const newUser = {
                        name,
                        email,
                        photoURL,
                        createdAt: new Date(),
                    };
                    const result = await usersCollection.insertOne(newUser);
                    const createdUser = await usersCollection.findOne({ _id: result.insertedId });
                    res.send(createdUser);
                }
            } catch (err) {
                res.status(500).send({ message: "Failed to add/update user" });
            }
        });

    } catch (err) {
        console.error("MongoDB connection error:", err);
    }
}

run().catch(console.dir);

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
