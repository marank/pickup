<script setup lang="ts">
import {
  ChevronDownIcon,
  CopyIcon,
  CrownIcon,
  LogOutIcon,
  MailIcon,
  SettingsIcon,
  UserPenIcon,
  UserPlusIcon,
  UsersIcon,
} from '@lucide/vue'
import { useQueryClient } from '@tanstack/vue-query'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import { apiErrorMessage } from '@/api/errors'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
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
import { ownerColor } from '@/lib/ownerColor'
import { useTheme } from '@/lib/theme'

import {
  personalLinkQuery,
  useLeavePickup,
  usePickup,
  usePickupFolders,
} from '../composables/usePickup'
import EmailLinkDialog from './EmailLinkDialog.vue'
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
const openPage = (page: 'settings' | 'people') =>
  router.push({ name: 'explorer-page', params: { pickupId: props.pickupId, page } })

const ownFolder = computed(() =>
  folders.data.value?.find((folder) => folder.can_edit && folder.parent === null),
)
const isCreator = computed(() => pickup.data.value?.is_creator ?? false)
/** This browser is signed in as a member (with a folder, or as the creator). */
const signedIn = computed(() => pickup.data.value?.is_member ?? false)
const name = computed(() => (signedIn.value ? pickup.data.value?.member_name || 'You' : 'Guest'))
const color = computed(() => (ownFolder.value ? ownerColor(name.value) : 'var(--muted-foreground)'))

const leaveDescription = computed(() =>
  isCreator.value
    ? 'You will be logged out on this device. To log in again as the creator, open your personal link. The pickup is not changed.'
    : 'You will be logged out on this device. To log in again, open your personal link (from when you joined, or from your email). Your folder and files are kept.',
)

const client = useQueryClient()

async function copyPersonalLink() {
  try {
    await copyText(
      client
        .fetchQuery(personalLinkQuery(props.pickupId))
        .then(({ member_url }) => `${window.location.origin}${member_url}`),
    )
    toast.success('Personal link copied')
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Could not copy your link'))
  }
}

async function confirmLeave() {
  try {
    await leave.mutateAsync()
    toast.success('You are logged out')
    await router.push({ name: 'home' })
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Could not log out'))
  }
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger
      class="flex h-9 items-center gap-2 rounded-full border bg-card py-1 pr-2 pl-1 text-sm shadow-xs hover:bg-muted"
      aria-label="Account"
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
        <p class="font-medium">{{ signedIn ? name : 'Viewing as a guest' }}</p>
        <p class="text-xs text-muted-foreground">
          <template v-if="isCreator">Creator of this pickup</template>
          <template v-else-if="ownFolder">Member of this pickup</template>
          <template v-else>Join to add your own photos</template>
        </p>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        v-if="!ownFolder && (signedIn || pickup.data.value?.join_policy === 'open')"
        @select="router.push({ name: 'pickup-join', params: { pickupId } })"
      >
        <UserPlusIcon />
        {{ signedIn ? 'Create my folder' : 'Join this pickup' }}
      </DropdownMenuItem>
      <DropdownMenuItem v-if="signedIn" @select="detailsOpen = true">
        <UserPenIcon />
        Edit my details
      </DropdownMenuItem>
      <DropdownMenuItem v-if="signedIn" @select="copyPersonalLink">
        <CopyIcon />
        Copy my personal link
      </DropdownMenuItem>
      <DropdownMenuItem v-if="signedIn" @select="emailOpen = true">
        <MailIcon />
        Email me my personal link
      </DropdownMenuItem>
      <template v-if="isCreator">
        <DropdownMenuSeparator />
        <DropdownMenuItem @select="openPage('people')">
          <UsersIcon />
          People &amp; invitations
        </DropdownMenuItem>
        <DropdownMenuItem @select="openPage('settings')">
          <SettingsIcon />
          Pickup settings
        </DropdownMenuItem>
      </template>
      <DropdownMenuSeparator />
      <DropdownMenuLabel class="text-xs text-muted-foreground">Appearance</DropdownMenuLabel>
      <DropdownMenuRadioGroup v-model="theme">
        <ThemeOptions />
      </DropdownMenuRadioGroup>
      <template v-if="signedIn">
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" @select="confirmOpen = true">
          <LogOutIcon />
          Log out
        </DropdownMenuItem>
      </template>
    </DropdownMenuContent>
  </DropdownMenu>

  <EmailLinkDialog v-if="pickup.data.value" v-model:open="emailOpen" :pickup="pickup.data.value" />

  <MemberDetailsDialog
    v-if="pickup.data.value && signedIn"
    v-model:open="detailsOpen"
    :pickup="pickup.data.value"
    :folder-name="ownFolder?.name ?? null"
  />

  <ConfirmDialog
    v-model:open="confirmOpen"
    title="Log out on this device?"
    :description="leaveDescription"
    confirm-label="Log out"
    @confirm="confirmLeave"
  />
</template>
