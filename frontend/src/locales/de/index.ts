import type { Messages } from '@/lib/i18n'

import common from './common'
import explorer from './explorer'
import explorerLogic from './explorerLogic'
import home from './home'
import pickups from './pickups'

/** German, keyed by the English text; one file per area of the app. */
const de: Messages = { ...common, ...home, ...pickups, ...explorer, ...explorerLogic }

export default de
