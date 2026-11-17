import { Header } from '../components/Header'
import type { ScreenProps } from './types'

export function ArgumentScreen({
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
      <main className="mx-auto w-full max-w-3xl flex-1 p-4 pt-10 text-center">
        <p className="font-title text-sidenav-blue text-3xl">Argument</p>
        <p>Coming soon.</p>
      </main>
    </div>
  )
}
