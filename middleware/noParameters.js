const parameterCheck = (req, res, next) => {

    if (Object.keys(req.query).length > 0) {
      return res.status(400).json({
        error:true, 
        message:`Invalid query parameters: ${Object.keys(req.query)[0]}. Query parameters are not permitted.`
      })
    }
}

export default parameterCheck;