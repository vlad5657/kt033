# KT03 — REST API блог-платформы

REST API для блог-платформы: **Express** + **Prisma ORM** (SQLite) + **Joi**.
Поддерживает управление пользователями и постами со связями между ними.

## Структура проекта

```
kt03/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── config/
│   │   └── index.js
│   ├── middleware/
│   │   ├── validator.js
│   │   └── errorHandler.js
│   ├── routes/
│   │   ├── users.js
│   │   └── posts.js
│   └── index.js
├── .env
├── .env.example
└── package.json
```

## Быстрый старт

```bash
npm install
npx prisma migrate dev --name init
npm start
```

Сервер: `http://localhost:3000`

## Модель данных

- **User** — id, email (уникальный), name, role (USER/ADMIN), createdAt
- **Post** — id, title, content, published, createdAt, authorId → User
- **Tag** — id, name (уникальный), связь many-to-many с Post

## Маршруты

| Метод  | URL             | Описание                              |
|--------|-----------------|---------------------------------------|
| GET    | /api/users      | Список с пагинацией                   |
| GET    | /api/users/:id  | Пользователь с постами (include)      |
| POST   | /api/users      | Создать пользователя                  |
| PATCH  | /api/users/:id  | Обновить пользователя                 |
| DELETE | /api/users/:id  | Удалить пользователя                  |
| GET    | /api/posts      | Список с фильтрацией и пагинацией     |
| GET    | /api/posts/:id  | Пост с автором и тегами               |
| POST   | /api/posts      | Создать пост                          |
| PATCH  | /api/posts/:id  | Обновить пост                         |
| DELETE | /api/posts/:id  | Удалить пост                          |

### GET /api/posts

- `search` — поиск по заголовку (contains, insensitive)
- `published` — фильтр по статусу публикации
- `author` — фильтр по автору
- `page`, `limit` — пагинация

Ответ: `{ data, meta: { total, page, limit, pages } }`

### GET /api/users/:id

Возвращает пользователя вместе с его постами (include),
посты отсортированы по дате создания по убыванию.

### POST /api/posts

Принимает `title`, `content`, `published`, `authorId`, `tags` (массив строк).
Теги создаются через `connectOrCreate` по имени. Валидация через Joi:
title и authorId обязательные.

## Примеры запросов

```bash
# Пользователь
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@mail.ru","name":"Иван","role":"ADMIN"}'

# Пост с тегами
curl -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -d '{"title":"Первый пост","content":"Текст поста","authorId":1,"tags":["news","tech"]}'

# Фильтрация и пагинация
curl "http://localhost:3000/api/posts?search=перв&published=false&page=1&limit=5"

# Пользователь с постами
curl http://localhost:3000/api/users/1
```

## Обработка ошибок

- 400 — ошибка валидации Joi (детали по полям)
- 404 — запись не найдена (в т.ч. Prisma P2025)
- 409 — дубликат уникального значения (Prisma P2002)
- 500 — внутренняя ошибка сервера
