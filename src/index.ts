import express, { Request, Response, NextFunction } from "express";
import path from "path";
import "dotenv/config";
import { ZodSchema } from "zod";
import { createTodoSchema, updateTodoSchema, idParamSchema } from "./schemas";
import { prisma, prismaErrorStatus } from "./db";
import { logger, requestLogger } from "./logger";

const app = express();
app.use(express.json());
app.use(requestLogger);
app.use(express.static(path.join(__dirname, "..", "public")));

const validateBody =
  (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res
        .status(400)
        .json({ error: "Validation failed", details: result.error.flatten() });
    }
    req.body = result.data;
    next();
  };

const validateId = (req: Request, res: Response, next: NextFunction) => {
  const result = idParamSchema.safeParse(req.params);
  if (!result.success) {
    return res.status(400).json({ error: "Invalid id" });
  }
  res.locals.id = result.data.id;
  next();
};

const fail = (res: Response, err: unknown, context: string) => {
  const { status, error } = prismaErrorStatus(err);
  if (status >= 500) logger.error(context, { err });
  else logger.warn(context, { code: (err as any)?.code });
  return res.status(status).json({ error });
};

app.get("/todos", async (_req, res) => {
  try {
    res.json(await prisma.todo.findMany({ orderBy: { id: "asc" } }));
  } catch (err) {
    fail(res, err, "GET /todos failed");
  }
});

app.get("/todos/:id", validateId, async (_req, res) => {
  try {
    const todo = await prisma.todo.findUnique({ where: { id: res.locals.id } });
    if (!todo) return res.status(404).json({ error: "Todo not found" });
    res.json(todo);
  } catch (err) {
    fail(res, err, "GET /todos/:id failed");
  }
});

app.post("/todos", validateBody(createTodoSchema), async (req, res) => {
  try {
    const todo = await prisma.todo.create({
      data: { title: req.body.title, completed: req.body.completed },
    });
    logger.info("Todo created", { id: todo.id });
    res.status(201).json(todo);
  } catch (err) {
    fail(res, err, "POST /todos failed");
  }
});

app.put(
  "/todos/:id",
  validateId,
  validateBody(updateTodoSchema),
  async (req, res) => {
    try {
      const todo = await prisma.todo.update({
        where: { id: res.locals.id },
        data: { title: req.body.title, completed: req.body.completed },
      });
      res.json(todo);
    } catch (err) {
      fail(res, err, "PUT /todos/:id failed");
    }
  },
);

app.delete("/todos/:id", validateId, async (_req, res) => {
  try {
    const todo = await prisma.todo.delete({ where: { id: res.locals.id } });
    logger.info("Todo deleted", { id: todo.id });
    res.json(todo);
  } catch (err) {
    fail(res, err, "DELETE /todos/:id failed");
  }
});

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error("Unhandled error", { err });
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  logger.info(`Server running on http://localhost:${PORT}`),
);
