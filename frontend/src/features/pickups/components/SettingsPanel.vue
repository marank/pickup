<script setup lang="ts">
import { Trash2Icon } from '@lucide/vue'
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import { apiErrorMessage } from '@/api/errors'
import type { JoinPolicy, Pickup, Visibility } from '@/api/types'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { endOfDay, formatFileSize, toDateInput } from '@/lib/format'
import { allValues } from '@/lib/enums'
import { formatDate, plural, t } from '@/lib/i18n'

import { usePickupAdmin } from '../composables/usePickupAdmin'
import SettingsCard from './SettingsCard.vue'

const props = defineProps<{ pickup: Pickup }>()
const router = useRouter()
const { updateSettings, deletePickup } = usePickupAdmin(() => props.pickup.id, false)
const confirmDelete = ref(false)

const form = reactive<{
  title: string
  visibility: Visibility
  join_policy: JoinPolicy
  email_privacy: boolean
  readOnly: string
  expires: string
}>({
  title: '',
  visibility: 'members',
  join_policy: 'open',
  email_privacy: false,
  readOnly: '',
  expires: '',
})
type Field = keyof typeof form
const today = toDateInput(new Date())
const longDate = (day: string) => formatDate(`${day}T12:00`, { dateStyle: 'long' })
const saved = (pickup: Pickup): typeof form => ({
  title: pickup.title ?? '',
  visibility: pickup.visibility,
  join_policy: pickup.join_policy,
  email_privacy: pickup.email_privacy,
  readOnly: pickup.read_only_at ? toDateInput(new Date(pickup.read_only_at)) : '',
  expires: pickup.expires_at ? toDateInput(new Date(pickup.expires_at)) : '',
})

/** Each card saves its own fields; the others keep what is typed into them. */
const cards = {
  general: ['title', 'readOnly', 'expires'],
  access: ['visibility', 'join_policy'],
  privacy: ['email_privacy'],
} satisfies Record<string, Field[]>
type Card = keyof typeof cards
const changed = (fields: Field[], against: typeof form) =>
  fields.some((field) => form[field] !== against[field])
const dirty = (card: Card) => changed(cards[card], saved(props.pickup))
function discard(card: Card) {
  const values = saved(props.pickup)
  for (const field of cards[card]) Object.assign(form, { [field]: values[field] })
}
// Start from what is saved; after a save (the pickup is refetched) refresh the cards that
// had no unsaved changes.
watch(
  () => props.pickup,
  (pickup, before) => {
    for (const card of Object.keys(cards) as Card[]) {
      if (!before || !changed(cards[card], saved(before))) discard(card)
    }
  },
  { immediate: true },
)

interface OptionTexts {
  label: () => string
  hint: () => string
}
const visibilityTexts: Record<Visibility, OptionTexts> = {
  members: {
    label: () => t('pickups.settingsPanel.onlyParticipants'),
    hint: () => t('pickups.settingsPanel.recommendedOthersWithTheLink'),
  },
  link: {
    label: () => t('common.anyoneWithTheLink'),
    hint: () => t('pickups.settingsPanel.everyoneWhoHasTheLink'),
  },
  creator: {
    label: () => t('pickups.settingsPanel.onlyMePaused'),
    hint: () => t('pickups.settingsPanel.onlyYouStillSeeThe'),
  },
}
const visibilityOptions = allValues<Visibility>({ members: true, link: true, creator: true }).map(
  (value) => ({ value, ...visibilityTexts[value] }),
)
const joinTexts: Record<JoinPolicy, OptionTexts> = {
  open: {
    label: () => t('common.anyoneWithTheLink'),
    hint: () => t('pickups.settingsPanel.peoplePickANewName'),
  },
  invite: {
    label: () => t('pickups.settingsPanel.onlyInvitedPeople'),
    hint: () => t('common.youInvitePeopleByEmail'),
  },
  closed: {
    label: () => t('pickups.settingsPanel.nobodyNew'),
    hint: () => t('pickups.settingsPanel.currentParticipantsStayNobodyNew'),
  },
}
const joinOptions = allValues<JoinPolicy>({ open: true, invite: true, closed: true }).map(
  (value) => ({ value, ...joinTexts[value] }),
)
/** Both answers in one plain sentence, following the form while it is edited. */
const accessSummary = computed(() => {
  if (form.visibility === 'creator') return t('pickups.settingsPanel.pausedOnlyYouSeeThe')
  const joinSummaries: Record<JoinPolicy, () => string> = {
    open: () => t('pickups.settingsPanel.anyoneWithTheShareLink2'),
    invite: () => t('pickups.settingsPanel.onlyPeopleYouInviteCan'),
    closed: () => t('pickups.settingsPanel.onlyTheCurrentParticipantsUpload'),
  }
  const join = joinSummaries[form.join_policy]()
  const see =
    form.visibility === 'link' && !props.pickup.has_password
      ? t('pickups.settingsPanel.anyoneWithTheShareLink')
      : t('pickups.settingsPanel.onlyParticipantsSeeThePhotos')
  return `${join} ${see}`
})
const turningPrivacyOn = computed(() => form.email_privacy && !props.pickup.email_privacy)

/** The password is never shown again: a new one replaces it, or it is removed. */
const newPassword = ref('')
const passwordSaving = ref(false)
async function savePassword(password: string) {
  passwordSaving.value = true
  try {
    await updateSettings.mutateAsync({ password })
    toast.success(
      password
        ? t('pickups.settingsPanel.passwordSaved')
        : t('pickups.settingsPanel.passwordRemoved'),
    )
    newPassword.value = ''
  } catch (err) {
    toast.error(apiErrorMessage(err, t('pickups.settingsPanel.couldNotSaveThePassword')))
  } finally {
    passwordSaving.value = false
  }
}

const saving = ref<Card | null>(null)
async function save(card: Card) {
  const values: Record<string, unknown> = {}
  for (const field of cards[card]) values[field] = form[field]
  if ('title' in values) values.title = form.title.trim()
  // Unchanged dates stay as they are (an old one may lie in the past by now).
  for (const [field, key] of [
    ['readOnly', 'read_only_at'],
    ['expires', 'expires_at'],
  ] as const) {
    if (!(field in values)) continue
    delete values[field]
    if (form[field] !== saved(props.pickup)[field])
      values[key] = form[field] ? endOfDay(form[field]) : null
  }
  saving.value = card
  try {
    await updateSettings.mutateAsync(values)
    toast.success(t('common.saved'))
  } catch (err) {
    toast.error(apiErrorMessage(err, t('pickups.settingsPanel.couldNotSaveTheSettings')))
  } finally {
    saving.value = null
  }
}

const storage = computed(() => {
  const { used, limit } = props.pickup.storage
  return {
    text:
      limit === null
        ? t('pickups.settingsPanel.sizeUsed', { size: formatFileSize(used) })
        : t('pickups.settingsPanel.usedOfLimitUsed', {
            used: formatFileSize(used),
            limit: formatFileSize(limit),
          }),
    percent: limit ? Math.min(100, Math.round((used / limit) * 100)) : null,
  }
})

const deleteDescription = computed(() =>
  t('pickups.settingsPanel.foldersAndFilesAreDeleted', {
    folders: plural(props.pickup.folder_count, 'common.nFolders'),
    files: plural(props.pickup.media_count, 'common.nFiles'),
  }),
)

async function removePickup() {
  const title = props.pickup.title || t('pickups.settingsPanel.thePickup')
  try {
    await deletePickup.mutateAsync()
    toast.success(t('pickups.settingsPanel.titleWasDeleted', { title }))
    await router.push({ name: 'home' })
  } catch (err) {
    toast.error(apiErrorMessage(err, t('pickups.settingsPanel.couldNotDeleteThePickup')))
  }
}
</script>

<template>
  <div class="@container max-w-4xl space-y-6">
    <div>
      <h2 class="font-heading text-xl font-semibold">{{ t('common.settings') }}</h2>
      <p class="text-sm text-muted-foreground">
        {{ t('pickups.settingsPanel.onlyYouAsTheCreator') }}
      </p>
    </div>

    <SettingsCard
      :title="t('pickups.settingsPanel.general')"
      :description="t('pickups.settingsPanel.theNameEveryoneSeesAnd')"
      saveable
      :dirty="dirty('general')"
      :pending="saving === 'general'"
      @save="save('general')"
      @discard="discard('general')"
    >
      <div class="space-y-1.5">
        <Label for="settings-title">{{ t('common.nameOfThePickup') }}</Label>
        <Input
          id="settings-title"
          v-model="form.title"
          maxlength="200"
          :placeholder="t('common.untitledPickup')"
        />
      </div>
      <div class="space-y-1.5">
        <Label for="settings-read-only">{{ t('common.readOnly') }}</Label>
        <div class="flex gap-2">
          <Input
            id="settings-read-only"
            v-model="form.readOnly"
            type="date"
            :min="today"
            :max="form.expires || undefined"
            class="w-48"
            aria-describedby="settings-read-only-hint"
          />
          <Button v-if="form.readOnly" type="button" variant="ghost" @click="form.readOnly = ''">
            {{ t('pickups.settingsPanel.never') }}
          </Button>
        </div>
        <p id="settings-read-only-hint" class="text-sm text-muted-foreground">
          {{
            form.readOnly
              ? t('pickups.settingsPanel.afterDateNobodyJoinsUploads', {
                  date: longDate(form.readOnly),
                })
              : t('pickups.settingsPanel.neverPeopleCanAddPhotos')
          }}
        </p>
      </div>
      <div class="space-y-1.5">
        <Label for="settings-expires">{{ t('pickups.settingsPanel.deleteAutomatically') }}</Label>
        <div class="flex gap-2">
          <Input
            id="settings-expires"
            v-model="form.expires"
            type="date"
            :min="form.readOnly || today"
            class="w-48"
            aria-describedby="settings-expires-hint"
          />
          <Button v-if="form.expires" type="button" variant="ghost" @click="form.expires = ''">
            {{ t('pickups.settingsPanel.never') }}
          </Button>
        </div>
        <p id="settings-expires-hint" class="text-sm text-muted-foreground">
          {{
            form.expires
              ? t('pickups.settingsPanel.atTheEndOfDate', { date: longDate(form.expires) })
              : t('pickups.settingsPanel.neverThePickupStaysUntil')
          }}
        </p>
      </div>
    </SettingsCard>

    <SettingsCard
      :title="t('pickups.settingsPanel.access')"
      :description="t('pickups.settingsPanel.whoSeesThePhotosAnd')"
      saveable
      :dirty="dirty('access')"
      :pending="saving === 'access'"
      @save="save('access')"
      @discard="discard('access')"
    >
      <p class="rounded-lg bg-muted/60 px-3 py-2 text-sm" data-testid="access-summary">
        <span class="font-medium">{{ t('pickups.settingsPanel.inShort') }}</span>
        {{ accessSummary }}
      </p>
      <fieldset
        v-for="group in [
          {
            legend: t('common.whoCanSeeThePhotos'),
            name: 'visibility',
            options: visibilityOptions,
          },
          {
            legend: t('pickups.settingsPanel.whoCanJoinAndUpload'),
            name: 'join_policy',
            options: joinOptions,
          },
        ] as const"
        :key="group.name"
      >
        <legend class="mb-2 text-sm font-medium">{{ group.legend }}</legend>
        <div class="divide-y overflow-hidden rounded-lg border">
          <label
            v-for="option in group.options"
            :key="option.value"
            class="flex cursor-pointer gap-3 px-3 py-2.5 has-checked:bg-tomato/5"
          >
            <input
              v-model="form[group.name]"
              type="radio"
              :name="group.name"
              :value="option.value"
              class="mt-1 accent-tomato"
            />
            <span>
              <span class="block text-sm font-medium">{{ option.label() }}</span>
              <span class="block text-xs text-muted-foreground">
                {{ option.hint() }}
                <template v-if="option.value === 'link' && pickup.has_password">
                  {{ t('pickups.settingsPanel.withAPasswordOnlyParticipants') }}
                </template>
              </span>
            </span>
          </label>
        </div>
      </fieldset>
    </SettingsCard>

    <SettingsCard
      :title="t('pickups.settingsPanel.password')"
      :description="t('pickups.settingsPanel.peopleWithoutALoginNeed')"
      saveable
      :dirty="newPassword !== ''"
      :pending="passwordSaving"
      @save="savePassword(newPassword)"
      @discard="newPassword = ''"
    >
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="text-sm">
          {{
            pickup.has_password
              ? t('pickups.settingsPanel.thisPickupIsProtectedWith')
              : t('pickups.settingsPanel.noPasswordSet')
          }}
        </p>
        <Button
          v-if="pickup.has_password"
          type="button"
          variant="ghost"
          size="sm"
          class="text-destructive hover:text-destructive"
          :disabled="passwordSaving"
          @click="savePassword('')"
        >
          {{ t('pickups.settingsPanel.removePassword') }}
        </Button>
      </div>
      <div class="space-y-1.5">
        <Label for="settings-password">{{
          pickup.has_password
            ? t('pickups.settingsPanel.newPassword')
            : t('pickups.settingsPanel.password')
        }}</Label>
        <Input
          id="settings-password"
          v-model="newPassword"
          type="password"
          minlength="4"
          autocomplete="new-password"
        />
        <p v-if="newPassword" class="text-sm text-destructive">
          {{ t('pickups.settingsPanel.savingLogsEveryoneElseOut') }}
        </p>
      </div>
    </SettingsCard>

    <SettingsCard
      :title="t('pickups.settingsPanel.privacy')"
      :description="t('pickups.settingsPanel.howEmailAddressesOfParticipants')"
      saveable
      :dirty="dirty('privacy')"
      :pending="saving === 'privacy'"
      @save="save('privacy')"
      @discard="discard('privacy')"
    >
      <label class="flex cursor-pointer gap-3">
        <input v-model="form.email_privacy" type="checkbox" class="mt-1 accent-tomato" />
        <span>
          <span class="block text-sm font-medium">{{
            t('pickups.settingsPanel.privacyModeForEmailAddresses')
          }}</span>
          <span class="block text-sm text-muted-foreground">
            {{ t('pickups.settingsPanel.emailAddressesAreStoredOnly') }}
          </span>
          <span v-if="turningPrivacyOn" class="mt-1 block text-sm text-destructive">
            {{ t('pickups.settingsPanel.savingDeletesAllStoredAddresses') }}
          </span>
        </span>
      </label>
    </SettingsCard>

    <SettingsCard
      :title="t('pickups.settingsPanel.storage')"
      :description="t('pickups.settingsPanel.theServerOperatorSetsThese')"
    >
      <div
        v-if="storage.percent !== null"
        class="h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        :aria-valuenow="storage.percent"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-label="t('pickups.settingsPanel.storageUsed')"
      >
        <div
          class="h-full rounded-full"
          :class="storage.percent >= 90 ? 'bg-destructive' : 'bg-sage'"
          :style="{ width: `${storage.percent}%` }"
        />
      </div>
      <p class="text-sm">{{ storage.text }}</p>
    </SettingsCard>

    <SettingsCard
      :title="t('pickups.settingsPanel.deleteThisPickup')"
      :description="t('pickups.settingsPanel.removesThePickupWithEvery')"
      danger
    >
      <div>
        <Button
          variant="destructive"
          :disabled="deletePickup.isPending.value"
          @click="confirmDelete = true"
        >
          <Trash2Icon />
          {{ t('pickups.settingsPanel.deletePickup') }}
        </Button>
      </div>
    </SettingsCard>
  </div>

  <ConfirmDialog
    v-model:open="confirmDelete"
    :title="
      t('pickups.settingsPanel.deleteTitleForGood', {
        title: pickup.title || t('common.untitledPickup'),
      })
    "
    :description="deleteDescription"
    :confirm-label="t('pickups.settingsPanel.deleteForGood')"
    @confirm="removePickup"
  />
</template>
