import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    /** Full-width page (explorer, start page) instead of the centred column. */
    wide?: boolean
  }
}
