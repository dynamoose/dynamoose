module.exports = {
    "hooks": {
		"pre-commit": "npm run lint:staged:fix",
		"pre-push": "npm test"
	}
};
