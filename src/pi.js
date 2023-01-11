import Vue from 'vue'
import PiComponent from "@/components/PiComponent.vue";
import { BootstrapVue, IconsPlugin } from 'bootstrap-vue'

import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue/dist/bootstrap-vue.css'
import "bootswatch/dist/superhero/bootstrap.min.css";

// Make BootstrapVue available throughout your project
Vue.use(BootstrapVue)
// Optionally install the BootstrapVue icon components plugin
Vue.use(IconsPlugin)

Vue.config.productionTip = false
Vue.config.devtools = true;

new Vue({
    render: h => h(PiComponent),
}).$mount("app")
