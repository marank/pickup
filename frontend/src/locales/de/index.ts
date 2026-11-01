import type { Messages } from '@/lib/i18n'

import app from './app'
import common from './common'
import explorer from './explorer'
import home from './home'
import pickups from './pickups'

/** German: the same keys as English (`Messages` makes TypeScript check that), loaded when needed. */
const de: Messages = { common, app, home, pickups, explorer }

export default de
