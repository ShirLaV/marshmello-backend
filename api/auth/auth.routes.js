const express = require('express')
const {login, signup, logout, googleLogin} = require('./auth.controller')

const router = express.Router()

router.post('/login', login)
router.post('/googlelogin', googleLogin)
router.post('/signup', signup)
router.post('/logout', logout)

module.exports = router