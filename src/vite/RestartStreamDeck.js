import { exec } from 'node:child_process'

export default function RestartStreamDeck() {
    return     {
      name: 'streamdeck-restart-once',
      apply: 'build',
      closeBundle() {
        exec('streamdeck restart de.perdoctus.streamdeck.homeassistant', (err, stdout, stderr) => {
          if (err) {
            console.error(`Error restarting Streamdeck: ${stderr}`);
          } else {
            console.log(`Restarted Streamdeck: ${stdout}`);
          }
        });
      }
    }

}