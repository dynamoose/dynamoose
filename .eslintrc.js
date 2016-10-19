module.exports = {
  "env": {
    "browser": true,
    "node": true,
    'mocha': true
  },
  "extends": "eslint:recommended",
  "rules": {
    "indent": [
      "error",
      2,
      {
        "SwitchCase": 1
      }
    ],
    "linebreak-style": [
      "error",
      "windows"
    ],
    "quotes": [
      "error",
      "single"
    ],
    "semi": [
      "error",
      "always"
    ],
    "complexity": [
      "error",
      20
    ],
    "eqeqeq": [
      "error"
    ],
    "no-invalid-this": [
      "error"
    ],
    "no-mixed-requires": [
      "error"
    ],
    "no-multiple-empty-lines": [
      "error"
    ]
  }
};