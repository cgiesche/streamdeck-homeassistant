import Vue from 'vue'
import Pi from "@/Pi";

Vue.config.productionTip = false

new Vue({
    render: h => h(Pi),
}).$mount('#pi')
