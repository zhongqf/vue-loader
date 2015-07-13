// The selector selects the content of an asset node
// e.g. <style> from the result of the parser (which is cached)

module.exports = function () {
  this.cacheable()
  var cb = this.async()
  var path = this.query.substr(1).split('/')

  var self = this
  var url = '!!' + require.resolve('./parser.js') + '!' + this.resource
  this.loadModule(url, function (err, source) {
    if (err) return cb(err)
    var parts = self.exec(source, url)
    var type = path[0]
    var lang = path[1] || ''
    cb(null, parts[type][lang])
  })
}
