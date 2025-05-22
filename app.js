// Express-generator standard
import createError from 'http-errors';
import express from 'express';
import cookieParser from 'cookie-parser';
import logger from 'morgan';

// Routers
import indexRouter from './routes/index.js';
import usersRouter from './routes/users.js';
import moviesRouter from './routes/movies.js';
import peopleRouter from './routes/people.js';

// Knex
import knexConfig from './knexfile.js'
import knexImport from 'knex';

// Cors
import cors from 'cors';

const app = express();
const knex = knexImport(knexConfig);

// Express-generator standard
app.use(logger('dev'));
// Parsers/encoders
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Cors
app.use(cors());

// Init database with knex BEFORE it's used elsewhere
app.use( (req, res, next) => {
  req.db = knex;
  next();
})

app.use('/user', usersRouter);
app.use('/movies', moviesRouter);
app.use('/people', peopleRouter);
app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use( (req, res, next) => {
  next(createError(404));
});

// error handler
app.use( (err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);
  res.json({error: "True", message: err.message})
  console.log("Error handler")
});

export default app;
