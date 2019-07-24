<template>
  <div class="call">
    <div class="center">
      登录名：
      <el-input
        v-model="account"
        clearable
        >
      </el-input> <br>
      房间号：
       <el-input
        v-model="roomid"
        clearable
        >
      </el-input> <br>
      <el-button type="primary" @click="join">加入房间</el-button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'call',
  data () {
    return {
      roomid: '',
      account: ''
    }
  },
  methods: {
    join () {
      if (this.account && this.roomid) {
        this.$router.push({name: 'room', params: {roomid: this.roomid, account: this.account}})
      }
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h1, h2 {
  font-weight: normal;
}
.call {
  text-align: center;
}
.center{
        width:500px;
        height: 400px;
        position: absolute;
        left:0;
        top:0;
        bottom:0;
        right:0;
        margin: auto;
    }
</style>
