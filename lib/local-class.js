var vue = typeof Vue === 'undefined' ? require('vue') : Vue
var classDir = vue.directive('class')
var _ = vue.util

vue.directive('local-class', {

  bind: function () {
    this.locals = this.vm.$localClasses || {}
    if (this.arg) {
      this.arg = this.locals[this.arg]
    }
  },

  update: function (value) {
    if (!this.arg) {
      if (typeof value === 'string') {
        value = this.locals[value]
      } if (_.isPlainObject(value)) {
        value = transformObject(value, this.locals)
      }
    }
    classDir.update.call(this, value)
  },

  cleanup: classDir.cleanup
})

function transformObject (value, locals) {
  var res = {}
  var classes = Object.keys(value)
  for (var i = 0, l = classes.length; i < l; i++) {
    var localClass = classes[i]
    var globalClass = locals[localClass]
    if (globalClass) {
      res[globalClass] = value[localClass]
    }
  }
  return res
}
