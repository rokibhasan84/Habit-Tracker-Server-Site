import express from "express";
import cors from "cors";
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ===== MongoDB Connection ===== //
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: false,
    deprecationErrors: true,
  },
});

let habitsCollection;

async function run() {
  try {
    await client.connect();
    const db = client.db("habitDB");
    habitsCollection = db.collection("habits");

    console.log("MongoDB connected successfully!");

    
    //   ROUTES
  

    // ADD HABIT (POST)
    app.post("/habits", async (req, res) => {
      try {
        const body = req.body;

        const newHabit = {
          title: body.title,
          category: body.category,
          description: body.description,
          reminderTime: body.reminderTime,
          email: body.email,
          userName: body.userName,
          image: body.image || "",
          isPublic: body.isPublic || false,
          createdAt: new Date(),
          updatedAt: null,
          status: "pending",
          completionDates: [],
          streak: 0,
        };
        console.log(newHabit);
        const result = await habitsCollection.insertOne(newHabit);
        res.send({ success: true, insertedId: result.insertedId });
      } catch (err) {
        console.error("Insert error:", err);
        res.status(500).send({ message: "Database insert failed" });
      }
    });

    // PUBLIC HABITS
    app.get("/public-habits", async (req, res) => {
      try {
        const result = await habitsCollection
          .find({ isPublic: true })
          .sort({ createdAt: -1 })
          .toArray();

        res.send(result);
      } catch (error) {
        res.status(500).send({ error: "Failed to load public habits" });
      }
    });

    // GET HABITS BY USER EMAIL
    app.get("/habits/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const query = { email: email };
        const result = await habitsCollection.find(query).toArray();
        res.send(result);
      } catch (err) {
        console.error("Get habits error:", err);
        res.status(500).send({ message: "Failed to load user's habits" });
      }
    });

    // GET HABITS DETAILS
app.get("/habits/details/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const habit = await habitsCollection.findOne({ _id: new ObjectId(id) });

    if (!habit) {
      return res.status(404).send({ message: "Habit not found" });
    }

    res.send(habit);
  } catch (error) {
    res.status(500).send({ error: "Failed to load habit details" });
  }
});
    // DELETE HABIT BY ID
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
        res.status(500).send({ success: false, message: "Error deleting habit" });
      }
    });

    // UPDATE HABIT
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
            updatedAt: new Date(),
            status: updatedHabit.status,
          },
        };

        const result = await habitsCollection.updateOne(query, updateDoc);

        if (result.modifiedCount > 0) {
          res.send({ success: true });
        } else {
          res.status(404).send({ success: false, message: "Habit not found" });
        }
      } catch (err) {
        res.status(500).send({ success: false });
      }
    });

    // Mark habit as complete for today
// Mark habit as complete (with date + time)
app.put("/habits/complete/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const habit = await habitsCollection.findOne({ _id: new ObjectId(id) });
    if (!habit) {
      return res.status(404).send({ message: "Habit not found" });
    }

    // Today's Date + Time
    const now = new Date();
    const todayDate = now.toISOString().split("T")[0]; // yyyy-mm-dd
    const formattedTime = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    const todayRecord = `${todayDate} ${formattedTime}`;

    // Check if today already completed
    const alreadyCompleted = habit.completionHistory?.some((entry) =>
      entry.startsWith(todayDate),
    );

    if (alreadyCompleted) {
      return res.status(400).send({
        message: "Already completed today!",
      });
    }

    // Add to completion history array
    const updatedHistory = [...(habit.completionHistory || []), todayRecord];

    // Streak calculation
    let streak = habit.streak || 0;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    const completedYesterday = habit.completionHistory?.some((entry) =>
      entry.startsWith(yesterdayStr)
    );

    if (completedYesterday) streak += 1;
    else streak = 1;

    // Update database
    const result = await habitsCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: {
          completionHistory: updatedHistory,
          streak: streak,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );

    res.send({
      success: true,
      updatedHabit: result,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Server error while marking complete" });
  }
});

    // GET ALL HABITS
    app.get("/habits", async (req, res) => {
      try {
        const result = await habitsCollection.find().toArray();
        res.send(result);
      } catch (err) {
        res.status(500).send({ message: "Failed to fetch habits" });
      }
    });

   
}

run();