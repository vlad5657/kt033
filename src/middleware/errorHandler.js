class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const errorHandler = (err, req, res, next) => {
  if (err.code === 'P2002') {
    return res.status(409).json({
      error: `Значение уже существует: ${(err.meta?.target || []).join(', ')}`,
    });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Запись не найдена' });
  }

  const status = err.status || 500;
  const message = err.status ? err.message : 'Внутренняя ошибка сервера';

  if (status === 500) console.error(err);

  res.status(status).json({ error: message });
};

const notFound = (req, res) => {
  res.status(404).json({ error: 'Маршрут не найден' });
};

module.exports = { ApiError, asyncHandler, errorHandler, notFound };
