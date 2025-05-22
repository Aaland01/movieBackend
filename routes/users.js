import { Router } from 'express';
const router = Router();

/* GET users listing. */
router.get('/', (req, res, next) => {
  res.json({ message: 'Up\'n running' });
});

export default router;
