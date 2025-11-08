import { exec } from 'node:child_process'

export default function RestartStreamDeck() {
  return {
    name: 'streamdeck-restart-once',
    apply: 'build',
    closeBundle() {
      exec('streamdeck restart de.perdoctus.streamdeck.homeassistant', (err, stdout, stderr) => {
        if (err) {
          console.warn('Stream Deck restart failed. Ensure the Elgato Stream Deck app and CLI are installed and accessible.')
        } else {
          console.log(`Restarted Stream Deck: ${stdout}`)
        }
      })
    }
  }
}
