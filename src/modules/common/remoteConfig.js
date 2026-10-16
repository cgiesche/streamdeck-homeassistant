import axios from 'axios'
import { load, CORE_SCHEMA, mergeTag } from 'js-yaml'

// js-yaml 5 dropped `<<` merge keys from the default schema; keep them for user themes
const YAML_SCHEMA = CORE_SCHEMA.withTags(mergeTag)

export function loadYaml(source) {
  return load(source, { schema: YAML_SCHEMA })
}

export async function fetchRemoteYaml(url) {
  const response = await axios.get(url)
  return loadYaml(response.data)
}
