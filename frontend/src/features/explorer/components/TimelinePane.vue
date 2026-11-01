<script setup lang="ts">
import { FolderOpenIcon, ImagesIcon, PlayIcon } from '@lucide/vue'
import { computed, ref } from 'vue'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatDateRange, formatTime, plural, t } from '@/lib/i18n'
import { ownerColor } from '@/lib/ownerColor'

import { useExplorer } from '../composables/useExplorer'
import { useTimelineMedia } from '../composables/useExplorerData'
import { fileItem, type ExplorerItem } from '../lib/items'
import { takenAt, timelineDays, timelinePeople, type Day } from '../lib/timeline'
import ItemThumb from './ItemThumb.vue'

type FileItem = Extract<ExplorerItem, { kind: 'file' }>

/**
 * Everyone's photos and videos in the order they were taken, across all folders: days with
 * sticky headings, "moments" within a day, a filter per person and, on large screens, a rail
 * of days to jump around. A tap opens the viewer, which then pages through this list.
 */
const explorer = useExplorer()
const query = useTimelineMedia(
  () => explorer.pickupId,
  () => explorer.canView,
)

const all = computed(() => (query.data.value ?? []).map((media) => fileItem(media) as FileItem))
const people = computed(() => timelinePeople(all.value))
const chosen = ref(new Set<string>())
const shown = computed(() =>
  chosen.value.size ? all.value.filter((item) => chosen.value.has(item.owner)) : all.value,
)
const days = computed(() => timelineDays(shown.value))

function toggle(name: string) {
  const next = new Set(chosen.value)
  if (next.has(name)) next.delete(name)
  else next.add(name)
  chosen.value = next
}

const sameYear = (date: Date) => date.getFullYear() === new Date().getFullYear()
const summary = computed(() => {
  const list = shown.value
  if (!list.length) return ''
  const first = takenAt(list[0]!)
  const last = takenAt(list.at(-1)!)
  const long = { day: 'numeric', month: 'long', year: 'numeric' } as const
  const when =
    first.toDateString() === last.toDateString()
      ? formatDate(first, long)
      : formatDateRange(first, last, long)
  const owners = new Set(list.map((item) => item.owner)).size
  return [
    plural(list.length, '1 photo or video', '{n} photos and videos'),
    plural(owners, 'by 1 person', 'by {n} people'),
    when,
  ].join(' · ')
})

const dayTitle = (day: Day) =>
  formatDate(day.date, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...(sameYear(day.date) ? {} : { year: 'numeric' }),
  })
const railLabel = (day: Day) =>
  formatDate(day.date, { weekday: 'short', day: 'numeric', month: 'numeric' })
/** From this many photos a moment opens with a large one (fewer would leave gaps). */
const HERO_FROM = 5
const initial = (name: string) => (name || '?').slice(0, 1).toUpperCase()

function open(item: FileItem) {
  explorer.openInViewer(item, () => shown.value)
}

// The day at the top of the pane, highlighted in the rail.
const scroller = ref<HTMLElement | null>(null)
const active = ref<string | null>(null)
let frame = 0
function onScroll() {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(() => {
    const top = scroller.value?.getBoundingClientRect().top ?? 0
    const sections = scroller.value?.querySelectorAll<HTMLElement>('[data-day]') ?? []
    let current: string | null = null
    for (const section of sections) {
      if (section.getBoundingClientRect().top - top > 80) break
      current = section.dataset.day ?? null
    }
    active.value = current
  })
}
function jump(key: string) {
  scroller.value
    ?.querySelector(`[data-day="${key}"]`)
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const ownFolder = computed(() => explorer.ownFolder)
</script>

<template>
  <main
    ref="scroller"
    class="min-w-0 flex-1 overflow-y-auto select-text"
    data-testid="timeline"
    @scroll.passive="onScroll"
  >
    <div class="mx-auto flex max-w-6xl gap-8 px-3 pb-12 sm:px-6">
      <div class="min-w-0 flex-1">
        <header class="pt-4 pb-2 sm:pt-6">
          <h2 class="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
            {{ t('Timeline') }}
          </h2>
          <p v-if="summary" class="mt-0.5 text-sm text-muted-foreground">{{ summary }}</p>
          <div
            v-if="people.length > 1"
            class="-mx-3 mt-3 flex gap-1.5 overflow-x-auto px-3 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
            role="group"
            :aria-label="t('Show photos of')"
          >
            <button
              v-for="person in people"
              :key="person.name"
              type="button"
              class="flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors pointer-coarse:py-1.5"
              :class="
                chosen.has(person.name)
                  ? 'border-transparent bg-foreground text-background'
                  : 'bg-card hover:bg-muted'
              "
              :aria-pressed="chosen.has(person.name)"
              @click="toggle(person.name)"
            >
              <span
                class="size-2.5 rounded-full"
                :style="{ background: ownerColor(person.name) }"
                aria-hidden="true"
              />
              {{ person.name }}
              <span class="tabular-nums opacity-60">{{ person.count }}</span>
            </button>
            <button
              v-if="chosen.size"
              type="button"
              class="shrink-0 rounded-full px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
              @click="chosen = new Set()"
            >
              {{ t('Show everyone') }}
            </button>
          </div>
        </header>

        <div
          v-if="query.isPending.value"
          class="mt-6 grid grid-cols-3 gap-1 sm:grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] sm:gap-1.5"
        >
          <Skeleton v-for="n in 12" :key="n" class="aspect-square rounded-lg" />
        </div>

        <div
          v-else-if="!all.length"
          class="mx-auto flex max-w-sm flex-col items-center gap-3 py-16 text-center"
        >
          <ImagesIcon class="size-12 text-tomato" />
          <p class="text-lg font-semibold">{{ t('No photos yet') }}</p>
          <p class="text-sm text-muted-foreground">
            {{
              t(
                'As soon as someone uploads, everything shows up here in the order it was taken, from all folders.',
              )
            }}
          </p>
          <Button
            v-if="ownFolder && !explorer.pickup.data?.is_read_only"
            @click="explorer.navigate(ownFolder.id)"
          >
            <FolderOpenIcon />
            {{ t('Go to my folder') }}
          </Button>
        </div>

        <template v-else>
          <section
            v-for="day in days"
            :key="day.key"
            :data-day="day.key"
            class="[contain-intrinsic-size:auto_32rem] [content-visibility:auto]"
          >
            <h3
              class="sticky top-0 z-10 -mx-3 flex items-center gap-2 bg-card/90 px-3 py-2.5 backdrop-blur sm:-mx-6 sm:px-6"
            >
              <span class="font-heading text-base font-semibold sm:text-lg">{{
                dayTitle(day)
              }}</span>
              <span class="text-xs whitespace-nowrap text-muted-foreground">
                {{ plural(day.count, '1 photo or video', '{n} photos and videos') }}
              </span>
              <span class="ml-auto flex -space-x-1.5" aria-hidden="true">
                <span
                  v-for="name in day.people.slice(0, 5)"
                  :key="name"
                  class="flex size-5 items-center justify-center rounded-full text-[10px] font-semibold text-paper ring-2 ring-card"
                  :style="{ background: ownerColor(name) }"
                  :title="name"
                >
                  {{ initial(name) }}
                </span>
              </span>
            </h3>
            <div v-for="moment in day.moments" :key="moment.start.getTime()" class="mb-5">
              <p class="mb-1.5 text-xs font-medium text-muted-foreground tabular-nums">
                {{ formatTime(moment.start) }}
              </p>
              <ul
                class="grid grid-flow-dense grid-cols-3 gap-1 sm:grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] sm:gap-1.5"
              >
                <!-- A moment with a few photos opens with a large one, like a magazine page. -->
                <li
                  v-for="(item, index) in moment.items"
                  :key="item.id"
                  :class="
                    index === 0 && moment.items.length >= HERO_FROM && 'col-span-2 row-span-2'
                  "
                >
                  <button
                    type="button"
                    class="group relative block aspect-square size-full overflow-hidden rounded-md bg-muted outline-none focus-visible:ring-2 focus-visible:ring-tomato focus-visible:ring-offset-2 focus-visible:ring-offset-card sm:rounded-lg"
                    :aria-label="
                      t('{name}, by {owner}, {time}', {
                        name: item.name,
                        owner: item.owner,
                        time: formatTime(takenAt(item)),
                      })
                    "
                    @click="open(item)"
                  >
                    <ItemThumb
                      :item="item"
                      class="transition-transform duration-300 group-hover:scale-[1.04]"
                    />
                    <span
                      v-if="item.media.is_video"
                      class="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-black/55 text-white"
                    >
                      <PlayIcon class="size-3 fill-current" />
                    </span>
                    <span
                      class="absolute bottom-1.5 left-1.5 flex size-5 items-center justify-center rounded-full text-[10px] font-semibold text-paper ring-2 ring-card"
                      :style="{ background: ownerColor(item.owner) }"
                    >
                      {{ initial(item.owner) }}
                    </span>
                  </button>
                </li>
              </ul>
            </div>
          </section>
        </template>
      </div>

      <!-- pl-2: the dots stick out left of the line; the scrolling rail would cut them off. -->
      <nav
        v-if="days.length > 1"
        class="sticky top-0 hidden max-h-[80vh] w-36 shrink-0 self-start overflow-y-auto pt-24 pl-2 lg:block"
        :aria-label="t('Days')"
      >
        <ol class="space-y-0.5 border-l pl-3 text-xs">
          <li v-for="day in days" :key="day.key">
            <button
              type="button"
              class="relative block w-full py-1 text-left whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground"
              :class="(active ?? days[0]!.key) === day.key && 'font-semibold text-foreground'"
              :aria-current="(active ?? days[0]!.key) === day.key ? 'true' : undefined"
              @click="jump(day.key)"
            >
              <span
                class="absolute top-1/2 -left-[17px] size-2 -translate-y-1/2 rounded-full ring-2 ring-card"
                :class="
                  (active ?? days[0]!.key) === day.key ? 'bg-tomato' : 'bg-muted-foreground/40'
                "
              />
              {{ railLabel(day) }}
              <span class="ml-1 tabular-nums opacity-60">{{ day.count }}</span>
            </button>
          </li>
        </ol>
      </nav>
    </div>
  </main>
</template>
