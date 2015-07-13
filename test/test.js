var fs = require('fs')
var path = require('path')
var webpack = require('webpack')
var jsdom = require('jsdom')
var expect = require('chai').expect
var assign = require('object-assign')
var rimraf = require('rimraf')
var SourceMapConsumer = require('source-map').SourceMapConsumer

describe('vue-loader', function () {

  var outputDir = path.resolve(__dirname, './output')
  var loaderPath = path.resolve(__dirname, '../')
  var testHTML = '<!DOCTYPE html><html><head></head><body></body></html>'
  var globalConfig = {
    output: {
      path: outputDir,
      filename: 'test.build.js'
    },
    module: {
      loaders: [
        {
          test: /\.vue$/,
          loader: loaderPath
        }
      ]
    }
  }

  beforeEach(function (done) {
    rimraf(outputDir, done)
  })

  function getFile (file, cb) {
    fs.readFile(path.resolve(outputDir, file), 'utf-8', function (err, data) {
      expect(err).to.be.null
      cb(data)
    })
  }

  function test (options, assert) {
    var config = assign({}, globalConfig, options)
    webpack(config, function (err) {
      expect(err).to.be.null
      getFile('test.build.js', function (data) {
        jsdom.env({
          html: testHTML,
          src: [data],
          done: function (err, window) {
            if (err) {
              console.log(err[0].data.error.stack)
              expect(err).to.be.null
            }
            assert(window)
          }
        })
      })
    })
  }

  it('basic', function (done) {
    test({
      entry: './test/fixtures/basic.js'
    }, function (window) {
      var module = window.testModule
      expect(module.template).to.contain('<h2 class="red">{{msg}}</h2>')
      expect(module.data().msg).to.contain('Hello from Component A!')
      var style = window.document.querySelector('style').textContent
      expect(style).to.contain('comp-a h2 {\n  color: #f00;\n}')
      done()
    })
  })

  it('pre-processors', function (done) {
    test({
      entry: './test/fixtures/pre.js'
    }, function (window) {
      var module = window.testModule
      expect(module.template).to.contain(
        '<h1>This is the app</h1>' +
        '<comp-a></comp-a>' +
        '<comp-b></comp-b>'
      )
      expect(module.data().msg).to.contain('Hello from babel!')
      var style = window.document.querySelector('style').textContent
      expect(style).to.contain('body {\n  font: 100% Helvetica, sans-serif;\n  color: #999;\n}')
      done()
    })
  })

  it('local class', function (done) {
    test({
      entry: './test/fixtures/local-class.js'
    }, function (window) {
      // should inject v-local-class directive
      expect(window.Vue.directive('local-class')).to.exist
      var module = window.testModule
      expect(Array.isArray(module.created)).to.be.true
      var capture = {}
      // should inject vm.$localClasses
      module.created[0].call(capture)
      var red = capture.$localClasses.red
      var large = capture.$localClasses.large
      expect(red).to.be.a.string
      expect(large).to.be.a.string
      // should keep original created hook
      module.created[1].call(capture)
      expect(capture.msg).to.equal('hello!')
      // should transform CSS classes correctly
      var style = window.document.querySelector('style').textContent
      expect(style).to.contain('.' + red + ' {')
      expect(style).to.contain('.' + large + ' {')
      // should transform HTML classes correctly
      expect(module.template).to.contain('<div class="global ' + large + ' ' + red + '">')
      done()
    })
  })

  it('local-class directive', function () {
    require('../lib/local-class')
    var Vue = require('vue')
    // mock vm
    var vm = {
      $localClasses: {
        red: 'FfesGgHrzvbji'
      }
    }
    // with arg
    var dir = Vue.util.extend({
      vm: vm,
      arg: 'red',
      el: mockDiv()
    }, Vue.directive('local-class'))
    dir.bind()
    expect(dir.arg).to.equal(vm.$localClasses.red)
    dir.update(true)
    expect(dir.el.classList.contains(vm.$localClasses.red)).to.be.true
    dir.update(false)
    expect(dir.el.classList.contains(vm.$localClasses.red)).to.be.false
    // no arg
    dir = Vue.util.extend({
      vm: vm,
      el: mockDiv()
    }, Vue.directive('local-class'))
    dir.bind()
    expect(dir.locals).to.equal(vm.$localClasses)
    // string
    dir.update('red')
    expect(dir.el.classList.list.join(' ')).to.contain(vm.$localClasses.red)
    dir.update({
      red: false
    })
    expect(dir.el.classList.list.join(' ')).not.to.contain(vm.$localClasses.red)
    dir.update({
      red: true
    })
    expect(dir.el.classList.list.join(' ')).to.contain(vm.$localClasses.red)
  })

  it('source-map', function (done) {
    var config = assign({}, globalConfig, {
      entry: './test/fixtures/basic.js',
      devtool: 'source-map'
    })
    webpack(config, function (err) {
      expect(err).to.be.null
      getFile('test.build.js.map', function (map) {
        var smc = new SourceMapConsumer(JSON.parse(map))
        getFile('test.build.js', function (code) {
          var line
          code.split('\n').some(function (l, i) {
            if (l.indexOf('Hello from Component A') > -1) {
              line = i + 1
              return true
            }
          })
          var pos = smc.originalPositionFor({
            line: line,
            column: 0
          })
          expect(pos.source.indexOf('webpack:///test/fixtures/basic.vue') > -1)
          expect(pos.line).to.equal(4)
          done()
        })
      })
    })
  })
})

function mockDiv () {
  return {
    classList: {
      list: [],
      add: function (cls) {
        if (!this.contains(cls)) {
          this.list.push(cls)
        }
      },
      remove: function (cls) {
        this.list.$remove(cls)
      },
      contains: function (cls) {
        return this.list.indexOf(cls) > -1
      }
    }
  }
}
