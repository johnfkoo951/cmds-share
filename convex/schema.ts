import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  notes: defineTable({
    filename: v.string(),
    title: v.string(),
    content: v.string(),
    mimeType: v.string(),
    encrypted: v.boolean(),
    expiresAt: v.optional(v.number()),
  })
    .index("by_filename", ["filename"])
    .index("by_expiresAt", ["expiresAt"]),
});
