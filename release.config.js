module.exports = {
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    '@semantic-release/npm',
    ['@semantic-release/changelog', {
      'changelogFile': 'CHANGELOG.md',
    }],
    '@semantic-release/git'
  ]
};
