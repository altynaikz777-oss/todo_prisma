# Todo App

Express + TypeScript + Zod + Prisma + PostgreSQL + winston.
Тек Todo: қосу, оқу, өзгерту, өшіру.

## Іске қосу

1. PostgreSQL-де бос дерекқор жасаңыз (мысалы `todoapp`).
2. `.env.example` файлын `.env` деп көшіріп, `DATABASE_URL` мәнін өзіңізге қарай жазыңыз.
3. Орындаңыз:

```bash
npm install                          # prisma generate автоматты түрде жүреді
npx prisma migrate dev --name init   # todos кестесін жасайды
npm run dev
```

Сервер: http://localhost:3000

## Endpoints

| Method | URL          | Сипаттама     | Статус        |
|--------|--------------|---------------|---------------|
| GET    | /todos       | Барлық todo   | 200           |
| GET    | /todos/:id   | Бір todo      | 200, 400, 404 |
| POST   | /todos       | Жаңа todo     | 201, 400      |
| PUT    | /todos/:id   | Todo жаңарту  | 200, 400, 404 |
| DELETE | /todos/:id   | Todo өшіру    | 200, 400, 404 |

```bash
curl -X POST http://localhost:3000/todos \
  -H "Content-Type: application/json" \
  -d '{"title":"Prisma үйрену"}'
```

## Құрылым

```
prisma/schema.prisma   Todo моделі
src/index.ts           маршруттар
src/schemas.ts         Zod валидациясы
src/db.ts              Prisma client, қате кодтары
src/logger.ts          winston логтары (logs/ ішіне жазылады)
public/                Todo беті
```

## Пайдалы командалар

```bash
npm run db:studio      # деректерді браузерде қарау
npx prisma migrate dev --name <ат>   # схема өзгерсе, жаңа миграция
```

`prisma/migrations/` папкасын өшірмеңіз және қолмен өзгертпеңіз, оны git-ке қосыңыз.
