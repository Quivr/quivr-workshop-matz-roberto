import { Header } from '../components/Header'
import { PartyRoom } from '../modes/party/PartyRoom'
import { useParty } from '../modes/party/useParty'
import type { ScreenProps } from './types'

export function PartyScreen({
  models,
  model,
  onModelChange,
  onHome,
}: ScreenProps) {
  const party = useParty(model, models[0])

  return (
    <div className="flex h-dvh flex-col">
      <Header
        models={models}
        model={model}
        onModelChange={onModelChange}
        onNewChat={party.newParty}
        onHome={onHome}
      />
      <PartyRoom party={party} />
    </div>
  )
}
