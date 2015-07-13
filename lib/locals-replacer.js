var _ = require('./util')
var parse5 = require('parse5')
var parser = new parse5.Parser()
var serializer = new parse5.Serializer()
var loaderUtils = require('loader-utils')
var mustacheRE = /{{.*}}|\[\[.*\]\]/

module.exports = function (template) {
  this.cacheable()
  var locals = loaderUtils.parseQuery(this.query)
  var tree = parser.parseFragment(template)

  walk(tree, function (node) {
    var localClasses = _.getAttribute(node, 'local-class')
    if (localClasses) {
      _.removeAttribute(node, 'local-class')
      _.setAttribute(node, 'class', transform(localClasses, locals), true)
    }
  })

  return serializer.serialize(tree)
}

function walk (tree, cb) {
  tree.childNodes.forEach(function (child) {
    cb(child)
    if (child.childNodes) {
      walk(child, cb)
    }
  })
}

function transform (classes, locals) {
  return classes.trim().split(/\s+/)
    .map(function (localClass) {
      // skip interpolated
      if (mustacheRE.test(localClass)) {
        warn(
          'Interpolations inside local-class are not ' +
          'transformed. For dynamic local classes, use ' +
          'the v-local-class directive instead.'
        )
        return localClass
      }
      var transformedClass = locals[localClass]
      if (!transformedClass) {
        warn(
          'local class ".' + localClass + '" ' +
          'is not found in the stylesheet.'
        )
      }
      return transformedClass
    })
    .filter(function (cls) {
      return cls
    })
    .join(' ')
}

function warn (msg) {
  console.warn('\x1B[31m[vue-loader] warning: ' + msg + '\x1B[39m')
}
