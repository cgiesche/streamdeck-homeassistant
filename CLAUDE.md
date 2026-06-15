# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
npm install

# Build for production (outputs to de.perdoctus.streamdeck.homeassistant.sdPlugin/)
npm run build

# Build in watch mode with sourcemaps (for development)
npm run build-dev

# Lint and auto-fix
npm run lint

# Format source files
npm run format

# Validate the plugin
npm run validate

# Bundle the plugin into a distributable .sdPlugin file
npm run bundle
```

There are no automated tests in this project.

## Architecture

This is an Elgato Stream Deck plugin built with Vue 3 + Vite. The plugin has **two separate entry points** that run in different contexts:

### Two Contexts

1. **Plugin** (`plugin.html` / `src/plugin/main.js`): The background process that runs invisibly. It connects to Home Assistant via WebSocket, listens to entity state changes, and renders button images as SVGs onto the Stream Deck hardware.

2. **Property Inspector (PI)** (`pi.html` / `src/pi/main.js`): The configuration UI shown in the Stream Deck desktop app when you click a button. Allows users to set HA credentials, select entities, and configure service calls.

Both communicate with the Stream Deck application via WebSocket on `ws://localhost:{port}`.

### Key Data Flow

```
StreamDeck App <--WS--> StreamDeck class (streamdeck.js)
                              |
                    PluginComponent.vue (plugin context)
                              |
                    Homeassistant class <--WS--> Home Assistant server
                              |
                    EntityConfigFactory (determines icon/color/labels)
                              |
                    SvgUtils (renders SVG button image)
                              |
                    StreamDeck.setImage() --> Stream Deck hardware
```

### Core Modules

- **`src/modules/common/streamdeck.js`**: Wrapper around the Stream Deck WebSocket protocol. Handles registration, event emission, and all `set*` commands to the hardware.

- **`src/modules/homeassistant/homeassistant.js`**: WebSocket client for the Home Assistant API. Handles auth handshake, state subscriptions, and service calls (via `execute_script` command).

- **`src/modules/plugin/entityConfigFactoryNg.js`**: Determines the icon, color, and label templates for an entity based on its domain, device class, and current state. Reads from a YAML display configuration (theme) file that can be customized by the user.

- **`src/modules/plugin/svgUtils.js`**: Renders the 288x288px SVG button images using SnapSVG and MDI icons (`@mdi/js`).

- **`src/modules/common/settings.js`**: Handles versioned settings migration (v1 through v5). Always call `Settings.parse()` before using stored settings to ensure they are migrated to the current format.

### Display Configuration System

The visual appearance of buttons is driven by YAML configuration files (`public/config/default-display-config.yml`). The config defines icon/color/labelTemplates per HA domain, device class, and state. Nunjucks templates are used for dynamic values. The `EntityConfigFactory` resolves configs using a priority chain: default < state < domain < domain+state < domain+class < domain+class+state.

### Build Output

Vite builds directly into `de.perdoctus.streamdeck.homeassistant.sdPlugin/`, which is the installed plugin directory. The `build-dev` watch mode combined with `RestartStreamDeck.js` (a custom Vite plugin) automatically restarts the Stream Deck app after each build.

### Settings Structure (v5)

```js
{
  version: 5,
  controllerType: 'Keypad' | 'Encoder',
  display: {
    entityId, useCustomTitle, buttonTitle,
    enableServiceIndicator, iconSettings, // 'PREFER_PLUGIN' | 'PREFER_HA' | 'HIDE'
    useCustomButtonLabels, buttonLabels,
    useStateImagesForOnOffStates
  },
  button: {
    serviceShortPress: { serviceId, entityId, serviceData },
    serviceLongPress:  { serviceId, entityId, serviceData },
    serviceTap:        { serviceId, entityId, serviceData },
    serviceRotation:   { serviceId, entityId, serviceData }
  },
  rotationTickMultiplier, rotationTickBucketSizeMs
}
```