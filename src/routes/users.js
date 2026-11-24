const { Router } = require('express');
const Joi = require('joi');
const { prisma } = require('../config');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');
const validate = require('../middleware/validator');

const router = Router();

const createUserSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().min(1).max(100).required(),
  role: Joi.string().valid('USER', 'ADMIN').default('USER'),
});

const updateUserSchema = Joi.object({
  email: Joi.string().email(),
  name: Joi.string().min(1).max(100),
  role: Joi.string().valid('USER', 'ADMIN'),
}).min(1);

const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});

// GET /api/users — список с пагинацией
router.get(
  '/',
  validate(paginationSchema, 'query'),
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    const [total, users] = await prisma.$transaction([
      prisma.user.count(),
      prisma.user.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    res.json({
      data: users,
      meta: { total, page, limit, pages: Math.ceil(total / limit) || 0 },
    });
  })
);

// GET /api/users/:id — пользователь с постами, посты по дате убыв.
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      include: {
        posts: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!user) throw new ApiError(404, 'Пользователь не найден');
    res.json(user);
  })
);

// POST /api/users — создать пользователя
router.post(
  '/',
  validate(createUserSchema),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.create({ data: req.body });
    res.status(201).json(user);
  })
);

// PATCH /api/users/:id — обновить пользователя
router.patch(
  '/:id',
  validate(updateUserSchema),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.update({
      where: { id: parseInt(req.params.id, 10) },
      data: req.body,
    });
    res.json(user);
  })
);

// DELETE /api/users/:id — удалить пользователя (посты удалятся каскадом)
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await prisma.user.delete({ where: { id: parseInt(req.params.id, 10) } });
    res.status(204).send();
  })
);

module.exports = router;
