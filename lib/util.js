exports.getAttribute = function (node, name) {
  var res = findAttrByName(node, name)
  return res && res.attr.value
}

exports.setAttribute = function (node, name, value, append) {
  var res = findAttrByName(node, name)
  if (res) {
    if (append) {
      res.attr.value += ' ' + value
    } else {
      res.attr.value = value
    }
  } else {
    node.attrs.push({ name: name, value: value })
  }
}

exports.removeAttribute = function (node, name) {
  var index = findAttrByName(node, name).index
  if (index > -1) {
    node.attrs.splice(index, 1)
  }
}

function findAttrByName (node, name) {
  if (node.attrs) {
    var i = node.attrs.length
    var attr
    while (i--) {
      attr = node.attrs[i]
      if (attr.name === name) {
        return {
          attr: attr,
          index: i
        }
      }
    }
  }
}
