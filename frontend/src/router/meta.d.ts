import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    /** Full-width page (explorer, start page) instead of the centred column. */
    wide?: boolean
    /** Without the header (the personal-link page, which shows the logo itself). */
    bare?: boolean
  }
}
