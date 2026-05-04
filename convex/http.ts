import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

const serveNote = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  const filename = pathParts[pathParts.length - 1];

  if (!filename) {
    return new Response("Not Found", { status: 404 });
  }

  const note = await ctx.runQuery(api.notes.getByFilename, { filename });

  if (!note) {
    return new Response("Note not found", { status: 404 });
  }

  if (note.expiresAt && Date.now() > note.expiresAt) {
    return new Response("Note expired", { status: 410 });
  }

  return new Response(note.content, {
    status: 200,
    headers: {
      "Content-Type": note.mimeType || "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
});

http.route({
  pathPrefix: "/note/",
  method: "GET",
  handler: serveNote,
});

http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(JSON.stringify({ status: "ok", timestamp: Date.now() }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
