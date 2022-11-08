import { Router } from 'express';
// import auth from './routes/auth';
// import user from './routes/user';
// import agendash from './routes/agendash';
import contract from './routes/contract';
import db from './routes/db';
import pair from './routes/pair';
import token from './routes/token';

// guaranteed to get dependencies
export default () => {
  const app = Router();
  // auth(app);
  // user(app);
  // agendash(app);
  contract(app);
  token(app);
  pair(app);
  db(app);

  return app;
};
