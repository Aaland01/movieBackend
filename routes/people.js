import { Router } from 'express';
const router = Router();

/* Authenticated route - must handle auth */
router.get('/:id', (req, res, next) => {
  res.json({ message: 'Person details' });
});

export default router;
