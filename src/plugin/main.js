import Vue from 'vue'
import PluginComponent from '../PluginComponent.vue'

Vue.config.productionTip = false

new Vue({
    render: h => h(PluginComponent),
}).$mount('#plugin')
