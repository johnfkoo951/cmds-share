import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "cleanup expired notes",
  { hours: 1 },
  internal.notes.cleanupExpired,
);

export default crons;
