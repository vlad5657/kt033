const express = require('express');
const { config } = require('./config');
const usersRoutes = require('./routes/users');
const postsRoutes = require('./routes/posts');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

app.use(express.json());

app.get('/', (req, res) => res.json({ status: 'ok' }));

app.use('/api/users', usersRoutes);
app.use('/api/posts', postsRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Сервер запущен на http://localhost:${config.port}`);
});
