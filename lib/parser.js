var parse5 = require('parse5')
var parser = new parse5.Parser(null, { locationInfo: true })

module.exports = function (content) {
  this.cacheable()
  var cb = this.async()

  var components = {}
  var fragment = parser.parseFragment(content)

  function parseComponent (fragment) {

    var output = {
      template: [],
      style: [],
      script: [],
      styleImports: []
    }

    fragment.childNodes.forEach(function (node) {
      var type = node.tagName
      var lang = getAttribute(node, 'lang')
      var src = getAttribute(node, 'src')
      var scoped = getAttribute(node, 'scoped') != null

      if (type === 'component') {
        return cb(new Error(
          '[vue-loader] Nested component is not supported.'
        ))
      }

      if (src) {
        if (type !== 'style') {
          return cb(new Error(
            '[vue-loader] src import is only supported for <style> tags.'
          ))
        }
        output.styleImports.push({
          src: src,
          lang: lang,
          scoped: scoped
        })
        return
      }

      if (!node.childNodes || !node.childNodes.length) {
        return
      }

      if (!output[type]) {
        return
      }

      if (
        (type === 'script' || type === 'template') &&
        output[type].length > 0
      ) {
        return cb(new Error(
          '[vue-loader] Only one <script> or <template> tag is ' +
          'allowed inside a Vue component.'
        ))
      }

      // Work around changes in parse5 >= 1.2.0
      if (node.childNodes[0].nodeName === '#document-fragment') {
        node = node.childNodes[0]
        if (!node.childNodes.length) {
          return
        }
      }

      var start = node.childNodes[0].__location.start
      var end = node.childNodes[node.childNodes.length - 1].__location.end
      output[type].push({
        lang: lang,
        scoped: scoped,
        content: content.substring(start, end).trim()
      })
    })

    return output
  }

  function isMulti (fragment) {
    return fragment.childNodes.length > 0 && fragment.childNodes[0].tagName === 'component'
  }

  if (isMulti(fragment)) {

    components._multiComponents_ = true

    fragment.childNodes.forEach(function (node) {
      var type = node.tagName

      if (type === 'component') {
        var name = getAttribute(node, 'name')

        // You must specify a name for component
        if (!name || !name.length) {
          return cb(new Error(
            '[vue-loader] You must specify a name attribute for component tag.'
          ))
        }

        if (name === 'multiComponents') {
          return cb(new Error(
            "[vue-loader] Can not use `_multiComponents_` as component's name. It is reserved for internal use."
          ))
        }

        components[name] = parseComponent(node)
      } else {
        return cb(new Error(
          '[vue-loader] Nested component is not supported.'
        ))
      }
    })
  } else {
    components = parseComponent(fragment)
  }

  cb(null, 'module.exports = ' + JSON.stringify(components))
}

function getAttribute (node, name) {
  if (node.attrs) {
    var i = node.attrs.length
    var attr
    while (i--) {
      attr = node.attrs[i]
      if (attr.name === name) {
        return attr.value
      }
    }
  }
}
