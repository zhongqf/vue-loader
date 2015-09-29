var parse5 = require('parse5')
var parser = new parse5.Parser()
var serializer = new parse5.Serializer()
var hash = require('hash-sum')
var loaderUtils = require('loader-utils')

module.exports = function (html) {
  this.cacheable()
  var hashseed = this.resourcePath

  var query = loaderUtils.parseQuery(this.query)
  if (query.component && query.component.length > 0) {
    hashseed += ":"+ query.component
  }

  var cls = 'v-' + hash(hashseed)
  var tree = parser.parseFragment(html)
  tree.childNodes.forEach(function (node) {
    if (node.attrs) {
      var hasClass = false
      for (var i = 0, l = node.attrs.length; i < l; i++) {
        var attr = node.attrs[i]
        if (attr.name === 'class') {
          attr.value += ' ' + cls
          hasClass = true
          break
        }
      }
      if (!hasClass) {
        node.attrs.push({
          name: 'class',
          value: cls
        })
      }
    }
  })
  return serializer.serialize(tree)
}
