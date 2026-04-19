import { create } from 'zustand'

export type DialogVariant = 'confirm' | 'alert' | 'prompt' | 'error' | 'success' | 'loading'

export interface DialogState {
  open: boolean
  variant: DialogVariant
  title: string
  message: string
  /** Label for the confirm / OK button */
  confirmLabel?: string
  /** Label for the cancel button (confirm variant only) */
  cancelLabel?: string
  /** Current value for prompt variant */
  promptValue?: string
  /** Placeholder text for prompt input */
  promptPlaceholder?: string
  /** Whether the action is currently processing (disables buttons, shows spinner) */
  processing?: boolean
}

interface DialogActions {
  /** Show a confirm dialog. Returns true if user confirmed, false if cancelled. */
  showConfirm: (opts: {
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
  }) => Promise<boolean>

  /** Show an alert dialog (informational, single OK button). */
  showAlert: (opts: {
    title: string
    message: string
    confirmLabel?: string
  }) => Promise<void>

  /** Show a prompt dialog. Returns the entered string or null if cancelled. */
  showPrompt: (opts: {
    title: string
    message: string
    placeholder?: string
    defaultValue?: string
    confirmLabel?: string
    cancelLabel?: string
  }) => Promise<string | null>

  /** Show an error dialog. */
  showError: (opts: {
    title?: string
    message: string
  }) => Promise<void>

  /** Show a success dialog. */
  showSuccess: (opts: {
    title?: string
    message: string
  }) => Promise<void>

  /** Show a loading overlay (call close() to dismiss). */
  showLoading: (opts: {
    title?: string
    message?: string
  }) => void

  /** Resolve the current dialog (used internally by DialogProvider). */
  resolve: (value: boolean | string | null) => void

  /** Update prompt value (used internally by DialogProvider). */
  setPromptValue: (value: string) => void

  /** Close the current dialog without resolving (for loading only). */
  close: () => void
}

type DialogStore = DialogState & DialogActions

// We store the resolve function outside of Zustand to avoid serialization issues
let currentResolve: ((value: boolean | string | null) => void) | null = null

/** Settle any pending dialog Promise before opening a new one */
function settlePending() {
  if (currentResolve) {
    // Resolve with a "cancelled" value so the awaiting caller unblocks
    currentResolve(false)
    currentResolve = null
  }
}

const initialState: DialogState = {
  open: false,
  variant: 'alert',
  title: '',
  message: '',
  confirmLabel: undefined,
  cancelLabel: undefined,
  promptValue: undefined,
  promptPlaceholder: undefined,
  processing: false,
}

export const useDialogStore = create<DialogStore>((set) => ({
  ...initialState,

  showConfirm: (opts) =>
    new Promise<boolean>((res) => {
      settlePending()
      currentResolve = res as (value: boolean | string | null) => void
      set({
        open: true,
        variant: 'confirm',
        title: opts.title,
        message: opts.message,
        confirmLabel: opts.confirmLabel ?? 'Потвърди',
        cancelLabel: opts.cancelLabel ?? 'Отказ',
        processing: false,
      })
    }),

  showAlert: (opts) =>
    new Promise<void>((res) => {
      settlePending()
      currentResolve = (() => res()) as unknown as (value: boolean | string | null) => void
      set({
        open: true,
        variant: 'alert',
        title: opts.title,
        message: opts.message,
        confirmLabel: opts.confirmLabel ?? 'OK',
        processing: false,
      })
    }),

  showPrompt: (opts) =>
    new Promise<string | null>((res) => {
      settlePending()
      currentResolve = res as (value: boolean | string | null) => void
      set({
        open: true,
        variant: 'prompt',
        title: opts.title,
        message: opts.message,
        promptPlaceholder: opts.placeholder ?? '',
        promptValue: opts.defaultValue ?? '',
        confirmLabel: opts.confirmLabel ?? 'OK',
        cancelLabel: opts.cancelLabel ?? 'Отказ',
        processing: false,
      })
    }),

  showError: (opts) =>
    new Promise<void>((res) => {
      settlePending()
      currentResolve = (() => res()) as unknown as (value: boolean | string | null) => void
      set({
        open: true,
        variant: 'error',
        title: opts.title ?? 'Грешка',
        message: opts.message,
        confirmLabel: 'OK',
        processing: false,
      })
    }),

  showSuccess: (opts) =>
    new Promise<void>((res) => {
      settlePending()
      currentResolve = (() => res()) as unknown as (value: boolean | string | null) => void
      set({
        open: true,
        variant: 'success',
        title: opts.title ?? 'Успех',
        message: opts.message,
        confirmLabel: 'OK',
        processing: false,
      })
    }),

  showLoading: (opts) => {
    settlePending()
    set({
      open: true,
      variant: 'loading',
      title: opts.title ?? '',
      message: opts.message ?? 'Моля, изчакайте...',
      processing: true,
    })
  },

  resolve: (value) => {
    if (currentResolve) {
      currentResolve(value)
      currentResolve = null
    }
    set({ ...initialState })
  },

  setPromptValue: (value) => set({ promptValue: value }),

  close: () => {
    settlePending()
    set({ ...initialState })
  },
}))
