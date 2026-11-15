import mongoose from "mongoose";
import { ClassSection } from "./models/ClassSection.js";
import { Marks } from "./models/Marks.js";
import { calculateAssessmentSummary, migrateLegacyCiaValues } from "./utils/assessment.js";

let connectionPromise;

export async function connectDb() {
  const uri = process.env.DATABASE_URL;
  if (!uri) {
    throw new Error("DATABASE_URL is required. Set it in the project-root .env file.");
  }
  if (!/^mongodb(?:\+srv)?:\/\//i.test(uri)) {
    throw new Error("DATABASE_URL must be a valid MongoDB connection string (mongodb:// or mongodb+srv://).");
  }

  mongoose.set("strictQuery", true);
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(uri, {
      serverSelectionTimeoutMS: Number(process.env.DB_SERVER_SELECTION_TIMEOUT_MS || 10000),
      connectTimeoutMS: Number(process.env.DB_CONNECT_TIMEOUT_MS || 10000),
      autoIndex: process.env.NODE_ENV !== "production",
    }).then(async () => {
      // Migrate the former class uniqueness rule (department + semester + section)
      // to include academicYear. This allows the next academic session to reuse
      // the same section without deleting or rewriting any class records.
      const collection = ClassSection.collection;
      await collection.createIndex(
        { department: 1, semester: 1, section: 1, academicYear: 1 },
        { unique: true, name: "department_1_semester_1_section_1_academicYear_1" },
      );
      const indexes = await collection.indexes();
      const legacyIndex = indexes.find((index) => index.name === "department_1_semester_1_section_1");
      if (legacyIndex) {
        await collection.dropIndex(legacyIndex.name);
        console.log("Migrated class-section uniqueness index to include academic year.");
      }

      // Preserve existing records from the former five-CIA layout by mapping
      // CIA 4/5 into Internal 1/2 once. The legacy source fields remain stored
      // (hidden from normal queries) for audit/recovery purposes.
      const legacyMarkRows = await Marks.find({
        $or: [
          { cia4: { $ne: null }, internal1: null },
          { cia5: { $ne: null }, internal2: null },
        ],
      }).select("+cia4 +cia5");
      let migratedMarks = 0;
      for (const row of legacyMarkRows) {
        const migration = migrateLegacyCiaValues(row);
        if (!migration.changed) continue;
        row.set({ ...migration.values, ...calculateAssessmentSummary({ ...row.toObject(), ...migration.values }) });
        await row.save();
        migratedMarks += 1;
      }
      if (migratedMarks) console.log(`Migrated ${migratedMarks} legacy marks record(s): CIA 4→Internal 1, CIA 5→Internal 2.`);

      console.log(`Database connected: ${mongoose.connection.name || "MongoDB"}`);
      return mongoose.connection;
    }).catch((error) => {
      connectionPromise = undefined;
      throw new Error(`Database connection failed: ${error.message}`);
    });
  }
  return connectionPromise;
}

export async function disconnectDb() {
  connectionPromise = undefined;
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}
