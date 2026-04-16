const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.path} —`, err.message)
  res.status(500).json({
    data: null,
    message: null,
    error: 'Internal server error',
  })
}

module.exports = errorHandler
