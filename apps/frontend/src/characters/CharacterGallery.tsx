import { CharacterAvatar } from './CharacterAvatar'
import { characters } from './registry'
import type { CharacterClip } from './types'

const CLIP_ORDER: CharacterClip[] = [
  'idle',
  'talking',
  'argue',
  'fight',
  'calm',
  'break',
]

/** Every character with every clip it has, for checking the cast by eye. */
export function CharacterGallery() {
  return (
    <section className="mx-auto max-w-6xl p-6">
      <h1 className="font-title text-sidenav-blue mb-6 text-4xl">
        Quivr characters
      </h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {characters.map(c => (
          <article
            key={c.id}
            className="bg-cardbg text-main-text motion-safe:animate-fade-up rounded-lg p-4 shadow-sm"
          >
            <div className={`${c.colorClass} mb-3 h-1.5 rounded-full`} />
            <header className="flex items-center gap-3">
              <CharacterAvatar
                characterId={c.id}
                clip="idle"
                size={72}
                className="rounded-full bg-white"
              />
              <div>
                <h2 className="font-title text-sidenav-blue text-2xl">
                  {c.name}
                </h2>
                <p className="text-sm">{c.role}</p>
              </div>
            </header>
            <p className="mt-3 text-sm">{c.persona}</p>
            <ul className="mt-4 grid grid-cols-3 gap-2">
              {CLIP_ORDER.filter(clip => c.animations[clip]).map(clip => (
                <li
                  key={clip}
                  className="flex flex-col items-center rounded bg-white p-2"
                >
                  <CharacterAvatar
                    characterId={c.id}
                    clip={clip}
                    size={72}
                  />
                  <span className="bg-main text-sidenav-blue mt-1 rounded px-2 text-xs">
                    {clip}
                  </span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  )
}
