document.addEventListener('DOMContentLoaded', () => {
    console.log('App loaded');

    hljs.initHighlightingOnLoad();

    var jscode = document.getElementById('js-code')
    jscode.style.backgroundColor = '#f9fbfc'
    jscode.style.fontSize = '14px'
    jscode.style.fontFamily = 'Roboto Mono'

    var bashcode = document.getElementById('bash-code')
    bashcode.style.backgroundColor = '#f9fbfc'
    bashcode.style.fontSize = '14px'
    bashcode.style.lineHeight = '30px'
    bashcode.style.fontFamily = 'Roboto Mono'
})