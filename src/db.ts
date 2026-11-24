import { PrismaClient } from "@prisma/client";
import { logger } from "./logger";

export const prisma = new PrismaClient({
  log: [
    { emit: "event", level: "warn" },
    { emit: "event", level: "error" },
  ],
});

type LogEvent = { message: string; target: string };
prisma.$on("warn", (e: LogEvent) =>
  logger.warn(e.message, { target: e.target }),
);
prisma.$on("error", (e: LogEvent) =>
  logger.error(e.message, { target: e.target }),
);

export const prismaErrorStatus = (err: unknown) => {
  const code = (err as { code?: string } | null)?.code;
  if (code === "P2002") return { status: 409, error: "Already exists" };
  if (code === "P2025") {console.log(err); return { status: 404, error: "Not found" }};
  if (code === "P2003")
    return { status: 400, error: "Related record does not exist" };
  return { status: 500, error: "Database error" };
};
