import { Router } from 'express';
import noParams from "../middleware/noParameters.js";
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

    const totalQuery = req.db('basics');
    
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
router.get('/data/:imdbID', noParams, async (req, res, next) => {
  try {

    const imdbID = req.params.imdbID;

    const movieQuery = await req.db('basics')
      .where({tconst: imdbID})
      .first(
        "primaryTitle",
        "year",
        "runtimeMinutes",
        "genres",
        "country",
        // principals - sep query
        // ratings:
        "imdbRating",
        "rottentomatoesRating",
        "metacriticRating",
        "boxoffice",
        "poster", 
        "plot"
      );

    if (!movieQuery) return res.status(404).json({
      error: true,
      message: "No record exists of a movie with this ID"
    });

    const genreList = movieQuery.genres.split(',')
    const ratings = []
    if (movieQuery.imdbRating) {
      ratings.push({
        "source": "Internet Movie Database",
        "value": parseFloat(movieQuery.imdbRating)
      });
    } if (movieQuery.rottentomatoesRating) {
      ratings.push({
        "source": "Rotten Tomatoes",
        "value": parseFloat(movieQuery.rottentomatoesRating)
      });
    } if (movieQuery.metacriticRating) {
      ratings.push({
        "source": "Metacritic",
        "value": parseInt(movieQuery.metacriticRating)
      });
    }

    const principalsQuery = await req.db('principals')
      .where({tconst: imdbID})
      .orderBy('ordering')
      .select("ordering", "nconst", "category", "name", "characters");

    const principals = principalsQuery.map(p => (
      {
        "id": p.nconst,
        "category": p.category,
        "name": p.name,
        "characters": p.characters ? JSON.parse(p.characters) : []
      }
    )); 

    return res.status(200).json({
      "title": movieQuery.primaryTitle,
      "year": parseInt(movieQuery.year),
      "runtime": parseInt(movieQuery.runtimeMinutes),
      "genres": genreList,
      "country": movieQuery.country,
      "principals": principals,
      "ratings": ratings,
      "boxoffice": parseInt(movieQuery.boxoffice),
      "poster": movieQuery.poster,
      "plot": movieQuery.plot
    })
  } catch (error) {
    return res.status(500).json({error: "True", message: `Error getting movie data: ${error.message}`})
  }
});


export default router;
