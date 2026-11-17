import { CharacterGallery } from '../characters/CharacterGallery'
import { Header } from '../components/Header'
import type { ScreenProps } from './types'

export function CharactersScreen({
  models,
  model,
  onModelChange,
  onHome,
}: ScreenProps) {
  return (
    <div className="flex h-dvh flex-col">
      <Header
        models={models}
        model={model}
        onModelChange={onModelChange}
        onHome={onHome}
      />
      <main className="min-h-0 flex-1 overflow-y-auto">
        <CharacterGallery />
      </main>
    </div>
  )
}
