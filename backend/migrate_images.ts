// @ts-nocheck
import { initializeFirebase, db } from "./src/config/firebase";
import fs from "fs";
import path from "path";
import http from "http";
import https from "https";
import { v4 as uuidv4 } from "uuid";

initializeFirebase();

const uploadDir = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

function downloadImage(url: string): Promise<Buffer | null> {
  return new Promise((resolve) => {
    try {
      const client = url.startsWith("https") ? https : http;
      client.get(url, (res) => {
        if (res.statusCode === 200) {
          const chunks: any[] = [];
          res.on("data", (chunk) => chunks.push(chunk));
          res.on("end", () => resolve(Buffer.concat(chunks)));
        } else {
          resolve(null);
        }
      }).on("error", () => resolve(null));
    } catch {
      resolve(null);
    }
  });
}

async function migrateUrl(rawUrl: string, uid: string, fieldName: string): Promise<string | null> {
  if (!rawUrl || typeof rawUrl !== "string") return rawUrl;

  // If already a permanent URL (not uguu and not local path), keep it
  if (!rawUrl.includes("uguu.se") && !rawUrl.startsWith("/data/")) {
    return rawUrl;
  }

  // If local phone path, it cannot be recovered from server
  if (rawUrl.startsWith("/data/")) {
    console.log(`[Clean] Removing invalid local device path for user ${uid} (${fieldName}): ${rawUrl}`);
    return null;
  }

  // Try to download from temporary host
  console.log(`[Migrate] Fetching temporary image for user ${uid} (${fieldName}): ${rawUrl}`);
  const buffer = await downloadImage(rawUrl);

  if (buffer && buffer.length > 100) {
    const ext = rawUrl.split(".").pop()?.split("?")[0] || "jpg";
    const filename = `permanent_${Date.now()}_${uuidv4().slice(0, 8)}.${ext}`;
    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, buffer);

    const permanentUrl = `http://localhost:5000/uploads/${filename}`;
    console.log(`[Migrate] Successfully saved permanently: ${permanentUrl}`);
    return permanentUrl;
  } else {
    console.log(`[Migrate] Image at ${rawUrl} is already expired (404). Clearing invalid reference.`);
    return null;
  }
}

async function runMigration() {
  console.log("=== STARTING PERMANENT IMAGE MIGRATION ===");
  const usersSnap = await db.collection("users").get();
  console.log(`Found ${usersSnap.size} user documents to inspect.`);

  let updatedCount = 0;

  for (const doc of usersSnap.docs) {
    const data = doc.data();
    const updates: any = {};

    if (data.profileImage) {
      const newUrl = await migrateUrl(data.profileImage, doc.id, "profileImage");
      if (newUrl !== data.profileImage) updates.profileImage = newUrl;
    }

    if (data.pendingProfileImage) {
      const newUrl = await migrateUrl(data.pendingProfileImage, doc.id, "pendingProfileImage");
      if (newUrl !== data.pendingProfileImage) updates.pendingProfileImage = newUrl;
    }

    if (Array.isArray(data.galleryImages) && data.galleryImages.length > 0) {
      const newGallery = await Promise.all(
        data.galleryImages.map((u: string) => migrateUrl(u, doc.id, "galleryImages"))
      );
      const filtered = newGallery.filter(Boolean);
      updates.galleryImages = filtered;
    }

    if (Array.isArray(data.pendingGalleryImages) && data.pendingGalleryImages.length > 0) {
      const newPendingGallery = await Promise.all(
        data.pendingGalleryImages.map((u: string) => migrateUrl(u, doc.id, "pendingGalleryImages"))
      );
      const filtered = newPendingGallery.filter(Boolean);
      updates.pendingGalleryImages = filtered;
    }

    if (Object.keys(updates).length > 0) {
      await doc.ref.update(updates);
      updatedCount++;
      console.log(`[Updated] User ${doc.id} (${data.displayName || "User"}) updated.`);
    }
  }

  console.log(`=== MIGRATION COMPLETE: ${updatedCount} users migrated to permanent storage ===`);
}

runMigration().then(() => process.exit(0)).catch(console.error);
