import { createApp } from 'vue'
import PiComponent from '@/components/PiComponent.vue'
import { installConsoleCapture } from '@/modules/common/debugLog'
import '../scss/pi-design.scss'

installConsoleCapture()

createApp(PiComponent).mount('#app')
