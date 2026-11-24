import express, { Request, Response, NextFunction } from "express";
import path from "path";
import "dotenv/config";
import { ZodSchema } from "zod";
import { authenticate, requireRole } from "./auth";
import {
  createTodoSchema,
  updateTodoSchema,
  idParamSchema,
  registerSchema,
  loginSchema,
  roleSchema,
} from "./schemas";
import { prisma, prismaErrorStatus } from "./db";
import { logger, requestLogger } from "./logger";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

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

app.post("/auth/register", validateBody(registerSchema), async (req, res) => {
  try {
    const hash = await bcrypt.hash(req.body.password, 10);
    const user = await prisma.user.create({
      data: { email: req.body.email, password: hash },
    });
    logger.info("User registered successfully!!");
    res.status(201).json({ id: user.id, email: user.email, role: user.role });
  } catch (err) {
    fail(res, err, "POST /auth/register failed");
  }
});

app.post("/auth/login", validateBody(loginSchema), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { email: req.body.email },
    });
    const checkPass =
      user && (await bcrypt.compare(req.body.password, user.password));
    if (!checkPass || !user)
      return res.status(400).json({ err: "Password or email is incorrect" });
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "12h" },
    );
    res.json({ token });
  } catch (err) {
    fail(res, err, "POST /auth/login failed");
  }
});

app.patch(
  "/users/:id/role",
  validateId,
  authenticate,
  requireRole("ADMIN"),
  validateBody(roleSchema),
  async (req, res) => {
    try {
      const user = await prisma.user.update({
        where: { id: res.locals.id },
        data: { role: req.body.role },
        select: { id: true, email: true, role: true },
      });
      logger.info("User role changed", { id: user.id, role: user.role });
      res.json(user);
    } catch (err) {
      fail(res, err, "PATCH /users/:id/role failed");
    }
  },
);

app.get("/todos", async (_req, res) => {
  try {
    const where =
      res.locals.user.role === "ADMIN" ? {} : { userId: res.locals.user.id };
    const todos = await prisma.todo.findMany({ where, orderBy: { id: "asc" } });
    res.json(todos);
  } catch (err) {
    fail(res, err, "GET /todos failed");
  }
});

app.get("/todos/:id", validateId, authenticate, async (_req, res) => {
  try {
    const todo = await prisma.todo.findUnique({
      where: { id: res.locals.id },
    });
    if (!todo) return res.status(404).json({ error: "Todo not found" });

    const { id: userId, role } = res.locals.user;
    if (role !== "ADMIN" && todo.userId !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    res.json(todo);
  } catch (err) {
    fail(res, err, "GET /todos/:id failed");
  }
});

app.post(
  "/todos",
  authenticate,
  validateBody(createTodoSchema),
  async (req, res) => {
    try {
      const todo = await prisma.todo.create({
        data: {
          title: req.body.title,
          completed: req.body.completed,
          userId: res.locals.user.id,
        },
      });
      logger.info("Todo created", { id: todo.id });
      res.status(201).json(todo);
    } catch (err) {
      fail(res, err, "POST /todos failed");
    }
  },
);

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

app.delete("/todos/:id", validateId, authenticate, async (_req, res) => {
  try {
    const existing = await prisma.todo.findUnique({
      where: { id: res.locals.id },
    });
    if (!existing) return res.status(404).json({ error: "Todo not found" });

    const { id: userId, role } = res.locals.user;
    if (role !== "ADMIN" && existing.userId !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const todo = await prisma.todo.delete({ where: { id: existing.id } });
    logger.info("Todo deleted", { id: todo.id });
    res.json(todo);
  } catch (err) {
    fail(res, err, "DELETE /todos/:id failed");
  }
});

app.get("/auth/me", authenticate, async (_req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: res.locals.user.id },
      select: { id: true, email: true, role: true },
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    fail(res, err, "GET /auth/me failed");
  }
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error("Unhandled error", { err });
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  logger.info(`Server running on http://localhost:${PORT}`),
);
