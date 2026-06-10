import axios from 'axios'
import yaml from 'js-yaml'

export async function fetchRemoteYaml(url) {
  const response = await axios.get(url)
  return yaml.load(response.data)
}
