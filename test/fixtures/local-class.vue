<style>
.global {
  font-family: 'Source Sans Pro';
}

:local(.large) {
  font-size: 2em;
}

:local(.red) {
  color: #f00;
}

comp-a h2 {
  color: #f00;
}
</style>

<template>
  <div class="global" local-class="large red"></div>
</template>

<script>
module.exports = {
  created: function () {
    this.msg = 'hello!'
  }
}
</script>
