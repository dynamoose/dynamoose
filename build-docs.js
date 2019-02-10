const jsdoc2md = require('jsdoc-to-markdown')
const fs = require('fs')
const glob = require('glob')
glob('lib/**/*.js', {}, (err, files) => {
  const docs = files.map(file => {
    const doc = jsdoc2md.renderSync({ files: file})
    return {
      location: `docs/${file.replace('.js', '.md')}`,
      content: doc
    }
  })
  docs.forEach( docConfig => {
    if (docConfig.content) {
      fs.writeFileSync(docConfig.location, docConfig.content, 'utf8')
    }
  })
})
