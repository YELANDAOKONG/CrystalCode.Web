import { ref } from 'vue'
import { loadPreference, savePreference } from '@/connection/storage'

const fullWidth = ref(loadPreference('conversation-width') === 'full')

export function useConversationWidth() {
  return {
    fullWidth,
    setFullWidth(value: boolean) {
      fullWidth.value = value
      savePreference('conversation-width', value ? 'full' : 'contained')
    },
  }
}
