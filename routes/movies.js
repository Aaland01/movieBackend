import { Router } from 'express';
const router = Router();

/* GET users listing. */
router.get('/search', (req, res, next) => {
  res.json({ message: 'All movies' });
});

router.get('/data:imdbID', (req, res, next) => {
  res.json({ message: 'Info about a movie based on ID' });
});


export default router;
