
const {rateLimit} = require('express-rate-limit')

const apiLimit = rateLimit({
	windowMs: 60 * 1000, // 60 seconds
	limit: 10, // Limit each user to 100 requests per window
	standardHeaders: 'draft-7',
	legacyHeaders: false,
	message: 'Request limit reached, please try again later.'
})

module.exports = {apiLimit}