const checkAccess = (requiredLevel) => {
  return (req, res, next) => {
    const userLevel = req.user.plan.level

    if (userLevel >= requiredLevel) {
      return next()
    }

    return res.status(403).json({
      data: null,
      message: null,
      error: 'Access denied',
      locked: true,
      requiredPlanLevel: requiredLevel,
    })
  }
}

module.exports = checkAccess
