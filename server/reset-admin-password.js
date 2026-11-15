import "./config/env.js";
import bcrypt from "bcryptjs";
import { connectDb, disconnectDb } from "./db.js";
import { User } from "./models/User.js";

function readHidden(prompt) {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
      reject(new Error("Run this tool in a normal Windows Command Prompt or VS Code terminal."));
      return;
    }
    let value = "";
    process.stdout.write(prompt);
    stdin.setEncoding("utf8");
    stdin.setRawMode(true);
    stdin.resume();
    const cleanup = () => {
      stdin.removeListener("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
      process.stdout.write("\n");
    };
    const onData = (chunk) => {
      for (const char of chunk) {
        if (char === "\u0003") {
          cleanup();
          reject(new Error("Cancelled."));
          return;
        }
        if (char === "\r" || char === "\n") {
          cleanup();
          resolve(value);
          return;
        }
        if (char === "\u0008" || char === "\u007f") {
          if (value.length) {
            value = value.slice(0, -1);
            process.stdout.write("\b \b");
          }
          continue;
        }
        if (char >= " " && char !== "\u007f") {
          value += char;
          process.stdout.write("*");
        }
      }
    };
    stdin.on("data", onData);
  });
}

async function main() {
  const password = await readHidden("New ERP-ADMIN password (10-72 characters, input hidden): ");
  if (password.length < 10 || Buffer.byteLength(password, "utf8") > 72) {
    throw new Error("Password must be at least 10 characters and no more than 72 UTF-8 bytes.");
  }
  const confirmation = await readHidden("Confirm new password: ");
  if (password !== confirmation) throw new Error("Passwords do not match. No changes were made.");

  await connectDb();
  const admin = await User.findOne({ code: "ERP-ADMIN", role: "admin" }).select("+passwordHash");
  if (!admin) {
    throw new Error("ERP-ADMIN was not found. Start the ERP API once first; it will create the first administrator if the database has none.");
  }
  admin.passwordHash = await bcrypt.hash(password, 12);
  admin.isActive = true;
  await admin.save();
  console.log("\nERP-ADMIN password successfully reset.");
  console.log("Login ID: ERP-ADMIN");
  console.log("Use the new password you just entered. No other account was changed.");
}

main()
  .catch((error) => {
    console.error(`\nPassword reset failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDb().catch(() => {});
  });
