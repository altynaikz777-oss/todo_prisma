import winston from "winston";
import { Request, Response, NextFunction } from "express";

const { combine, timestamp, json, colorize, printf } = winston.format;

const serializeErr = winston.format((info) => {
  if (info.err instanceof Error) {
    info.err = { message: info.err.message, stack: info.err.stack };
  }
  return info;
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: combine(timestamp(),  serializeErr(), json()),
  transports: [
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
    new winston.transports.Console({
      format: combine(
        serializeErr(),
        colorize(),
        timestamp({ format: "HH:mm:ss" }),
        printf(({ level, message, timestamp, ...meta }) => {
          const extra = Object.keys(meta).length
            ? " " + JSON.stringify(meta)
            : "";
          return `${timestamp} ${level}: ${message}${extra}`;
        }),
      ),
    }),
  ],
});

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const start = Date.now();
  res.on("finish", () => {
    const level =
      res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
    logger.log(level, `${req.method} ${req.originalUrl}`, {
      status: res.statusCode,
      ms: Date.now() - start,
    });
  });
  next();
};
