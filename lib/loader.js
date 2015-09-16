var loaderUtils = require('loader-utils')
var selectorPath = require.resolve('./selector')
var parserPath = require.resolve('./parser')

var defaultLang = {
  template: 'html',
  style: 'css',
  script: 'js'
}

var rewriters = {
  template: require.resolve('./template-rewriter') + '!',
  style: require.resolve('./style-rewriter') + '!'
}

module.exports = function (content) {
  var self = this
  this.cacheable()
  var cb = this.async()
  var output = ''
  var vueUrl = loaderUtils.getRemainingRequest(this)

  // check if there are custom loaders specified with
  // vueLoader.withLoaders(), otherwise use defaults
  var loaders = loaderUtils.parseQuery(this.query)

  loaders.html = loaders.html || 'html'
  loaders.css = loaders.css || 'style!css'
  loaders.js = loaders.js || ''

  function getRequire (type, part, index, scoped, component) {
    return 'require(' +
      loaderUtils.stringifyRequest(self,
        // disable system loaders (except post loaders)
        '-!' +
        // get loader string for pre-processors
        getLoaderString(type, part, scoped) +
        // select the corresponding part from the vue file
        getSelectorString(type, index || 0, component) +
        // the url to the actual vuefile
        vueUrl
      ) +
    ')\n'
  }

  function getRequireForImport (impt) {
    return 'require(' +
      loaderUtils.stringifyRequest(self,
        '-!' +
        getLoaderString('style', impt, impt.scoped) +
        impt.src
      ) +
    ')\n'
  }

  function getLoaderString (type, part, scoped) {
    var lang = part.lang || defaultLang[type]
    var rewriter = scoped ? rewriters[type] || '' : ''
    var loader = loaders[lang]
    if (loader !== undefined) {
      // lang with default or pre-configured loader
      if (loader) loader += '!'
      return loader + rewriter
    } else {
      // unknown lang, assume a loader for it is used
      switch (type) {
      case 'template':
        return 'html!' + rewriter + 'template-html-loader?raw&engine=' + lang + '!'
      case 'style':
        return 'style!css!' + rewriter + lang + '!'
      case 'script':
        return lang + '!'
      }
    }
  }

  function getSelectorString (type, index, component) {

    var componentQuery = ''

    if (component && component.length > 0) {
      componentQuery = '&component=' + component
    }

    var path = selectorPath +
      '?type=' + type + componentQuery +
      '&index=' + index + '!'

    return path
  }

  function getRequireComponent (components, name) {

    var parts = components
    var exportPrefix = 'module.exports'

    var op = ''

    if (name && name.length) {
      exportPrefix += '.' + name
      parts = components[name].component
    }

    // add requires for src imports
    parts.styleImports.forEach(function (impt) {
      op += getRequireForImport(impt)
    })

    // add requires for styles
    parts.style.forEach(function (style, i) {
      op += getRequire('style', style, i, style.scoped, name)
    })

    // only one script tag allowed
    if (parts.script.length) {
      op += exportPrefix + ' = ' +
        getRequire('script', parts.script[0], 0, false, name)
    }

    // only one template tag allowed
    if (parts.template.length) {
      op += exportPrefix + '.template = ' +
        getRequire('template', parts.template[0], 0, parts.hasLocalStyles, name)
    }

    return op
  }

  function processRequirements (components, name) {

    var op = ''
    var requires = components[name].requires

    if (!requires || requires.length === 0) return ''

    requires.forEach(function (requireComponent) {

      if (components[requireComponent]) {

        op += 'module.exports.' + name + '.components = module.exports.' + name + '.components || {}\n'
        op += 'module.exports.' + name + '.components.' + requireComponent + ' = module.exports.' + requireComponent + '\n'

      } else {
        throw new Error(
          '[vue-loader] component `' + requireComponent + '` you required is not defined.'
        )
      }

    })

    return op
  }

  var url = '!!' + parserPath + '!' + vueUrl
  this.loadModule(url, function (err, source) {
    if (err) return cb(err)

    // up to this part, what we have done is basically executing
    // parser.js on the raw vue file and get the parsing result
    // which is an object that contains info about the vue file.
    var components = self.exec(source, url)

    if (components._multiComponents_) {

      var key

      for (key in components) {
        if (components.hasOwnProperty(key) && key !== '_multiComponents_') {
          output += getRequireComponent(components, key)
        }
      }

      // process component requirements
      for (key in components) {
        if (components.hasOwnProperty(key) && key !== '_multiComponents_') {
          output += processRequirements(components, key)
        }
      }

    } else {
      output += getRequireComponent(components, null)
    }

    // done
    cb(null, output)
  })
}

/**
 * Expose a way to specify custom loaders to be used at the
 * end for the extracted parts of a component.
 */
module.exports.withLoaders = function (opts) {
  return 'vue-loader?' + JSON.stringify(opts).replace(/!/g, '\\u0021')
}
