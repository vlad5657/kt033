require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  databaseUrl: process.env.DATABASE_URL,
};

const prisma = new PrismaClient();

module.exports = { config, prisma };
