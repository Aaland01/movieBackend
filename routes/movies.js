import { Router } from 'express';
const router = Router();

// movies/search
// Params: title, year, page
router.get('/search', async (req, res, next) => {
  try {
    const perPage = 100;
    let offset = 0;
    let page = req.query.page;
    let nextPage = 2;
    let prevPage = null;

    if (page) {
      page = parseInt(page)
      offset = perPage * (page - 1)
      nextPage = page + 1;
      prevPage = page - 1;
    }
    else page = 1;

    const totalQuery = req.db.from('basics');
    
    let titleFilter = req.query.title;
    let yearFilter = req.query.year;
    
    if (yearFilter) totalQuery.where({year: yearFilter});
    if (titleFilter) totalQuery.whereILike('primaryTitle', `%${titleFilter}%`);

    const moviesQuery = await totalQuery
      .clone()
      .offset(offset)
      .limit(perPage)
      .select("primaryTitle", "year", "tconst", "imdbRating", "rottenTomatoesRating", "metacriticRating", "rated");

    const [{resultsCount}] = await totalQuery.count('* as resultsCount');
    const results = parseInt(resultsCount);
    const lastPage = Math.ceil(results / perPage);
    if (nextPage > lastPage) {
      nextPage = null;
    }
    
    const movies = moviesQuery.map(movie => (
      {
        "title": movie.primaryTitle,
        "year": movie.year,
        "imdbID": movie.tconst,
        "imdbRating": movie.imdbRating,
        "rottenTomatoesRating": movie.rottenTomatoesRating,
        "metacriticRating": movie.metacriticRating,
        "classification": movie.rated
      }
    ));

    const to = Math.min(movies.length * page, perPage + ((page - 1) * perPage))
    /**
     * 1 - min(100,movies.length)             = min(perPage * 1, movies.length + 0 * perPage)
     * 2 - min(200, movies.length + perPage)  = min(perPage * 2, movies.length + 1 * perPage)
     * 3 - min(300, movies.length + 2*perPage)= min(perPage * 3, movies.length + 2 * perPage)
     * n                                      = min(perPage * n, movies.length + n-1 * perPage)
     */

    return res.status(200).json(
      {
        "data": movies,
        "pagination": {
          "total": results,
          "lastPage": lastPage,
          "perPage": perPage,
          "currentPage": page,
          "from": offset,
          "to": to,
          "nextPage": nextPage,
          "prevPage": prevPage
        }
      }
    )
  } catch (error) {
    return res.status(500).json({error: "True", message: `Error getting movies: ${error.message}`})
  }
});

// movies/{imdbID}
router.get('/data:imdbID', (req, res, next) => {
  try {
    
  } catch (error) {
    return res.status(500).json({error: "True", message: `Error getting movie data: ${error.message}`})
  }
});


export default router;
