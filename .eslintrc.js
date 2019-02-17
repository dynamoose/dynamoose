module.exports = {
  'env': {
    'es6': true,
    'node': true
  },
  'extends': 'eslint:all',
  'parserOptions': {
    'ecmaVersion': 2018
  },
  'rules': {
    'indent': [
      'error',
      2
    ],
    'linebreak-style': [
      'error',
      'unix'
    ],
    'quotes': [
      'error',
      'single'
    ],
    'semi': [
      'error',
      'always'
    ],
    'spaced-comment': ['error', 'always', {'exceptions': ['!']}],
    'no-console': 'off',
    'one-var': 'off',
    'padded-blocks': 'off',
    'max-len': 'off',
    'init-declarations': 'off',
    'func-names': 'off',
    'no-magic-numbers': 'off',
    'no-underscore-dangle': 'off',
    'camelcase': 'off',
    'line-comment-position': 'off',
    'no-inline-comments': 'off',
    'id-length': ['error', {'min': 1}],
    'max-params': ['error', {'max': 5}],
    'max-statements': ['error', {'max': 130}],
    'max-lines': ['error', {'max': 3600}],
    'complexity': ['error', {'max': 75}],
    'max-lines-per-function': ['error', {'max': 3500}],
    'max-statements-per-line': ['error', {'max': 6}],
    'max-depth': ['error', {'max': 7}],
    'no-mixed-operators': 'off',
    'new-cap': 'off',
    'no-param-reassign': 'off',
    'consistent-this': 'off',
    'no-unused-expressions': 'off',
    'no-invalid-this': 'off',
    'no-empty-function': 'off',
    'handle-callback-err': 'off',
    'multiline-ternary': 'off',
    'no-continue': 'off',
    'no-ternary': 'off',
    'func-style': 'off',
    'no-warning-comments': 'off',
    'object-property-newline': 'off',
    'array-element-newline': 'off',
    'newline-per-chained-call': 'off',
    'multiline-comment-style': 'off',
    'capitalized-comments': 'off',
    'function-paren-newline': 'off',
    'no-use-before-define': 'off',
    'brace-style': ['error', '1tbs', {'allowSingleLine': true}],
    'dot-location': 'off',
    'one-var-declaration-per-line': 'off',

    // Higher priority to enable
    'no-shadow': 'off',
    'no-await-in-loop': 'off',
    'guard-for-in': 'off',
    'no-undefined': 'off',
    'consistent-return': 'off',
    'sort-keys': 'off'
  }
};
