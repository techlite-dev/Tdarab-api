const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.path} —`, err.message)

  if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return res.status(400).json({
      data: null,
      message: null,
      error: 'Invalid JSON in request body',
    })
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      data: null,
      message: null,
      error: 'Request body too large',
    })
  }

  res.status(500).json({
    data: null,
    message: null,
    error: 'Internal server error',
  })
}

module.exports = errorHandler
