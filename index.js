
import express from "express";
import cors from "cors";
import { MongoClient, ServerApiVersion } from "mongodb";
import dotenv from "dotenv";
import { ObjectId } from "mongodb";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ✅ MongoDB URI
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: false,
    deprecationErrors: true,
  },
});

// ✅ Connection একবার খুলে রেখে পুরো প্রজেক্টে reuse করবো
let habitsCollection;

async function run() {
  try {
    await client.connect();
    const db = client.db("habitDB");
    habitsCollection = db.collection("habits");

    console.log("✅ MongoDB connected successfully!");

    // ---- ROUTES ----

    // Add Habit (POST)
    app.post("/habits", async (req, res) => {
      try {
        const habit = req.body;
        const result = await habitsCollection.insertOne(habit);
        res.send(result);
      } catch (err) {
        console.error("Insert error:", err);
        res.status(500).send({ message: "Database insert failed" });
      }
    });

    // Get All Habits (GET)
    app.get("/habits", async (req, res) => {
      try {
        const result = await habitsCollection.find().toArray();
        res.send(result);
      } catch (err) {
        res.status(500).send({ message: "Failed to fetch habits" });
      }
    });


// ✅ Delete habit by id
app.delete("/habits/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await habitsCollection.deleteOne(query);
    if (result.deletedCount === 1) {
      res.send({ success: true, message: "Habit deleted successfully!" });
    } else {
      res.status(404).send({ success: false, message: "Habit not found!" });
    }
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).send({ success: false, message: "Server error while deleting habit." });
  }
});

    // ✅ Get habits by user email
app.get("/habits/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const query = { userEmail: email };
    const result = await habitsCollection.find(query).toArray();
    res.send(result);
  } catch (err) {
    console.error("Get habits error:", err);
    res.status(500).send({ message: "Failed to load user's habits" });
  }
});


// ✅ Update habit by id
app.put("/habits/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const updatedHabit = req.body;
    const query = { _id: new ObjectId(id) };

    const updateDoc = {
      $set: {
        title: updatedHabit.title,
        category: updatedHabit.category,
        description: updatedHabit.description,
        reminderTime: updatedHabit.reminderTime,
        UpdateAt: new Date(),
      },
    };

    const result = await habitsCollection.updateOne(query, updateDoc);
    if (result.modifiedCount > 0) {
      res.send({ success: true, message: "Habit updated successfully!" });
    } else {
      res.status(404).send({ success: false, message: "Habit not found or unchanged" });
    }
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).send({ success: false, message: "Server error while updating habit" });
  }
});


    // ✅ সার্ভার লিসেন এখানে রাখো
    app.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
    });

  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err);
  }
}

run();























// import express from "express";
// import cors from "cors";
// import { MongoClient, ServerApiVersion } from "mongodb";
// import dotenv from "dotenv";

// dotenv.config();

// const app = express();
// const port = process.env.PORT || 5000;

// // middleware
// app.use(cors());
// app.use(express.json());

// // MongoDB connection
// const uri = process.env.MONGO_URI;
// const client = new MongoClient(uri, {
//   serverApi: {
//     version: ServerApiVersion.v1,
//     strict: true,
//     deprecationErrors: true,
//   }
// });

// async function run() {
//   try {
//     const db = client.db("habitDB");
//     const habitsCollection = db.collection("habits");

//     // Add Habit (POST)
//     app.post("/habits", async (req, res) => {
//       const habit = req.body;
//       const result = await habitsCollection.insertOne(habit);
//       res.send(result);
//     });

//     // Get all habits (GET)
//     app.get("/habits", async (req, res) => {
//       const result = await habitsCollection.find().toArray();
//       res.send(result);
//     });

//     console.log("✅ MongoDB connected successfully!");
//   } finally {
//      // Ensures that the client will close when you finish/error
//     // await client.close();
//   }
// }
// run().catch(console.dir);

// app.listen(port, () => {
//   console.log(`🚀 Server running on port ${port}`);
// });