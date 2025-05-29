import { Router } from 'express';
const router = Router();
import authMiddleware from "../middleware/authorisation.js";

/* Authenticated route - must handle auth */
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    
  } catch (error) {
    
  }
});

export default router;
