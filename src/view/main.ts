// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as bootstrap from 'bootstrap'
import { type Component, createApp } from 'vue'

import PiComponent from '@/view/components/PiComponent.vue'
import '@/view/scss/styles.scss'

createApp(PiComponent as Component).mount('#app')
