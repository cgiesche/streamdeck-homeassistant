<template>
  <div class="app">

    <!-- ╔══ RAIL ══════════════════════════════════════════╗ -->
    <header class="rail">
      <div class="rail-brand">
        <svg class="rail-logo" viewBox="0 0 18 18" fill="none">
          <rect x="1"   y="1"   width="7" height="7" rx="1.5" fill="currentColor"/>
          <rect x="10"  y="1"   width="7" height="7" rx="1.5" fill="currentColor" opacity=".4"/>
          <rect x="1"   y="10"  width="7" height="7" rx="1.5" fill="currentColor" opacity=".4"/>
          <rect x="10"  y="10"  width="7" height="7" rx="1.5" fill="currentColor"/>
        </svg>
        <span class="rail-title">DISPLAY CONFIG</span>
      </div>
      <span class="rail-file">display-config.yml</span>
      <div class="rail-acts">
        <button class="rl-btn" @click="loadDefault">RESET</button>
        <button class="rl-btn" @click="$refs.fileInput.click()">LOAD</button>
        <input ref="fileInput" type="file" accept=".yml,.yaml" style="display:none" @change="loadFile" />
        <button class="rl-btn rl-btn--go" @click="downloadYaml">EXPORT YAML</button>
      </div>
    </header>

    <!-- ╔══ WORKSPACE ══════════════════════════════════════╗ -->
    <div class="workspace">

      <!-- ── TREE ─────────────────────────────────── -->
      <nav class="t-panel">
        <div class="panel-cap">STRUCTURE</div>

        <div class="t-scroll">
          <!-- Defaults root -->
          <div class="tnode tnode--root" :class="{active: sel.type==='defaults'}" @click="select({type:'defaults'})">
            <span class="tnode-pip" />
            <span class="tnode-lbl">_defaults</span>
          </div>
          <div class="t-children">
            <div
              v-for="(_, st) in config._states" :key="'ds-'+st"
              class="tnode tnode--state" :class="{active: sel.type==='default-state' && sel.state===st}"
              @click="select({type:'default-state', state:st})"
            >
              <span class="tnode-rail" /><span class="tnode-lbl">{{ st }}</span>
            </div>
            <button class="t-add" @click="addDefaultState">+ state</button>
          </div>

          <div class="t-sep" />

          <!-- Domains -->
          <template v-for="(domCfg, domain) in domains" :key="domain">
            <div
              class="tnode tnode--domain" :class="{active: sel.type==='domain' && sel.domain===domain}"
              @click="select({type:'domain', domain})"
            >
              <span class="tnode-pip" />
              <span v-if="resolveIcon(domain)" class="tnode-icon">
                <svg viewBox="0 0 24 24" width="13" height="13"><path :d="resolveIcon(domain)" fill="currentColor"/></svg>
              </span>
              <span class="tnode-lbl">{{ domain }}</span>
            </div>
            <div class="t-children">
              <!-- domain states -->
              <div
                v-for="(_, st) in domCfg.states" :key="domain+'-s-'+st"
                class="tnode tnode--state" :class="{active: sel.type==='domain-state' && sel.domain===domain && sel.state===st}"
                @click="select({type:'domain-state', domain, state:st})"
              >
                <span class="tnode-rail" /><span class="tnode-lbl">{{ st }}</span>
              </div>
              <!-- classes -->
              <template v-for="(clsCfg, cls) in domCfg.classes" :key="domain+'-c-'+cls">
                <div
                  class="tnode tnode--class" :class="{active: sel.type==='domain-class' && sel.domain===domain && sel.cls===cls}"
                  @click="select({type:'domain-class', domain, cls})"
                >
                  <span class="tnode-rail" />
                  <span class="tnode-tag">cls</span>
                  <span class="tnode-lbl">{{ cls }}</span>
                </div>
                <div class="t-children t-children--deep">
                  <div
                    v-for="(_, st) in clsCfg.states" :key="domain+'-c-'+cls+'-s-'+st"
                    class="tnode tnode--state" :class="{active: sel.type==='class-state' && sel.domain===domain && sel.cls===cls && sel.state===st}"
                    @click="select({type:'class-state', domain, cls, state:st})"
                  >
                    <span class="tnode-rail" /><span class="tnode-lbl">{{ st }}</span>
                  </div>
                  <button class="t-add" @click.stop="addClassState(domain, cls)">+ state</button>
                </div>
              </template>
              <div class="t-row-acts">
                <button class="t-add" @click.stop="addDomainState(domain)">+ state</button>
                <button class="t-add" @click.stop="addDomainClass(domain)">+ class</button>
              </div>
            </div>
          </template>
        </div>

        <button class="t-domain-add" @click="addDomain">＋ NEW DOMAIN</button>
      </nav>

      <!-- ── FORM ──────────────────────────────────── -->
      <main class="f-panel">
        <template v-if="node">
          <div class="f-head">
            <div class="f-path">{{ nodeLabel }}</div>
          </div>
          <div class="f-body">

            <!-- defaults -->
            <template v-if="sel.type==='defaults'">
              <div class="fg">
                <div class="fg-label">DEFAULT COLOR</div>
                <div class="fg-color-row">
                  <input type="color" :value="safeColor(node._color)" class="fg-swatch" @input="node._color=$event.target.value" />
                  <input v-model="node._color" type="text" class="fg-input" />
                </div>
              </div>
              <div class="fg">
                <div class="fg-label">DEFAULT BACKGROUND</div>
                <color-field v-model="node._backgroundColor" />
              </div>
              <div class="fg">
                <div class="fg-label">DEFAULT BACKGROUND EDGE <span class="fg-hint">radial gradient, optional</span></div>
                <color-field v-model="node._backgroundColorEnd" />
              </div>
              <div class="fg">
                <div class="fg-label">DEFAULT LABEL TEMPLATES</div>
                <template-list v-model="node._labelTemplates" />
              </div>
            </template>

            <!-- default-state -->
            <template v-else-if="sel.type==='default-state'">
              <div class="fg">
                <div class="fg-label">COLOR</div>
                <div class="fg-color-row">
                  <input type="color" :value="safeColor(node.color)" class="fg-swatch" @input="node.color=$event.target.value" />
                  <input v-model="node.color" type="text" class="fg-input" />
                </div>
              </div>
              <div class="fg">
                <div class="fg-label">BACKGROUND</div>
                <color-field v-model="node.backgroundColor" />
              </div>
              <div class="fg">
                <div class="fg-label">BACKGROUND EDGE <span class="fg-hint">radial gradient, optional</span></div>
                <color-field v-model="node.backgroundColorEnd" />
              </div>
            </template>

            <!-- domain / domain-class -->
            <template v-else-if="sel.type==='domain' || sel.type==='domain-class'">
              <div class="fg">
                <div class="fg-label">ICON</div>
                <icon-field v-model="node.icon" />
              </div>
              <div class="fg">
                <div class="fg-label">COLOR</div>
                <color-field v-model="node.color" />
              </div>
              <div class="fg">
                <div class="fg-label">BACKGROUND</div>
                <color-field v-model="node.backgroundColor" />
              </div>
              <div class="fg">
                <div class="fg-label">BACKGROUND EDGE <span class="fg-hint">radial gradient, optional</span></div>
                <color-field v-model="node.backgroundColorEnd" />
              </div>
              <div class="fg">
                <div class="fg-label">LABEL TEMPLATES</div>
                <template-list v-model="node.labelTemplates" />
              </div>
              <div class="fg">
                <div class="fg-label">FEEDBACK LAYOUT <span class="fg-hint">$B1, $A1…</span></div>
                <input v-model="node.feedbackLayout" type="text" placeholder="$B1" class="fg-input fg-input--sm" />
              </div>
              <div class="fg">
                <div class="fg-label">FEEDBACK <span class="fg-hint">JSON Nunjucks template</span></div>
                <textarea v-model="node.feedback" class="fg-textarea fg-textarea--code" rows="5" />
              </div>
            </template>

            <!-- state nodes -->
            <template v-else-if="sel.type==='domain-state' || sel.type==='class-state'">
              <div class="fg">
                <div class="fg-label">ICON <span class="fg-hint">overrides domain</span></div>
                <icon-field v-model="node.icon" />
              </div>
              <div class="fg">
                <div class="fg-label">COLOR <span class="fg-hint">overrides domain</span></div>
                <color-field v-model="node.color" />
              </div>
              <div class="fg">
                <div class="fg-label">BACKGROUND <span class="fg-hint">overrides domain</span></div>
                <color-field v-model="node.backgroundColor" />
              </div>
              <div class="fg">
                <div class="fg-label">BACKGROUND EDGE <span class="fg-hint">radial gradient, optional</span></div>
                <color-field v-model="node.backgroundColorEnd" />
              </div>
            </template>

            <div class="f-footer">
              <button class="f-danger" @click="deleteNode">DELETE NODE</button>
            </div>
          </div>
        </template>

        <div v-else class="f-empty">
          <svg class="f-empty-glyph" viewBox="0 0 24 24" fill="none">
            <rect x="2"  y="2"  width="8" height="8" rx="1" stroke="currentColor" stroke-width="1" opacity=".3"/>
            <rect x="14" y="2"  width="8" height="8" rx="1" stroke="currentColor" stroke-width="1" opacity=".15"/>
            <rect x="2"  y="14" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1" opacity=".15"/>
            <rect x="14" y="14" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1" opacity=".3"/>
          </svg>
          <p class="f-empty-txt">SELECT A NODE TO EDIT</p>
        </div>
      </main>

      <!-- ── PREVIEW ────────────────────────────────── -->
      <aside class="p-panel">
        <div class="panel-cap">LIVE PREVIEW</div>

        <!-- Stream Deck hardware mockup -->
        <div class="sdeck-wrap">
          <div class="sdeck-body">
            <div class="sdeck-legend">
              <span class="sdeck-dot" /><span class="sdeck-legend-txt">STREAM DECK</span>
            </div>
            <div class="sdeck-well">
              <div class="sdeck-btn" v-html="previewSvg" />
            </div>
          </div>
        </div>

        <!-- Resolved values -->
        <div v-if="resolved" class="p-resolved">
          <div class="p-resolved-row">
            <span class="p-rkey">ICON</span>
            <code class="p-rval">{{ resolved.icon ?? '—' }}</code>
          </div>
          <div class="p-resolved-row">
            <span class="p-rkey">COLOR</span>
            <span v-if="isCssColor(resolved.color)" class="p-rswatch" :style="{background: resolved.color.trim()}" />
            <code class="p-rval">{{ resolved.color ?? '—' }}</code>
          </div>
        </div>

        <div class="p-divider" />
        <div class="panel-cap">TEST ENTITY</div>

        <div class="p-test">
          <div class="fg">
            <div class="fg-label">DOMAIN</div>
            <select v-model="test.domain" class="fg-select">
              <option v-for="d in domainNames" :key="d" :value="d">{{ d }}</option>
            </select>
          </div>
          <div class="fg">
            <div class="fg-label">STATE</div>
            <input v-model="test.state" type="text" class="fg-input" />
          </div>
          <div class="fg">
            <div class="fg-label">DEVICE CLASS <span class="fg-hint">optional</span></div>
            <input v-model="test.deviceClass" type="text" class="fg-input" placeholder="—" />
          </div>
          <div class="fg">
            <div class="fg-label">ATTRIBUTES <span class="fg-hint">JSON</span></div>
            <textarea v-model="test.attributesJson" class="fg-textarea fg-textarea--code" rows="3" @blur="validateAttrs" />
            <span v-if="test.attrError" class="fg-error">{{ test.attrError }}</span>
          </div>
        </div>
      </aside>

    </div><!-- /workspace -->
  </div><!-- /app -->
</template>

<script setup>
import { ref, reactive, computed, defineComponent, h } from 'vue'
import * as Mdi from '@mdi/js'
import jsYaml from 'js-yaml'
import defaultConfig from '../../public/config/default-display-config.yml'
import { EntityConfigFactory } from '../modules/plugin/entityConfigFactoryNg.js'
import { SvgUtils } from '../modules/plugin/svgUtils.js'

// ── icon helpers ─────────────────────────────────────────────────────────────

function toPascalCase(name) {
  return 'mdi' + name.substring(4).replace(/(^\w|-\w)/g, (s) => s.replace(/-/, '').toUpperCase())
}

function getIconPath(name) {
  if (!name || !name.startsWith('mdi:')) return null
  return Mdi[toPascalCase(name)] ?? null
}

const ALL_ICON_NAMES = Object.keys(Mdi).map(
  (key) => 'mdi:' + key.slice(3).replace(/([A-Z])/g, (m) => '-' + m.toLowerCase()).slice(1)
)

// ── config state ──────────────────────────────────────────────────────────────

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

const config = ref(deepClone(defaultConfig))

function loadDefault() {
  config.value = deepClone(defaultConfig)
}

function loadFile(e) {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    try {
      config.value = jsYaml.load(ev.target.result)
    } catch (err) {
      alert('Failed to parse YAML: ' + err.message)
    }
  }
  reader.readAsText(file)
}

function downloadYaml() {
  const yaml = jsYaml.dump(config.value, { lineWidth: 120 })
  const blob = new Blob([yaml], { type: 'text/yaml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'display-config.yml'
  a.click()
  URL.revokeObjectURL(url)
}

// ── tree helpers ──────────────────────────────────────────────────────────────

const SYSTEM_KEYS = new Set(['_color', '_labelTemplates', '_states'])

const domains = computed(() => {
  const result = {}
  for (const [k, v] of Object.entries(config.value)) {
    if (!SYSTEM_KEYS.has(k)) result[k] = v
  }
  return result
})

const domainNames = computed(() => Object.keys(domains.value))

// ── selection & editable node ─────────────────────────────────────────────────

const sel = reactive({ type: null, domain: null, cls: null, state: null })

function select(s) {
  Object.assign(sel, { type: null, domain: null, cls: null, state: null }, s)
}

const node = computed(() => {
  if (!sel.type) return null
  const cfg = config.value
  if (sel.type === 'defaults') return cfg
  if (sel.type === 'default-state') return cfg._states?.[sel.state]
  if (sel.type === 'domain') return cfg[sel.domain]
  if (sel.type === 'domain-state') return cfg[sel.domain]?.states?.[sel.state]
  if (sel.type === 'domain-class') return cfg[sel.domain]?.classes?.[sel.cls]
  if (sel.type === 'class-state') return cfg[sel.domain]?.classes?.[sel.cls]?.states?.[sel.state]
  return null
})

const nodeLabel = computed(() => {
  if (!sel.type) return ''
  if (sel.type === 'defaults') return 'Defaults'
  if (sel.type === 'default-state') return `_states › ${sel.state}`
  if (sel.type === 'domain') return sel.domain
  if (sel.type === 'domain-state') return `${sel.domain} › ${sel.state}`
  if (sel.type === 'domain-class') return `${sel.domain} › ${sel.cls}`
  if (sel.type === 'class-state') return `${sel.domain} › ${sel.cls} › ${sel.state}`
  return ''
})

// ── tree mutations ────────────────────────────────────────────────────────────

function addDefaultState() {
  const name = prompt('State name:')
  if (!name) return
  if (!config.value._states) config.value._states = {}
  config.value._states[name] = { color: '#aaaaaa' }
  select({ type: 'default-state', state: name })
}

function addDomain() {
  const name = prompt('Domain name:')
  if (!name) return
  config.value[name] = { icon: '', labelTemplates: [], states: {} }
  select({ type: 'domain', domain: name })
}

function addDomainState(domain) {
  const name = prompt('State name:')
  if (!name) return
  if (!config.value[domain].states) config.value[domain].states = {}
  config.value[domain].states[name] = {}
  select({ type: 'domain-state', domain, state: name })
}

function addDomainClass(domain) {
  const name = prompt('Device class name:')
  if (!name) return
  if (!config.value[domain].classes) config.value[domain].classes = {}
  config.value[domain].classes[name] = { states: {} }
  select({ type: 'domain-class', domain, cls: name })
}

function addClassState(domain, cls) {
  const name = prompt('State name:')
  if (!name) return
  if (!config.value[domain].classes[cls].states) config.value[domain].classes[cls].states = {}
  config.value[domain].classes[cls].states[name] = {}
  select({ type: 'class-state', domain, cls, state: name })
}

function deleteNode() {
  if (!confirm(`Delete "${nodeLabel.value}"?`)) return
  const cfg = config.value
  if (sel.type === 'default-state') {
    delete cfg._states[sel.state]
  } else if (sel.type === 'domain') {
    delete cfg[sel.domain]
  } else if (sel.type === 'domain-state') {
    delete cfg[sel.domain].states[sel.state]
  } else if (sel.type === 'domain-class') {
    delete cfg[sel.domain].classes[sel.cls]
  } else if (sel.type === 'class-state') {
    delete cfg[sel.domain].classes[sel.cls].states[sel.state]
  }
  select({ type: null })
}

// ── preview ───────────────────────────────────────────────────────────────────

const test = reactive({
  domain: 'light',
  state: 'on',
  deviceClass: '',
  attributesJson: '{"brightness": 200}',
  attrError: ''
})

function validateAttrs() {
  try {
    JSON.parse(test.attributesJson || '{}')
    test.attrError = ''
  } catch (e) {
    test.attrError = e.message
  }
}

const svgUtils = new SvgUtils()

const preview = computed(() => {
  try {
    const attrs = JSON.parse(test.attributesJson || '{}')
    if (test.deviceClass) attrs.device_class = test.deviceClass
    const stateObject = {
      entity_id: `${test.domain}.preview`,
      state: test.state,
      attributes: attrs
    }
    const factory = new EntityConfigFactory()
    factory.displayConfiguration = config.value
    const renderingConfig = factory.determineConfig(test.domain, stateObject, {
      iconSettings: 'PREFER_PLUGIN',
      iconLayout: 'STANDARD'
    })
    return {
      svg: svgUtils.renderButtonSVG(renderingConfig, stateObject),
      resolved: { icon: renderingConfig.icon, color: renderingConfig.color }
    }
  } catch {
    return {
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144"><rect width="144" height="144" fill="#300"/><text x="72" y="72" fill="red" text-anchor="middle" font-size="12">Error</text></svg>',
      resolved: null
    }
  }
})

const previewSvg = computed(() => preview.value.svg)
const resolved = computed(() => preview.value.resolved)

// ── color/icon helpers ────────────────────────────────────────────────────────

function safeColor(v) {
  return v && /^#[0-9a-fA-F]{6}$/.test(v) ? v : '#aaaaaa'
}

function isCssColor(v) {
  return v && /^#[0-9a-fA-F]{3,6}$/.test(v.trim())
}

function resolveIcon(domain) {
  const icon = config.value[domain]?.icon
  if (!icon || icon.includes('{%') || icon.includes('{{')) return null
  return getIconPath(icon.trim())
}

// ── sub-components ────────────────────────────────────────────────────────────

const TemplateList = defineComponent({
  props: { modelValue: Array },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const list = computed({
      get: () => props.modelValue ?? [],
      set: (v) => emit('update:modelValue', v)
    })

    function update(i, val) {
      const arr = [...list.value]
      arr[i] = val
      emit('update:modelValue', arr)
    }

    function add() {
      emit('update:modelValue', [...list.value, ''])
    }

    function remove(i) {
      const arr = [...list.value]
      arr.splice(i, 1)
      emit('update:modelValue', arr)
    }

    return () =>
      h('div', { class: 'tpl-list' }, [
        ...(list.value || []).map((tpl, i) =>
          h('div', { class: 'tpl-item', key: i }, [
            h('textarea', {
              class: 'tpl-textarea',
              rows: Math.max(2, (tpl || '').split('\n').length + 1),
              value: tpl,
              onInput: (e) => update(i, e.target.value)
            }),
            h('button', { class: 'tpl-remove', onClick: () => remove(i) }, '✕')
          ])
        ),
        h('button', { class: 'tpl-add', onClick: add }, '+ TEMPLATE')
      ])
  }
})

const IconField = defineComponent({
  props: { modelValue: String },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const search = ref('')
    const results = ref([])

    function onSearch() {
      const q = search.value.toLowerCase()
      if (!q) { results.value = []; return }
      results.value = ALL_ICON_NAMES.filter((n) => n.includes(q)).slice(0, 60)
    }

    function pick(name) {
      emit('update:modelValue', name)
      search.value = ''
      results.value = []
    }

    return () => {
      const path = getIconPath((props.modelValue || '').trim())
      return h('div', { class: 'icf' }, [
        h('div', { class: 'icf-row' }, [
          path ? h('svg', { class: 'icf-glyph', viewBox: '0 0 24 24', width: 28, height: 28 }, [
            h('path', { d: path, fill: 'currentColor' })
          ]) : null,
          h('input', {
            type: 'text',
            value: props.modelValue || '',
            placeholder: 'mdi:icon-name',
            class: 'icf-input',
            onInput: (e) => emit('update:modelValue', e.target.value)
          })
        ]),
        h('input', {
          type: 'text',
          value: search.value,
          placeholder: 'Search icons…',
          class: 'icf-search',
          onInput: (e) => { search.value = e.target.value; onSearch() }
        }),
        results.value.length
          ? h('div', { class: 'icf-grid' },
              results.value.map((name) => {
                const p = getIconPath(name)
                return p ? h('span', {
                  class: 'icf-cell',
                  title: name,
                  key: name,
                  onClick: () => pick(name)
                }, [h('svg', { viewBox: '0 0 24 24', width: 20, height: 20 }, [h('path', { d: p, fill: 'currentColor' })])]) : null
              })
            )
          : null
      ])
    }
  }
})

const ColorField = defineComponent({
  props: { modelValue: String },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const isTemplate = computed(() => {
      const v = props.modelValue || ''
      return v.includes('{%') || v.includes('{{')
    })

    return () =>
      h('div', { class: 'clf' }, [
        !isTemplate.value
          ? h('input', {
              type: 'color',
              class: 'clf-swatch',
              value: safeColor(props.modelValue),
              onInput: (e) => emit('update:modelValue', e.target.value)
            })
          : null,
        h('textarea', {
          class: 'clf-text',
          rows: isTemplate.value ? 6 : 1,
          value: props.modelValue || '',
          placeholder: '#FFFFFF or Nunjucks template',
          onInput: (e) => emit('update:modelValue', e.target.value)
        })
      ])
  }
})
</script>

<style>
/* ── Tokens ──────────────────────────────────────────────────── */
:root {
  --void:        #05060a;
  --base:        #0b0d12;
  --surf:        #10131b;
  --raised:      #171b26;
  --card:        #1c2130;
  --hover:       rgba(255,255,255,0.03);

  --amber:       #f5a623;
  --amber-dim:   rgba(245,166,35,0.12);
  --amber-glow:  rgba(245,166,35,0.06);
  --amber-text:  #f5a623;

  --teal:        #1ecfb0;
  --teal-dim:    rgba(30,207,176,0.1);

  --hi:          #dde2ee;
  --mid:         #9fa9c2;
  --lo:          #717c96;
  --code:        #5ecfb8;

  --b0:          rgba(255,255,255,0.07);
  --b1:          rgba(255,255,255,0.13);
  --b2:          rgba(255,255,255,0.22);

  --danger:      #e05c5c;
  --danger-dim:  rgba(224,92,92,0.1);

  --r:   5px;
  --r2: 10px;

  --font-ui:   system-ui, -apple-system, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
}

/* ── Reset ───────────────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* ── Grain overlay ───────────────────────────────────────────── */
body::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  opacity: 0.035;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E");
  background-size: 256px;
}

body {
  font-family: var(--font-ui);
  font-size: 14px;
  background: var(--void);
  color: var(--hi);
  height: 100vh;
  overflow: hidden;
}

/* ── App Shell ───────────────────────────────────────────────── */
.app { display: flex; flex-direction: column; height: 100vh; }

/* ── Rail (topbar) ───────────────────────────────────────────── */
.rail {
  display: flex;
  align-items: center;
  height: 38px;
  padding: 0 14px;
  background: var(--surf);
  border-bottom: 1px solid var(--b0);
  flex-shrink: 0;
  gap: 14px;
  position: relative;
}

.rail::after {
  content: '';
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, var(--amber) 0%, transparent 30%);
  opacity: 0.4;
}

.rail-brand { display: flex; align-items: center; gap: 8px; color: var(--amber); }

.rail-logo { width: 15px; height: 15px; flex-shrink: 0; }

.rail-title {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: var(--amber);
  white-space: nowrap;
}

.rail-file {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--lo);
  letter-spacing: 0.03em;
  margin-right: auto;
}

.rail-acts { display: flex; gap: 5px; }

.rl-btn {
  height: 24px;
  padding: 0 10px;
  border-radius: var(--r);
  border: 1px solid var(--b1);
  background: transparent;
  color: var(--mid);
  font-family: var(--font-ui);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  cursor: pointer;
  transition: border-color 0.1s, color 0.1s, background 0.1s;
}
.rl-btn:hover { border-color: var(--b2); color: var(--hi); background: var(--hover); }

.rl-btn--go {
  border-color: rgba(245,166,35,0.3);
  color: var(--amber);
  background: var(--amber-glow);
}
.rl-btn--go:hover {
  background: var(--amber-dim);
  border-color: rgba(245,166,35,0.5);
  box-shadow: 0 0 10px rgba(245,166,35,0.15);
}

/* ── Workspace ───────────────────────────────────────────────── */
.workspace {
  display: grid;
  grid-template-columns: 212px 1fr 268px;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

/* ── Shared ──────────────────────────────────────────────────── */
.panel-cap {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.2em;
  color: var(--lo);
  padding: 12px 14px 5px;
}

/* ── Tree Panel ──────────────────────────────────────────────── */
.t-panel {
  background: var(--surf);
  border-right: 1px solid var(--b0);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.t-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 4px 6px 8px;
}

/* tree nodes */
.tnode {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 27px;
  padding: 0 6px;
  border-radius: var(--r);
  cursor: pointer;
  user-select: none;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--mid);
  transition: background 0.08s, color 0.08s;
  position: relative;
}
.tnode:hover { background: var(--hover); color: var(--hi); }

.tnode.active {
  background: var(--amber-dim);
  color: var(--amber);
}
.tnode.active::before {
  content: '';
  position: absolute;
  left: 0; top: 4px; bottom: 4px;
  width: 2px;
  border-radius: 1px;
  background: var(--amber);
  box-shadow: 0 0 6px var(--amber);
}

.tnode--root { font-size: 13px; font-weight: 600; color: var(--hi); }
.tnode--domain { font-size: 14px; font-weight: 600; color: var(--hi); margin-top: 1px; }
.tnode--class { font-size: 12px; color: var(--mid); }
.tnode--state { font-size: 12px; color: var(--lo); }
.tnode--state.active { color: var(--amber); }

.tnode-pip {
  width: 5px; height: 5px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.45;
  flex-shrink: 0;
}
.tnode.active .tnode-pip { opacity: 1; box-shadow: 0 0 4px currentColor; }

.tnode-rail {
  width: 1px; height: 13px;
  background: var(--b1);
  flex-shrink: 0;
  margin-left: 4px;
}

.tnode-icon {
  width: 14px; height: 14px;
  display: flex; align-items: center; justify-content: center;
  opacity: 0.5; flex-shrink: 0;
}
.tnode.active .tnode-icon { opacity: 1; }

.tnode-tag {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.06em;
  background: var(--card);
  border: 1px solid var(--b1);
  border-radius: 3px;
  padding: 0 4px;
  height: 13px;
  line-height: 13px;
  color: var(--lo);
  flex-shrink: 0;
}

.tnode-lbl { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.t-children {
  margin-left: 12px;
  padding-left: 2px;
  border-left: 1px solid var(--b0);
}
.t-children--deep { margin-left: 24px; }

.t-row-acts { display: flex; flex-wrap: wrap; }

.t-add {
  height: 22px;
  padding: 0 7px;
  background: none;
  border: none;
  font-family: var(--font-ui);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.07em;
  color: var(--lo);
  cursor: pointer;
  border-radius: var(--r);
  transition: color 0.1s;
}
.t-add:hover { color: var(--amber); }

.t-sep {
  height: 1px;
  background: var(--b0);
  margin: 6px 6px;
}

.t-domain-add {
  flex-shrink: 0;
  margin: 6px 10px 10px;
  height: 30px;
  border: 1px dashed rgba(245,166,35,0.35);
  border-radius: var(--r);
  background: none;
  font-family: var(--font-ui);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: rgba(245,166,35,0.75);
  cursor: pointer;
  transition: all 0.12s;
}
.t-domain-add:hover {
  border-color: rgba(245,166,35,0.5);
  color: var(--amber);
  background: var(--amber-glow);
  box-shadow: 0 0 12px var(--amber-glow);
}

/* ── Form Panel ──────────────────────────────────────────────── */
.f-panel {
  background: var(--base);
  border-right: 1px solid var(--b0);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.f-head {
  padding: 16px 22px 14px;
  border-bottom: 1px solid var(--b0);
  position: sticky;
  top: 0;
  background: var(--base);
  z-index: 1;
}

.f-path {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--hi);
}

/* Amber highlight on the last segment */
.f-path::after { color: var(--amber); }

.f-body { padding: 18px 22px 28px; flex: 1; }

/* ── Field groups ─────────────────────────────────────────────── */
.fg { margin-bottom: 18px; }

.fg-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: var(--lo);
  margin-bottom: 6px;
}

.fg-hint {
  font-weight: 400;
  letter-spacing: 0.04em;
  text-transform: none;
  color: var(--lo);
  opacity: 0.7;
}

.fg-input,
.fg-select,
.fg-textarea {
  width: 100%;
  background: var(--raised);
  border: 1px solid var(--b0);
  border-radius: var(--r);
  color: var(--hi);
  padding: 7px 10px;
  font-family: var(--font-ui);
  font-size: 14px;
  font-weight: 500;
  outline: none;
  transition: border-color 0.12s, box-shadow 0.12s;
}
.fg-input:focus,
.fg-select:focus,
.fg-textarea:focus {
  border-color: rgba(245,166,35,0.3);
  box-shadow: 0 0 0 2px rgba(245,166,35,0.06);
}

.fg-input--sm { width: auto; min-width: 80px; }

.fg-textarea { resize: vertical; }
.fg-textarea--code {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--code);
  line-height: 1.6;
}

.fg-select {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath d='M0 0l5 6 5-6' stroke='%23323850' stroke-width='1.5'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  padding-right: 28px;
}

.fg-error {
  font-size: 11px;
  color: var(--danger);
  margin-top: 4px;
  display: block;
}

.fg-color-row { display: flex; gap: 8px; align-items: center; }
.fg-swatch {
  width: 36px; height: 32px;
  border-radius: var(--r);
  border: 1px solid var(--b1);
  background: var(--raised);
  padding: 2px;
  cursor: pointer;
  flex-shrink: 0;
}

.f-footer {
  margin-top: 28px;
  padding-top: 16px;
  border-top: 1px solid var(--b0);
}

.f-danger {
  height: 28px;
  padding: 0 14px;
  border-radius: var(--r);
  border: 1px solid rgba(224,92,92,0.2);
  background: var(--danger-dim);
  color: var(--danger);
  font-family: var(--font-ui);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  cursor: pointer;
  transition: all 0.12s;
}
.f-danger:hover { background: rgba(224,92,92,0.18); border-color: rgba(224,92,92,0.35); }

.f-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  color: var(--lo);
  padding: 60px 0;
}
.f-empty-glyph { width: 40px; height: 40px; }
.f-empty-txt {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.2em;
}

/* ── Preview Panel ───────────────────────────────────────────── */
.p-panel {
  background: var(--surf);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

/* Stream Deck hardware mockup */
.sdeck-wrap {
  display: flex;
  justify-content: center;
  padding: 16px 16px 12px;
}

.sdeck-body {
  /* Brushed plastic/aluminum housing */
  background:
    linear-gradient(135deg, #232836 0%, #181c27 40%, #13161f 100%);
  border-radius: 14px;
  padding: 14px 14px 16px;
  box-shadow:
    0 0 0 1px rgba(255,255,255,0.06),
    0 1px 0 rgba(255,255,255,0.1) inset,
    0 -1px 0 rgba(0,0,0,0.5) inset,
    0 24px 48px rgba(0,0,0,0.6),
    0 8px 16px rgba(0,0,0,0.4);
  position: relative;
}

/* Elgato-style top logo area */
.sdeck-legend {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 12px;
  padding-left: 2px;
}

.sdeck-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--amber);
  box-shadow: 0 0 6px var(--amber), 0 0 12px rgba(245,166,35,0.4);
  animation: pulse-led 2.4s ease-in-out infinite;
}

@keyframes pulse-led {
  0%, 100% { opacity: 1; box-shadow: 0 0 6px var(--amber), 0 0 12px rgba(245,166,35,0.4); }
  50% { opacity: 0.6; box-shadow: 0 0 3px var(--amber); }
}

.sdeck-legend-txt {
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.22em;
  color: rgba(255,255,255,0.25);
}

/* Recessed button cavity */
.sdeck-well {
  background: #050507;
  border-radius: 10px;
  padding: 5px;
  box-shadow:
    inset 0 3px 10px rgba(0,0,0,0.95),
    inset 0 0 0 1px rgba(0,0,0,0.9),
    0 0 0 1px rgba(255,255,255,0.04);
}

.sdeck-btn {
  width: 150px;
  height: 150px;
  border-radius: 7px;
  overflow: hidden;
  position: relative;
}

/* Subtle gloss overlay on button */
.sdeck-btn::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 7px;
  background: linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 50%);
  pointer-events: none;
}

.sdeck-btn svg {
  width: 150px !important;
  height: 150px !important;
  display: block;
}

/* Resolved values display */
.p-resolved {
  margin: 0 14px;
  border-radius: var(--r);
  overflow: hidden;
  border: 1px solid var(--b0);
  background: var(--raised);
}

.p-resolved-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-bottom: 1px solid var(--b0);
}
.p-resolved-row:last-child { border-bottom: none; }

.p-rkey {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.16em;
  color: var(--lo);
  width: 36px;
  flex-shrink: 0;
}

.p-rval {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--code);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.p-rswatch {
  width: 12px; height: 12px;
  border-radius: 2px;
  border: 1px solid rgba(255,255,255,0.1);
  flex-shrink: 0;
}

.p-divider { height: 1px; background: var(--b0); margin: 10px 0 0; }

.p-test {
  padding: 4px 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.p-test .fg { margin-bottom: 0; }

/* ── Subcomponent: IconField ─────────────────────────────────── */
.icf { display: flex; flex-direction: column; gap: 6px; }

.icf-row { display: flex; align-items: center; gap: 8px; }

.icf-glyph {
  color: var(--amber);
  flex-shrink: 0;
  filter: drop-shadow(0 0 4px rgba(245,166,35,0.4));
}

.icf-input {
  flex: 1;
  background: var(--raised);
  border: 1px solid var(--b0);
  border-radius: var(--r);
  color: var(--hi);
  padding: 7px 10px;
  font-family: var(--font-mono);
  font-size: 12px;
  outline: none;
  transition: border-color 0.12s, box-shadow 0.12s;
}
.icf-input:focus {
  border-color: rgba(245,166,35,0.3);
  box-shadow: 0 0 0 2px rgba(245,166,35,0.06);
}

.icf-search {
  width: 100%;
  background: var(--raised);
  border: 1px solid var(--b0);
  border-radius: var(--r);
  color: var(--mid);
  padding: 6px 10px;
  font-family: var(--font-ui);
  font-size: 13px;
  outline: none;
  transition: border-color 0.12s;
}
.icf-search:focus { border-color: rgba(245,166,35,0.25); }

.icf-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  max-height: 136px;
  overflow-y: auto;
  background: var(--raised);
  border: 1px solid var(--b0);
  border-radius: var(--r);
  padding: 5px;
}

.icf-cell {
  width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 4px;
  cursor: pointer;
  color: var(--lo);
  transition: background 0.08s, color 0.08s;
}
.icf-cell:hover {
  background: var(--amber-dim);
  color: var(--amber);
}

/* ── Subcomponent: ColorField ────────────────────────────────── */
.clf { display: flex; gap: 8px; align-items: flex-start; }

.clf-swatch {
  width: 34px; height: 32px;
  border-radius: var(--r);
  border: 1px solid var(--b1);
  background: var(--raised);
  padding: 2px;
  cursor: pointer;
  flex-shrink: 0;
  margin-top: 0;
}

.clf-text {
  flex: 1;
  background: var(--raised);
  border: 1px solid var(--b0);
  border-radius: var(--r);
  color: var(--code);
  padding: 7px 10px;
  font-family: var(--font-mono);
  font-size: 12px;
  resize: vertical;
  outline: none;
  transition: border-color 0.12s, box-shadow 0.12s;
  line-height: 1.6;
}
.clf-text:focus {
  border-color: rgba(245,166,35,0.3);
  box-shadow: 0 0 0 2px rgba(245,166,35,0.06);
}

/* ── Subcomponent: TemplateList ──────────────────────────────── */
.tpl-list { display: flex; flex-direction: column; gap: 6px; }

.tpl-item { display: flex; gap: 6px; align-items: flex-start; }

.tpl-textarea {
  flex: 1;
  background: var(--raised);
  border: 1px solid var(--b0);
  border-radius: var(--r);
  color: var(--code);
  padding: 7px 10px;
  font-family: var(--font-mono);
  font-size: 12px;
  resize: vertical;
  outline: none;
  line-height: 1.6;
  transition: border-color 0.12s, box-shadow 0.12s;
}
.tpl-textarea:focus {
  border-color: rgba(245,166,35,0.3);
  box-shadow: 0 0 0 2px rgba(245,166,35,0.06);
}

.tpl-remove {
  width: 24px; height: 24px;
  margin-top: 5px;
  border-radius: 4px;
  border: 1px solid var(--b1);
  background: transparent;
  color: var(--lo);
  font-size: 11px;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.1s;
  display: flex; align-items: center; justify-content: center;
}
.tpl-remove:hover {
  border-color: rgba(224,92,92,0.3);
  color: var(--danger);
  background: var(--danger-dim);
}

.tpl-add {
  align-self: flex-start;
  height: 26px;
  padding: 0 10px;
  border: 1px dashed var(--b0);
  border-radius: var(--r);
  background: none;
  color: var(--lo);
  font-family: var(--font-ui);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: all 0.1s;
}
.tpl-add:hover {
  color: var(--amber);
  border-color: rgba(245,166,35,0.3);
  background: var(--amber-glow);
}

/* ── Scrollbars ──────────────────────────────────────────────── */
::-webkit-scrollbar { width: 3px; height: 3px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--b1); border-radius: 2px; }
::-webkit-scrollbar-thumb:hover { background: var(--b2); }
</style>
