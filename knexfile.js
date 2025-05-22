const knex = {
    client: 'mysql2',
    connection: {
      host: '127.0.0.1',
      port: 3306,
      database: 'movies',
      // TODO Need to change user to root before delivery
      user: 'dev',
      password: 'Cab230!'
    }
};

export default knex;