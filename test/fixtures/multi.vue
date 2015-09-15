
<component name="first">
  <style>
  comp-first h2 {
    color: #f00;
  }
  </style>

  <template>
    <h2 class="red">{{msg}}</h2>
  </template>

  <script>
  module.exports = {
    data: function () {
      return {
        msg: 'Hello from Component First!'
      }
    }
  }
  </script>
</component>


<component name="second">
  <style>
  comp-second h2 {
    color: #00f;
  }
  </style>

  <template>
    <h2 class="blue">{{msg}}</h2>
  </template>

  <script>
  module.exports = {
    data: function () {
      return {
        msg: 'Hello from Component Second!'
      }
    }
  }
  </script>
</component>