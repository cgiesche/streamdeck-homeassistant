# StreamDeck Home Assistant Plugin

Control and monitor your Home Assistant entities directly from an Elgato Stream Deck. Buttons display real-time state with dynamic icons, colors, and labels. Works with virtually any HA entity — the plugin automatically picks the right icon and layout for recognized domains and falls back gracefully for everything else.

![Example buttons](doc/example.png)

## Features

- **Real-time state display** — button icons and colors update instantly as entity states change
- **Generic entity support** — any HA entity works out of the box, even if its domain has no dedicated icon
- **Stream Deck Keypad and Encoder (dial) support** — configure short press, long press, screen tap, and dial rotation actions independently
- **Nunjucks templates** — use live entity attributes in button titles and labels
- **Jinja2 templates in service data** — call HA script templates with dynamic values
- **Customizable display themes** — swap or extend the built-in YAML display config to change icons, colors, and labels globally
- **Icon source control** — choose plugin icons, Home Assistant entity icons, or hide them entirely
- **Visual service indicators** — colored corner dots on Keypad buttons show which actions are configured

## Installation

### Via the Stream Deck Store

Install directly from the [official Stream Deck Store](https://apps.elgato.com/plugins/de.perdoctus.streamdeck.homeassistant) — search for "Home Assistant".

### Manual installation

1. Download the latest `.streamDeckPlugin` release from the [GitHub releases page](https://github.com/cgiesche/streamdeck-homeassistant/releases).
2. Double-click the downloaded file — Stream Deck will install it automatically.
3. **macOS users:** if the double-click method does not work, see the [manual installation steps on Reddit](https://www.reddit.com/r/homeassistant/comments/laq2g4/homeassistant_streamdeck_plugin_dynamic_not_just/glu0zep/).

## Initial Setup (Global Settings)

After adding any plugin button to your Stream Deck, open its Property Inspector and fill in the **Global Settings** section. These settings apply to every button.

### Server URL

The URL of your Home Assistant WebSocket API:

- Local network (no SSL): `http://192.168.1.100:8123`
- Remote / SSL: `https://ha.mydomain.net:8123`

### Access Token

Create a **Long-Lived Access Token** from your Home Assistant profile page (scroll to the bottom of the page under *Security*). The token needs **admin rights** because the plugin uses the `execute_script` command, which is restricted to admin users.

See the [HA documentation](https://developers.home-assistant.io/docs/auth_api/#long-lived-access-token) for step-by-step instructions.

### Display Theme

Choose from the built-in themes (see [Display Themes](#display-themes--customization)) or point to a custom YAML file. After saving, the plugin connects to Home Assistant and populates the entity and service lists.

## Button Configuration

Once connected, the Property Inspector shows two tabs: **Appearance** and **Actions**.

### Appearance Tab

#### Entity

A searchable list of all entities from your Home Assistant installation. Type part of the entity name or ID to filter. The selected entity determines which state is displayed on the button and provides the default target for service calls.

#### Icon Source

Controls which icon is shown on the button:

| Option | Behaviour |
|---|---|
| **Plugin** | Uses the plugin's built-in icon for the entity's domain/class/state. Falls back to the HA entity icon if the plugin has none. |
| **Home Assistant** | Uses the icon configured on the HA entity. Falls back to the plugin icon. |
| **Hide** | No icon is shown. |

#### Visual Service Indicators *(Keypad only)*

When enabled, small colored dots appear at the corners of the button to indicate which actions are configured (short press, long press, etc.).

#### Custom Title

Override the button's main title with a [Nunjucks template](https://mozilla.github.io/nunjucks/templating.html).

> **Important:** You must also **clear the title field** in the main Stream Deck window for this template to take effect. If the Stream Deck title field is non-empty it takes precedence.

Example templates:

```
{{friendly_name}}
{{state}}°C
{{media_title}} — {{media_artist}}
```

The list of available variables for the selected entity is shown below the input field (click *Available variables* to expand).

#### Custom Labels

Each button can display up to four lines of text rendered inside the button image itself (independent of the Stream Deck title). Enter one line per text row.

- Lines 1 and 2 overlap the icon area — leave them blank unless you have no icon.
- Lines 3 and 4 appear in the lower portion of the button.
- Supports the same [Nunjucks templates](https://mozilla.github.io/nunjucks/templating.html) as Custom Title.

### Actions Tab

Each action card is collapsible. A badge on the **Actions** tab indicates that at least one action is configured.

#### Short Press / Long Press *(Keypad)*

Triggered by a normal button press or a press held for more than ~300 ms respectively.

#### Screen Tap / Rotation *(Encoder / dial only)*

- **Screen Tap** — fires when the touchscreen panel above the dial is tapped.
- **Rotation** — fires as the dial is turned. Additional variables are available in the service data JSON (see below).

### Configuring a Service Call

Each action shares the same layout:

1. **Domain** — choose the HA service domain (e.g. `light`, `media_player`).
2. **Service** — choose the service within that domain (e.g. `light.turn_on`).
3. **Entity** — optionally pick a target entity. If left blank the entity selected on the Appearance tab is used automatically.
4. **Service Data JSON** — optional JSON object passed with the service call.

#### Service Data JSON

Plain JSON example:

```json
{
  "brightness": 120,
  "rgb_color": [255, 0, 0]
}
```

If `entity_id` is not specified in the JSON, it is added automatically using the entity selected in the action or the Appearance tab. To target multiple entities at once, include it explicitly:

```json
{
  "entity_id": [
    "switch.kitchen_plug",
    "switch.living_room_plug"
  ]
}
```

When a service is selected, any **required fields** are auto-inserted into the JSON. You can also click the **+** button next to any optional field to insert it individually.

#### Jinja2 Templates in Service Data

You can use [Jinja2 templates](https://www.home-assistant.io/docs/configuration/templating/) to compute dynamic values server-side. Wrap Jinja2 expressions in `{% raw %}` / `{% endraw %}` tags so the plugin passes them through to HA instead of evaluating them as Nunjucks:

```json
{
  "temperature": "{% raw %}{{ state_attr('climate.office','temperature') + 0.5 }}{% endraw %}"
}
```

#### Rotation Variables *(Encoder only)*

The following Nunjucks variables are available inside the **Rotation** service data JSON:

| Variable | Description |
|---|---|
| `{{ticks}}` | Number of ticks rotated. Negative = left, positive = right. |
| `{{rotationPercent}}` | Rotation position as a percentage (0–100). |
| `{{rotationAbsolute}}` | Rotation position as an absolute value (0–255). |

Example — set a light's brightness from the dial position:

```json
{
  "brightness_pct": {{rotationPercent}}
}
```

**Tick multiplier** — scales each physical tick before it is added to the running total. Range: 0.1–10.

**Tick bucket size** — aggregates ticks for the specified duration (ms) before firing a single service call. Set to 0 to fire on every tick. Useful for avoiding too many rapid calls when spinning the dial quickly.

## Special Services

### `streamdeck.open_url`

A built-in plugin service (not a Home Assistant service) that opens a URL in the default browser or application when the action fires.

Configure it exactly like a HA service call: select domain **streamdeck**, service **open_url**, and provide the URL in the service data:

```json
{
  "url": "https://my-homeassistant.local/lovelace/0"
}
```

Any URL scheme registered with the OS works (e.g. `http://`, `https://`, custom app schemes).

## Display Themes & Customization

The visual appearance of every button (icon, color, label templates) is driven by a YAML configuration file. You can switch between built-in themes or supply your own.

### Built-in Themes

| Theme | Description |
|---|---|
| **Default (stable)** | The current release theme, updated with each plugin release. |
| **Default (preview)** | The development branch theme — may contain new domains/states before the next release. |

### Custom Theme

To use your own theme, paste a URL into the **Custom theme URL** field in Global Settings. The file must be accessible by the Stream Deck application (local `file://` paths or a web server both work).

The [default-display-config.yml](https://raw.githubusercontent.com/cgiesche/streamdeck-homeassistant/master/public/config/default-display-config.yml) is a good starting point. The config format supports:

- Per-domain default icon, color, and label templates
- Per-domain-class overrides (e.g. `binary_sensor` → `plug`)
- Per-state overrides (e.g. `light` → `on`)
- Nunjucks / Jinja2 templates in `color`, `icon`, and `labelTemplates` fields
- `feedback` + `feedbackLayout` for the Encoder touchscreen indicator bar

## Template Variables

All Nunjucks template fields (Custom Title, Custom Labels, and theme `labelTemplates`) have access to the following variables based on the selected entity's current state:

| Variable | Description |
|---|---|
| `{{state}}` | The main state string (e.g. `on`, `off`, `12.4`) |
| `{{unit_of_measurement}}` | Unit string for sensor entities (e.g. `°C`, `%`, `W`) |
| `{{friendly_name}}` | Human-readable entity name from HA |
| `{{<attribute>}}` | Any entity attribute (e.g. `{{brightness}}`, `{{media_title}}`) |

The full list of available variables for the currently selected entity is shown in the *Available variables* expander in the Appearance tab.

---

## Happy? Consider buying me a coffee :)

[![Donate via PayPal](https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif)](https://www.paypal.com/donate?hosted_button_id=3UKRJEJVWV9H4)
