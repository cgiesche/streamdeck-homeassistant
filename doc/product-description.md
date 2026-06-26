# Home Assistant — Product Description

> Written to the [Elgato product description guidelines](https://docs.elgato.com/guidelines/products/#description).
> Plain-text opening (~250 chars), bullet feature list, under the 1,500-character total limit.

---

Control and monitor your Home Assistant smart home directly from your Stream Deck. Buttons show live entity state with dynamic icons, colors, and labels, and trigger any HA service on press, long press, screen tap, or dial rotation. Works with Keypad and Encoder.

**Key features:**

- Real-time state display — icons and colors update instantly as entities change
- Generic entity support — any HA entity works out of the box, with sensible icon fallbacks
- Keypad and Encoder (dial) support — separate actions for short press, long press, tap, and rotation
- Nunjucks templates for dynamic button titles and labels
- Jinja2 templates in service data for calling HA scripts with live values
- Customizable YAML display themes — change icons, colors, and labels globally
- Icon source control — use plugin icons, HA entity icons, or hide them

**Requirements:**

- A running Home Assistant instance reachable over WebSocket (`http://` local or `https://` remote)
- A Long-Lived Access Token with admin rights (the plugin uses the `execute_script` command)

**Setup tip:** Add a button, open its Property Inspector, and fill in the Global Settings (Server URL, Access Token, Display Theme). The plugin then connects and populates your entity and service lists automatically.
