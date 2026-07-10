import nunjucks from 'nunjucks'

// Shared Nunjucks environment with HTML autoescaping disabled.
//
// The default Nunjucks environment autoescapes for HTML, turning characters
// like ' into &#39;. Our output targets are SVG text (escaped separately via
// SvgUtils#escapeXml) and service-data JSON, neither of which wants HTML entity
// escaping. Leaving autoescape on caused values such as "Nikki's Work" to be
// double-escaped and render as literal "Nikki&#39;s Work" (issue #413).
const env = new nunjucks.Environment(null, { autoescape: false })

export default env
