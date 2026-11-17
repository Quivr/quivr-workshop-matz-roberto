import { useState } from 'react'

import { Header } from '../components/Header'
import { ArgumentArena } from '../modes/argument/ArgumentArena'
import { pickCast } from '../modes/argument/cast'
import type { ScreenProps } from './types'

export function ArgumentScreen({
  models,
  model,
  onModelChange,
  onHome,
}: ScreenProps) {
  const [round, setRound] = useState(() => ({ id: 0, cast: pickCast() }))

  return (
    <div className="flex h-dvh flex-col">
      <Header
        models={models}
        model={model}
        onModelChange={onModelChange}
        onHome={onHome}
      />
      <ArgumentArena
        key={round.id}
        cast={round.cast}
        model={model}
        onNewArgument={() =>
          setRound(previous => ({ id: previous.id + 1, cast: pickCast() }))
        }
      />
    </div>
  )
}
