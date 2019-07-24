<template>
    <div class="room">
        <!-- <div class="audio-box" ref="audio-box">
            <audio class="audio-mine" autoplay controls ref="audio-mine"></audio>
        </div>
        <div class="audio-box" ref="audio-box"> -->
          <div class="userList">
            <h5>通话用户：{{peers.length}}</h5>
            <p v-for="v in peers" :key="v.account">
                {{v.account}}
                <i v-if="v.account === account">
                {{v.account === account ? 'me' : ''}}
                </i>
            </p>
        </div>
          <div class="audio-box" ref="audio-box">
              <h5>{{peers.account}}</h5>
             <audio class="audio-mine" autoplay ref="audio-mine"></audio>
              <!-- <el-button class="hangup" type="danger" @click="hangup">挂断</el-button> -->
          </div>

    </div>
</template>

<script>
import socket from '@/utils/socket'
export default {
  name: 'home',
  data () {
    return {
      roomid: '',
      peer: null,
      peers: {},
      peerList: {},
      candidate: null,
      localStream: null
    }
  },
  watch: {
    userList: {
      handler () {
      },
      deep: true
    }
  },
  beforeDestroy () {
    for (let k in this.peerList) {
      this.peerList[k].close()
      this.peerList[k] = null
    }
  },
  methods: {
    getUserMedia () {
      // 兼容浏览器的getUserMedia写法
      let myaudio = this.$refs['audio-mine']
      let getUserMedia = (navigator.getUserMedia ||
                    navigator.webkitGetUserMedia ||
                    navigator.mozGetUserMedia ||
                    navigator.msGetUserMedia)
      // 获取本地的媒体流，并绑定到一个audio标签上输出，并且发送这个媒体流给其他客户端
      return new Promise((resolve, reject) => {
        getUserMedia.call(navigator, {
          'audio': true,
          'video': false
        }, (stream) => {
          // 绑定本地媒体流到audio标签用于输出
          myaudio.srcObject = stream
          this.localStream = stream
          resolve()
        }, function (error) {
          reject(error)
          console.log(error)
          // 处理媒体流创建失败错误
        })
      })
    },
    getPeerConnection (v) {
      let audioBox = this.$refs['audio-box']
      let iceServer = {
        'iceServers': [
          {
            'url': 'stun:stun.l.google.com:19302'
          }
        ]
      }
      // 兼容浏览器的PeerConnection写法
      let PeerConnection = (window.RTCPeerConnection ||
                    window.webkitRTCPeerConnection ||
                    window.mozRTCPeerConnection)
      // 创建
      let peer = new PeerConnection(iceServer)
      // 向PeerConnection中加入需要发送的流
      peer.addStream(this.localStream)

      // 如果检测到媒体流连接到本地，将其绑定到一个audio标签上输出
      peer.onaddstream = function (event) {
        // console.log('event-stream', event);
        let audios = document.querySelector('#' + v.account)
        if (audios) {
          audios.srcObject = event.stream
        } else {
          let audio = document.createElement('audio')
          audio.controls = true
          audio.autoplay = 'autoplay'
          audio.srcObject = event.stream
          audio.id = v.account
          audioBox.append(audio)
        }
      }
      // 发送ICE候选到其他客户端
      peer.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('__ice_candidate', {'candidate': event.candidate, roomid: this.$route.params.roomid, account: v.account})
        }
      }
      console.log('v.account', v.account)
      this.peerList[v.account] = peer
    },
    createOffer (account, peer) {
      // 发送offer，发送本地session描述
      peer.createOffer({
        offerToReceiveAudio: 1,
        offerToReceiveaudio: 1
      }).then((desc) => {
        console.log(desc.account + 'send-offer', desc)
        peer.setLocalDescription(desc, () => {
          socket.emit('offer', {'sdp': peer.localDescription, roomid: this.$route.params.roomid, account: account})
        })
      })
    },
    socketInit () {
      socket.on('offer', v => {
        console.log(v.account + 'take_offer', this.peerList[v.account])
        this.peerList[v.account] && this.peerList[v.account].setRemoteDescription(v.sdp, () => {
          this.peerList[v.account].createAnswer().then((desc) => {
            // console.log('send-answer', desc);
            this.peerList[v.account].setLocalDescription(desc, () => {
              socket.emit('answer', {'sdp': this.peerList[v.account].localDescription, roomid: this.$route.params.roomid, account: v.account})
            })
          })
        }, err => {
          console.log(err)
        })
      })
      socket.on('answer', v => {
        console.log(v.account + 'take_answer', v.sdp)
        this.peerList[v.account] && this.peerList[v.account].setRemoteDescription(v.sdp, function () {}, () => { // console.log(err)
        })
      })
      socket.on('__ice_candidate', v => {
        console.log(v.account + 'take_candidate', v.candidate)
        // 如果是一个ICE的候选，则将其加入到PeerConnection中
        if (v.candidate) {
          this.peerList[v.account] && this.peerList[v.account].addIceCandidate(v.candidate).catch(() => {}// console.log('err', e)
          )
        }
      })
      socket.on('disconnected', id => {
        console.log('disconnected', id)
        let dom = document.querySelector('#' + id)
        if (dom) {
          dom.remove()
        }
      })
    },
    hangup () { // 挂断通话
      socket.on('disconnected', id => {
        console.log('disconnected', id)
        let dom = document.querySelector('#' + id)
        if (dom) {
          dom.remove()
        }
      })
    }
  },
  mounted () {
    this.$nextTick(() => {
      this.getUserMedia().then(() => {
        socket.emit('join', {roomid: this.$route.params.roomid, account: this.$route.params.account})
      })
      this.socketInit()
      socket.on('joined', (data, account) => {
        console.log('joined', data)
        if (data.length >= 1) {
          this.peers = data
          data.forEach(v => {
            let obj = {}
            let arr = [v.account, this.$route.params.account]
            obj.account = arr.sort().join('-')
            if (!this.peerList[obj.account] && v.account !== this.$route.params.account) {
              // console.log('obj', obj);
              this.getPeerConnection(obj)
            }
          })
          if (account === this.$route.params.account) {
            // this.peerList = data
            console.log('account', account)
            for (let k in this.peerList) {
              this.createOffer(k, this.peerList[k])
            }
          }
        }
      })
    })
  },
  destroyed () {
    socket.on('disconnected', id => {
      console.log(id + '离开了房间')
      let dom = document.querySelector('#' + id)
      if (dom) {
        dom.remove()
      }
    })
  }
}
</script>

<style lang="less">
    .room{
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: flex-start;
    }
    .userList{
        border: 1px solid #ddd;
        margin-right: 50px;
        h5{
            text-align: left;
            margin-bottom: 5px;
        }
        p{
            border-bottom: 1px solid #ddd;
            line-height: 32px;
            width:200px;
            position: relative;
            overflow: hidden;
            cursor: pointer;
             i{
                font-style: normal;
                font-size: 11px;
                border: 1px solid #1fbeca;
                color: #27cac7;
                border-radius: 2px;
                line-height: 1;
                display: block;
                position: absolute;
                padding: 1px 2px;
                right: 5px;
                top: 5px;
            }
        }
        p:last-child{
          border-bottom: none;
        }
        p:hover span{
            top:0;
        }
    }
    .audio-box{
       display: flex;
        justify-content: center;
        audio{
            // width:400px;
            // height: 300px;
           margin-left: 20px;
            background-color: #ddd;
        }
    }

</style>
