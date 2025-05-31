import dotenv from 'dotenv';
dotenv.config();

const knex = {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST,
      port: 3306,
      database: 'movies',
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      dateStrings: true
    }
};

export default knex;