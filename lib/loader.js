var loaderUtils = require("loader-utils")

module.exports = function (content) {
  this.cacheable()
  var cb = this.async()
  var languages = {}
  var output = ''
  var vueUrl = loaderUtils.getRemainingRequest(this)

  // check if there are custom loaders specified with
  // vueLoader.withLoaders(), otherwise use defaults
  var loaders = loaderUtils.parseQuery(this.query)
  loaders.html = loaders.html || 'html'
  loaders.css  = loaders.css || 'style!css'
  loaders.js   = loaders.js || ''

  var loaderPrefix = {
    template: 'html!template-html-loader?raw&engine=',
    style: 'style!css!',
    script: ''
  }

  var defaultLang = {
    template: 'html',
    style: 'css',
    script: 'js'
  }

  /**
   * Determine the loaders to use for an extracted part.
   *
   * @param {String} part - style|script|template
   * @param {String} lang
   * @return {String}
   */
  function loader(part, lang) {
    lang = lang || defaultLang[part]
    var loader = loaders[lang] !== undefined
      ? loaders[lang]
      : loaderPrefix[part] + lang
    return loader ? loader + '!' : ''
  }

  /**
   * Generate a require call for an extracted part.
   *
   * @param {String} part - style|script|template
   * @param {String} lang
   * @return {String}
   */
  var self = this
  function getRequire(part, lang, prefix) {
    return 'require(' +
      loaderUtils.stringifyRequest(self,
        '-!' + loader(part, lang) +
        (prefix || '') +
        require.resolve('./selector.js') + '?' + part + '/' + lang + '!' +
        vueUrl
      ) +
    ')'
  }

  var self = this
  var url = "!!" + require.resolve("./parser.js") + "!" + vueUrl
  this.loadModule(url, function(err, source) {
    if (err) return cb(err)

    // up to this part, what we have done is basically executing
    // parser.js on the raw vue file and get the parsing result
    // which is an object that contains info about the vue file.
    var parts = self.exec(source, url)

    // add require for all the src imports
    for (var i = 0; i < parts.includes.length; i++) {
      var importReqeust = loaderUtils.urlToRequest(parts.includes[i])
      output += 'require(' + loaderUtils.stringifyRequest(this, importReqeust) + ')\n'
    }

    // add require for script
    for (var lang in parts.script) {
      output += 'module.exports = ' + getRequire('script', lang) + '\n'
    }

    // add require for styles
    var hasStyle = false
    for (var lang in parts.style) {
      if (hasStyle)
        return cb(new Error('Only one style element allowed per vue component!'))
      hasStyle = true
      output += getRequire('style', lang) + '\n'
      // extract local styles
      var url = '!!' +
        require.resolve('./locals-extractor.js') + '!' +
        getRequire('style', lang).slice(17, -2)
      self.loadModule(url, addTemplate)
    }

    function addTemplate (err, src) {
      if (err) return cb(err)
      var locals = self.exec(src).locals
      var hasLocals = locals && Object.keys(locals).length
      var localsString = JSON.stringify(locals)

      // add require for template
      var hasTemplate = false
      for (var lang in parts.template) {
        if (hasTemplate)
          return cb(new Error('Only one template element allowed per vue component!'))
        hasTemplate = true
        // local rewrite
        var prefix = hasLocals
          ? require.resolve('./locals-replacer') + '?' + localsString + '!'
          : ''
        output += 'module.exports.template = ' + getRequire('template', lang, prefix) + '\n'
      }

      // inject locals to JS
      if (hasLocals) {
        output +=
          'var created = module.exports.created\n' +
          'var inject = function () { this.localClasses = ' + localsString + '}\n' +
          'module.exports.created = created ? [created, inject] : inject\n'
      }

      // done
      cb(null, output)
    }
  })
}

/**
 * Expose a way to specify custom loaders to be used at the
 * end for the extracted parts of a component.
 */
module.exports.withLoaders = function (opts) {
  return 'vue-loader?' + JSON.stringify(opts).replace(/!/g, '\\u0021')
}
