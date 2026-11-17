import { useTheme, type ThemePreference } from './useTheme'

const OPTIONS: { value: ThemePreference; label: string; icon: string }[] = [
  { value: 'light', label: 'Light', icon: '☀️' },
  { value: 'system', label: 'System', icon: '💻' },
  { value: 'dark', label: 'Dark', icon: '🌙' },
]

/** Three-way theme switch: light, follow the system, dark. */
export function ThemeToggle() {
  const { preference, setPreference } = useTheme()

  return (
    <div
      role="group"
      aria-label="Theme"
      className="bg-sidenav-secondary flex rounded p-0.5"
    >
      {OPTIONS.map(({ value, label, icon }) => (
        <button
          key={value}
          type="button"
          aria-pressed={preference === value}
          aria-label={label}
          title={label}
          onClick={() => setPreference(value)}
          className={`focus-visible:outline-main rounded px-1.5 py-0.5 text-sm ${
            preference === value
              ? 'bg-main text-sidenav-blue'
              : 'hover:bg-sidenav-blue'
          }`}
        >
          <span aria-hidden>{icon}</span>
        </button>
      ))}
    </div>
  )
}
