const { Router } = require('express');
const Joi = require('joi');
const { prisma } = require('../config');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');
const validate = require('../middleware/validator');

const router = Router();

const createPostSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  content: Joi.string().min(1).required(),
  published: Joi.boolean().default(false),
  authorId: Joi.number().integer().required(),
  tags: Joi.array().items(Joi.string().min(1)).default([]),
});

const updatePostSchema = Joi.object({
  title: Joi.string().min(1).max(200),
  content: Joi.string().min(1),
  published: Joi.boolean(),
  tags: Joi.array().items(Joi.string().min(1)),
}).min(1);

const listQuerySchema = Joi.object({
  search: Joi.string().allow(''),
  published: Joi.boolean().truthy('true').falsy('false'),
  author: Joi.number().integer(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});

// Теги: connectOrCreate по имени
const tagOperations = (tags = []) => ({
  tags: {
    connectOrCreate: tags.map((name) => ({
      where: { name },
      create: { name },
    })),
  },
});

// GET /api/posts — список с фильтрацией и пагинацией
router.get(
  '/',
  validate(listQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { search, published, author, page, limit } = req.query;

    const where = {
      // search — по заголовку (contains, insensitive)
      ...(search && {
        title: { contains: search, mode: 'insensitive' },
      }),
      // published — фильтр по статусу публикации
      ...(published !== undefined && { published }),
      // author — фильтр по автору
      ...(author !== undefined && { authorId: parseInt(author, 10) }),
    };

    const [total, posts] = await prisma.$transaction([
      prisma.post.count({ where }),
      prisma.post.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { author: true, tags: true },
      }),
    ]);

    res.json({
      data: posts,
      meta: { total, page, limit, pages: Math.ceil(total / limit) || 0 },
    });
  })
);

// GET /api/posts/:id — пост с автором и тегами
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const post = await prisma.post.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      include: { author: true, tags: true },
    });
    if (!post) throw new ApiError(404, 'Пост не найден');
    res.json(post);
  })
);

// POST /api/posts — создать пост, теги через connectOrCreate
router.post(
  '/',
  validate(createPostSchema),
  asyncHandler(async (req, res) => {
    const { authorId, tags, ...data } = req.body;

    const author = await prisma.user.findUnique({ where: { id: authorId } });
    if (!author) throw new ApiError(404, `Пользователь с id=${authorId} не найден`);

    const post = await prisma.post.create({
      data: {
        ...data,
        author: { connect: { id: authorId } },
        ...tagOperations(tags),
      },
      include: { author: true, tags: true },
    });

    res.status(201).json(post);
  })
);

// PATCH /api/posts/:id — обновить пост
router.patch(
  '/:id',
  validate(updatePostSchema),
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { tags, ...data } = req.body;

    const existing = await prisma.post.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, 'Пост не найден');

    const post = await prisma.post.update({
      where: { id },
      data: tags ? { ...data, ...tagOperations(tags) } : data,
      include: { author: true, tags: true },
    });

    res.json(post);
  })
);

// DELETE /api/posts/:id — удалить пост
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await prisma.post.delete({ where: { id: parseInt(req.params.id, 10) } });
    res.status(204).send();
  })
);

module.exports = router;
