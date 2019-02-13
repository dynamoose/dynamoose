module.exports = {
  plugins: ['@semantic-release/commit-analyzer', '@semantic-release/release-notes-generator', ['@semantic-release/changelog', {'changelogTitle': '# Dynamoose Changelog'}], '@semantic-release/npm', '@semantic-release/git']
};
