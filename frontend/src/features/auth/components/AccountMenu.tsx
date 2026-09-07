import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { navigate } from '../../../shared/lib/navigation'
import { logout } from '../api/session'
import './AccountMenu.css'

type AccountMenuProps = {
  isLoggingOut?: boolean
  onLogout?: () => void | Promise<void>
}

export function AccountMenu({ isLoggingOut = false, onLogout }: AccountMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const settingsRef = useRef<HTMLButtonElement>(null)
  const logoutRef = useRef<HTMLButtonElement>(null)
  const busy = isLoggingOut || isSubmitting

  useEffect(() => {
    if (!isOpen) return

    settingsRef.current?.focus()
    function closeOnOutsideClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false)
    }
    function closeOnEscape(event: globalThis.KeyboardEvent) {
      if (event.key !== 'Escape') return
      setIsOpen(false)
      triggerRef.current?.focus()
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isOpen])

  function openFromKeyboard(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'ArrowDown') return
    event.preventDefault()
    setIsOpen(true)
  }

  function moveMenuFocus(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const target = event.target === settingsRef.current ? logoutRef.current : settingsRef.current
    target?.focus()
  }

  function openSettings() {
    setIsOpen(false)
    navigate('/account')
  }

  async function submitLogout() {
    setError('')
    setIsSubmitting(true)
    try {
      if (onLogout) await onLogout()
      else {
        await logout()
        navigate('/login')
      }
      setIsOpen(false)
    } catch {
      setError('Unable to log out. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return <div className="account-dropdown" ref={rootRef}>
    <button
      ref={triggerRef}
      className="account-dropdown-trigger"
      type="button"
      aria-haspopup="menu"
      aria-expanded={isOpen}
      aria-controls="account-dropdown-menu"
      onClick={() => { setError(''); setIsOpen(open => !open) }}
      onKeyDown={openFromKeyboard}
    >
      Account
      <span className="account-dropdown-chevron" aria-hidden="true" />
    </button>
    {isOpen && <div
      id="account-dropdown-menu"
      className="account-dropdown-menu"
      role="menu"
      aria-label="Account"
      onKeyDown={moveMenuFocus}
    >
      <button ref={settingsRef} type="button" role="menuitem" onClick={openSettings}>Settings</button>
      <button ref={logoutRef} className="account-dropdown-logout" type="button" role="menuitem" disabled={busy} onClick={submitLogout}>
        {busy ? 'Logging out…' : 'Logout'}
      </button>
      {error && <p className="account-dropdown-error" role="alert">{error}</p>}
    </div>}
  </div>
}
