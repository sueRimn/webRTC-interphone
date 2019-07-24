import Vue from 'vue'
import Router from 'vue-router'
import Call from '@/components/Call.vue'
import Room from '@/components/Room.vue'

Vue.use(Router)

const router = new Router({
  routes: [{
    path: '/',
    name: 'call',
    component: Call
  },
  {
    path: '/room/:roomid/:account',
    name: 'room',
    component: Room
  }
  ]
})
export default router
