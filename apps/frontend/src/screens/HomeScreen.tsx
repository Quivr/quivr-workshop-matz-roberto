import type { Mode } from '../App'
import { ThemeToggle } from '../theme/ThemeToggle'

type Props = {
  onSelect: (mode: Exclude<Mode, 'home'>) => void
}

const cardClass =
  'hover:bg-cardbg motion-safe:animate-fade-up block w-full rounded-lg bg-surface p-4 text-left shadow-sm'

function ModeCard({
  title,
  description,
  onClick,
}: {
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cardClass}
    >
      <span className="font-title text-heading block text-2xl tracking-wide">
        {title}
      </span>
      <span className="text-sm">{description}</span>
    </button>
  )
}

export function HomeScreen({ onSelect }: Props) {
  return (
    <div className="flex h-dvh flex-col">
      <header className="bg-sidenav-blue flex flex-wrap items-center gap-3 px-4 py-2 text-white">
        <img
          src="/logo.svg"
          alt=""
          className="h-8 w-8"
        />
        <h1 className="font-title text-main mr-auto text-3xl tracking-wide">
          Ask Quivr
        </h1>
        <ThemeToggle />
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 overflow-y-auto p-4 pt-10">
        <p className="font-title text-heading text-center text-3xl">
          What do you want to do?
        </p>
        <ModeCard
          title="Quivr SaaS"
          description="Ask Quivr about menus, classes, libraries and more."
          onClick={() => onSelect('chat')}
        />
        <section className="space-y-2">
          <h2 className="font-title text-muted text-xl tracking-wide">Fun</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <ModeCard
              title="Argument"
              description="Watch three characters argue it out."
              onClick={() => onSelect('argument')}
            />
            <ModeCard
              title="Chill"
              description="Relax and hang out."
              onClick={() => onSelect('chill')}
            />
            <ModeCard
              title="Party"
              description="The bar and the argument, all at once, with you in the middle."
              onClick={() => onSelect('party')}
            />
          </div>
        </section>
        <section className="space-y-2">
          <h2 className="font-title text-muted text-xl tracking-wide">
            Explore
          </h2>
          <ModeCard
            title="Characters"
            description="Meet the cast and see every animation."
            onClick={() => onSelect('characters')}
          />
        </section>
      </main>
    </div>
  )
}
