<script setup lang="ts">
import {
  ChevronDownIcon,
  CrownIcon,
  FolderIcon,
  LogOutIcon,
  MailIcon,
  SettingsIcon,
  UserPlusIcon,
  UsersIcon,
} from '@lucide/vue'
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
import { ownerColor } from '@/lib/ownerColor'
import { useTheme } from '@/lib/theme'

import { useLeavePickup, usePickup, usePickupFolders } from '../composables/usePickup'
import EmailLinkDialog from './EmailLinkDialog.vue'

const props = defineProps<{ pickupId: string }>()

const router = useRouter()
const theme = useTheme()
const pickup = usePickup(() => props.pickupId)
const folders = usePickupFolders(
  () => props.pickupId,
  () => pickup.data.value?.can_view ?? false,
)
const leave = useLeavePickup(() => props.pickupId)
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
    ? 'This device stops being the creator. To come back as the creator you need your creator link. The pickup itself stays as it is.'
    : 'This device stops being you. To come back you need your personal link (from when you joined, or your email). Your folder and files stay.',
)

function openOwnFolder() {
  if (ownFolder.value) {
    void router.push({
      name: 'explorer-folder',
      params: { pickupId: props.pickupId, folderId: ownFolder.value.id },
    })
  }
}

async function confirmLeave() {
  try {
    await leave.mutateAsync()
    toast.success('You left the pickup on this device')
    await router.push({ name: 'explorer', params: { pickupId: props.pickupId } })
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Could not leave the pickup'))
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
      <DropdownMenuItem v-if="ownFolder" @select="openOwnFolder">
        <FolderIcon />
        Go to my folder
      </DropdownMenuItem>
      <DropdownMenuItem
        v-if="!ownFolder && (signedIn || pickup.data.value?.join_policy === 'open')"
        @select="router.push({ name: 'pickup-join', params: { pickupId } })"
      >
        <UserPlusIcon />
        {{ signedIn ? 'Create my folder' : 'Join this pickup' }}
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
          Leave on this device
        </DropdownMenuItem>
      </template>
    </DropdownMenuContent>
  </DropdownMenu>

  <EmailLinkDialog v-if="pickup.data.value" v-model:open="emailOpen" :pickup="pickup.data.value" />

  <ConfirmDialog
    v-model:open="confirmOpen"
    title="Leave this pickup on this device?"
    :description="leaveDescription"
    confirm-label="Leave"
    @confirm="confirmLeave"
  />
</template>
