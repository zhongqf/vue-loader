module.exports = function (source) {
  this.cacheable()
  var locals = source.match(/exports\.locals = \{[^;]*\};/)
  return locals ? locals[0] : ''
}
