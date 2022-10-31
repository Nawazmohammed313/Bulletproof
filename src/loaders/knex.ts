import knex from 'knex';

export default () => {
  const knexInstance = knex({
    client: 'pg',
    connection: {
      host: '127.0.0.1',
      port: 5434,
      user: 'postgres',
      password: 'eq2extdps',
      database: 'dex',
    },
  });

  return knexInstance;
};
