<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import { ApiError, apiErrorMessage } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { t } from '@/lib/i18n'

import { useJoinPickup } from '../composables/usePickup'

const props = defineProps<{ pickupId: string; initialName?: string; passwordRequired?: boolean }>()

const router = useRouter()
const join = useJoinPickup(() => props.pickupId)
const form = reactive({
  user_name: props.initialName ?? '',
  name: props.initialName ?? '',
  email: '',
  password: '',
})
const fieldErrors = ref<Record<string, string>>({})

// The folder is named after the person until they choose another name.
const folderNameTouched = ref(false)
watch(
  () => form.user_name,
  (name) => {
    if (!folderNameTouched.value) form.name = name
  },
)

async function submit() {
  fieldErrors.value = {}
  try {
    const { password, ...details } = form
    const joined = await join.mutateAsync(
      props.passwordRequired ? { ...details, password } : details,
    )
    toast.success(t('Welcome! Your folder is ready.'))
    await router.push({
      name: 'explorer-folder',
      params: { pickupId: props.pickupId, folderId: joined.folder.id },
    })
  } catch (err) {
    if (err instanceof ApiError && err.body && typeof err.body === 'object') {
      for (const [field, messages] of Object.entries(err.body)) {
        if (Array.isArray(messages)) fieldErrors.value[field] = String(messages[0])
      }
    }
    toast.error(apiErrorMessage(err, t('Could not join the pickup')))
  }
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="submit">
    <div v-if="passwordRequired" class="space-y-1.5">
      <Label for="join_password">{{ t('Password of the pickup') }}</Label>
      <Input
        id="join_password"
        v-model="form.password"
        type="password"
        required
        autocomplete="current-password"
      />
      <p class="text-sm text-muted-foreground">{{ t('Ask the person who shared the link.') }}</p>
    </div>
    <div class="space-y-1.5">
      <Label for="user_name">{{ t('Your name') }}</Label>
      <Input id="user_name" v-model="form.user_name" required autocomplete="name" />
      <p v-if="fieldErrors.user_name" class="text-sm text-destructive">
        {{ fieldErrors.user_name }}
      </p>
    </div>
    <div class="space-y-1.5">
      <Label for="folder_name">{{ t('Folder name') }}</Label>
      <Input id="folder_name" v-model="form.name" required @input="folderNameTouched = true" />
      <p v-if="fieldErrors.name" class="text-sm text-destructive">{{ fieldErrors.name }}</p>
    </div>
    <div class="space-y-1.5">
      <Label for="email">{{ t('Email (optional)') }}</Label>
      <Input id="email" v-model="form.email" type="email" autocomplete="email" />
      <p class="text-sm text-muted-foreground">
        {{ t('We send you your personal link, so you can log in on other devices.') }}
      </p>
      <p v-if="fieldErrors.email" class="text-sm text-destructive">
        {{ fieldErrors.email }}
      </p>
    </div>
    <Button type="submit" class="w-full" :disabled="join.isPending.value">
      {{ join.isPending.value ? t('Joining…') : t('Join pickup') }}
    </Button>
  </form>
</template>
