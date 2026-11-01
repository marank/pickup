import app from './app'
import common from './common'
import explorer from './explorer'
import home from './home'
import pickups from './pickups'

/**
 * English, the app's own language: always loaded, and what a missing text falls back to.
 * `common` holds texts used in several places, the rest is grouped by area and component.
 */
const en = { common, app, home, pickups, explorer } as const

export default en
