import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const upload = mutation({
  args: {
    content: v.string(),
    filename: v.string(),
    mimeType: v.string(),
    encrypted: v.optional(v.boolean()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("notes")
      .withIndex("by_filename", (q) => q.eq("filename", args.filename))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        content: args.content,
        mimeType: args.mimeType,
        encrypted: args.encrypted ?? false,
        expiresAt: args.expiresAt,
      });
      return { id: existing._id, filename: args.filename, updated: true };
    }

    const id = await ctx.db.insert("notes", {
      filename: args.filename,
      title: args.filename.replace(/\.[^.]+$/, ""),
      content: args.content,
      mimeType: args.mimeType,
      encrypted: args.encrypted ?? false,
      expiresAt: args.expiresAt,
    });

    return { id, filename: args.filename, updated: false };
  },
});

export const deleteNote = mutation({
  args: { filename: v.string() },
  handler: async (ctx, args) => {
    const note = await ctx.db
      .query("notes")
      .withIndex("by_filename", (q) => q.eq("filename", args.filename))
      .first();

    if (note) {
      await ctx.db.delete(note._id);
      return { success: true, deleted: true };
    }
    return { success: true, deleted: false };
  },
});

export const health = query({
  args: {},
  handler: () => {
    return { status: "ok", timestamp: Date.now() };
  },
});

export const getByFilename = query({
  args: { filename: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notes")
      .withIndex("by_filename", (q) => q.eq("filename", args.filename))
      .first();
  },
});
