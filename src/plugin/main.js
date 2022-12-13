import Vue from 'vue'
import Plugin from '../Plugin.vue'

Vue.config.productionTip = false

new Vue({
    render: h => h(Plugin),
}).$mount('#plugin')
