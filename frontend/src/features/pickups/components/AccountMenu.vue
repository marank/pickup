<script setup lang="ts">
import {
  ChevronDownIcon,
  CircleHelpIcon,
  KeyRoundIcon,
  CrownIcon,
  LogOutIcon,
  MailIcon,
  SettingsIcon,
  UserPenIcon,
  UserPlusIcon,
  UsersIcon,
} from '@lucide/vue'
import { useQueryClient } from '@tanstack/vue-query'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import { apiErrorMessage } from '@/api/errors'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import LanguageOptions from '@/components/LanguageOptions.vue'
import ThemeOptions from '@/components/ThemeOptions.vue'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { copyText } from '@/lib/clipboard'
import { t } from '@/lib/i18n'
import { ownerColor } from '@/lib/ownerColor'
import { useTheme } from '@/lib/theme'

import {
  personalLinkQuery,
  useLeavePickup,
  usePickup,
  usePickupFolders,
} from '../composables/usePickup'
import EmailLinkDialog from './EmailLinkDialog.vue'
import IntroDialog from './IntroDialog.vue'
import MemberDetailsDialog from './MemberDetailsDialog.vue'

const props = defineProps<{ pickupId: string }>()

const router = useRouter()
const theme = useTheme()
const pickup = usePickup(() => props.pickupId)
const folders = usePickupFolders(
  () => props.pickupId,
  () => pickup.data.value?.can_view ?? false,
)
const leave = useLeavePickup(() => props.pickupId)
const detailsOpen = ref(false)
const confirmOpen = ref(false)
const emailOpen = ref(false)
const introOpen = ref(false)
// Newcomers get the intro once, right after joining; the creator only from the menu.
let introShown = false
watch(
  () => pickup.data.value,
  (data) => {
    if (introShown || !data?.has_folder || data.is_creator || data.intro_seen) return
    introShown = true
    introOpen.value = true
  },
  { immediate: true },
)
const openPage = (page: 'settings' | 'people') =>
  router.push({ name: 'explorer-page', params: { pickupId: props.pickupId, page } })

const ownFolder = computed(() =>
  folders.data.value?.find((folder) => folder.is_own && folder.parent === null),
)
const isCreator = computed(() => pickup.data.value?.is_creator ?? false)
/** This browser is signed in as a member (with a folder, or as the creator). */
const signedIn = computed(() => pickup.data.value?.is_member ?? false)
const name = computed(() =>
  signedIn.value
    ? pickup.data.value?.member_name || t('common.you')
    : t('pickups.accountMenu.guest'),
)
const color = computed(() => (ownFolder.value ? ownerColor(name.value) : 'var(--muted-foreground)'))

const leaveDescription = computed(() =>
  isCreator.value
    ? t('pickups.accountMenu.youWillBeLoggedOut2')
    : t('pickups.accountMenu.youWillBeLoggedOut'),
)

const client = useQueryClient()

async function copyPersonalLink() {
  try {
    await copyText(
      client
        .fetchQuery(personalLinkQuery(props.pickupId))
        .then(({ member_url }) => `${window.location.origin}${member_url}`),
    )
    toast.success(t('pickups.accountMenu.personalLinkCopied'))
  } catch (err) {
    toast.error(apiErrorMessage(err, t('pickups.accountMenu.couldNotCopyYourLink')))
  }
}

async function confirmLeave() {
  try {
    await leave.mutateAsync()
    toast.success(t('pickups.accountMenu.youAreLoggedOut'))
    await router.push({ name: 'home' })
  } catch (err) {
    toast.error(apiErrorMessage(err, t('pickups.accountMenu.couldNotLogOut')))
  }
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger
      class="flex h-9 items-center gap-2 rounded-full border bg-card py-1 pr-2 pl-1 text-sm shadow-xs hover:bg-muted"
      :aria-label="t('pickups.accountMenu.account')"
    >
      <span
        class="flex size-7 items-center justify-center rounded-full text-xs font-semibold text-paper"
        :style="{ background: color }"
      >
        <CrownIcon v-if="!ownFolder && isCreator" class="size-3.5" />
        <template v-else>{{ name.slice(0, 1).toUpperCase() }}</template>
      </span>
      <span class="max-w-32 truncate max-sm:hidden">{{ name }}</span>
      <ChevronDownIcon class="size-3.5 text-muted-foreground" />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="min-w-60">
      <DropdownMenuLabel class="font-normal">
        <p class="font-medium">{{ signedIn ? name : t('pickups.accountMenu.viewingAsAGuest') }}</p>
        <p class="text-xs text-muted-foreground">
          <template v-if="isCreator">{{ t('pickups.accountMenu.creatorOfThisPickup') }}</template>
          <template v-else-if="ownFolder">{{
            t('pickups.accountMenu.memberOfThisPickup')
          }}</template>
          <template v-else>{{ t('pickups.accountMenu.joinToAddYourOwn') }}</template>
        </p>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        v-if="
          !ownFolder &&
          !pickup.data.value?.is_read_only &&
          (signedIn || pickup.data.value?.join_policy === 'open')
        "
        @select="router.push({ name: 'pickup-join', params: { pickupId } })"
      >
        <UserPlusIcon />
        {{
          signedIn
            ? t('pickups.accountMenu.createMyFolder')
            : t('pickups.accountMenu.joinThisPickup')
        }}
      </DropdownMenuItem>
      <DropdownMenuItem v-if="signedIn" @select="detailsOpen = true">
        <UserPenIcon />
        {{ t('pickups.accountMenu.editMyDetails') }}
      </DropdownMenuItem>
      <DropdownMenuItem v-if="signedIn" @select="copyPersonalLink">
        <KeyRoundIcon />
        {{ t('pickups.accountMenu.copyMyPersonalLink') }}
      </DropdownMenuItem>
      <DropdownMenuItem v-if="signedIn" @select="emailOpen = true">
        <MailIcon />
        {{ t('common.emailMeMyPersonalLink') }}
      </DropdownMenuItem>
      <DropdownMenuItem v-if="signedIn" @select="introOpen = true">
        <CircleHelpIcon />
        {{ t('pickups.accountMenu.howPickupWorks') }}
      </DropdownMenuItem>
      <template v-if="isCreator">
        <DropdownMenuSeparator />
        <DropdownMenuItem @select="openPage('people')">
          <UsersIcon />
          {{ t('pickups.accountMenu.peopleInvitations') }}
        </DropdownMenuItem>
        <DropdownMenuItem @select="openPage('settings')">
          <SettingsIcon />
          {{ t('pickups.accountMenu.pickupSettings') }}
        </DropdownMenuItem>
      </template>
      <DropdownMenuSeparator />
      <DropdownMenuLabel class="text-xs text-muted-foreground">{{
        t('common.appearance')
      }}</DropdownMenuLabel>
      <DropdownMenuRadioGroup v-model="theme">
        <ThemeOptions />
      </DropdownMenuRadioGroup>
      <DropdownMenuSeparator />
      <LanguageOptions />
      <template v-if="signedIn">
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" @select="confirmOpen = true">
          <LogOutIcon />
          {{ t('pickups.accountMenu.logOut') }}
        </DropdownMenuItem>
      </template>
    </DropdownMenuContent>
  </DropdownMenu>

  <EmailLinkDialog v-if="pickup.data.value" v-model:open="emailOpen" :pickup="pickup.data.value" />

  <IntroDialog
    v-if="pickup.data.value && signedIn"
    v-model:open="introOpen"
    :pickup="pickup.data.value"
  />

  <MemberDetailsDialog
    v-if="pickup.data.value && signedIn"
    v-model:open="detailsOpen"
    :pickup="pickup.data.value"
    :folder-name="ownFolder?.name ?? null"
  />

  <ConfirmDialog
    v-model:open="confirmOpen"
    :title="t('pickups.accountMenu.logOutOnThisDevice')"
    :description="leaveDescription"
    :confirm-label="t('pickups.accountMenu.logOut')"
    @confirm="confirmLeave"
  />
</template>
