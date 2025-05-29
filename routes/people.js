import { Router } from 'express';
const router = Router();
import authMiddleware from "../middleware/authorisation.js";

/* Authenticated route - must handle auth */
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {

    if (Object.keys(req.query).length > 0) {
      return res.status(400).json({
        error:true, 
        message:`Invalid query parameters: ${Object.keys(req.query)[0]}. Query parameters are not permitted.`
      })
    }

    const personID = req.params.id;
    
    const personQuery = await req.db('names')
      .where({nconst: personID})
      .first("primaryName", "birthYear", "deathYear");
    
    if (!personQuery) {
      return res.status(404).json({error: true, message: "No record exists of a person with this ID"})
    }

    const moviesQuery = await req.db('principals')
      .where({nconst: personID})
      .join('basics','principals.tconst', 'basics.tconst')
      .select('basics.primaryTitle', 'basics.tconst', 'principals.category', 'principals.characters' ,'basics.imdbRating');

    const roles = moviesQuery.map(m => (
      {
        "movieName": m.primaryTitle, // basics
        "movieId": m.tconst, // basics, principals
        "category": m.category, // principals
        "characters": m.characters ? JSON.parse(m.characters) : [],
        "imdbRating": m.imdbRating ? parseFloat(m.imdbRating) : null
      }
    ))

    return res.status(200).json(
      {
        "name": personQuery.primaryName,
        "birthYear": parseInt(personQuery.birthYear),
        "deathYear": personQuery.deathYear ? parseInt(personQuery.deathYear) : null,
        "roles": roles
      }
    )
  } catch (error) {
    return res.status(500).json({error: "True", message: `Error getting person data: ${error.message}`})
  }
});

export default router;
