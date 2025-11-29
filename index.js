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
    //Home Card
    app.get("/public-habits/home-card", async (req, res) => {
      try {
        const result = await habitsCollection
          .find({ isPublic: true })
          .sort({ createdAt: -1 })
          .limit(6)
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

// Toggle Complete with streak calculation
app.put("/habits/toggle-complete/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const habit = await habitsCollection.findOne({ _id: new ObjectId(id) });

    if (!habit) {
      return res.status(404).send({ message: "Habit not found" });
    }

    const today = new Date();
    const todayStr = today.toDateString();

    let completionDates = habit.completionDates || [];
    let status = habit.status;

    // Check if already completed today
    const alreadyCompleted = completionDates.some(
      (d) => new Date(d).toDateString() === todayStr
    );

    // UNDO today
    if (alreadyCompleted) {
      completionDates = completionDates.filter(
        (d) => new Date(d).toDateString() !== todayStr
      );

      // Recalculate streak after undo
      let streak = calculateStreak(completionDates);

      await habitsCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            completionDates,
            status: "pending",
            streak,
          },
        }
      );

      return res.send({
        success: true,
        status: "pending",
        completionDates,
        streak,
      });
    }

    // ADD today
    completionDates.push(today);

    // SORT dates
    completionDates.sort((a, b) => new Date(a) - new Date(b));

    // Calculate new streak
    let streak = calculateStreak(completionDates);

    await habitsCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          completionDates,
          status: "completed",
          streak,
        },
      }
    );

    res.send({
      success: true,
      status: "completed",
      completionDates,
      streak,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Server error" });
  }
});

// Helper function to calculate streak
function calculateStreak(dates) {
  if (dates.length === 0) return 0;

  let streak = 1;
  for (let i = dates.length - 1; i > 0; i--) {
    const current = new Date(dates[i]);
    const previous = new Date(dates[i - 1]);

    const diff = (current - previous) / (1000 * 60 * 60 * 24);

    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}


// Toggle only the status field (completed <-> pending) WITHOUT touching completionDates
app.put("/habits/toggle-status/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const habit = await habitsCollection.findOne({ _id: new ObjectId(id) });
    if (!habit) return res.status(404).send({ success: false, message: "Habit not found" });

    const newStatus = habit.status === "completed" ? "pending" : "completed";

    await habitsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: newStatus, updatedAt: new Date() } }
    );

    res.send({ success: true, status: newStatus });
  } catch (err) {
    console.error(err);
    res.status(500).send({ success: false, message: "Server error" });
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
    

  app.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
    });

  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err);
  }
}

run();