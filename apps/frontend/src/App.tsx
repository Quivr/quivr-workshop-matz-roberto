import { useEffect, useState } from 'react'

import { ArgumentScreen } from './screens/ArgumentScreen'
import { CharactersScreen } from './screens/CharactersScreen'
import { ChatScreen } from './screens/ChatScreen'
import { ChillScreen } from './screens/ChillScreen'
import { HomeScreen } from './screens/HomeScreen'
import { useAgentChat } from './useAgentChat'

export type Mode = 'home' | 'chat' | 'argument' | 'chill' | 'characters'

export function App() {
  const chat = useAgentChat()
  const [mode, setMode] = useState<Mode>('home')
  const [models, setModels] = useState<string[]>([])
  const [model, setModel] = useState('')

  useEffect(() => {
    fetch('/api/models')
      .then(
        response =>
          response.json() as Promise<{ models: string[]; defaultModel: string }>
      )
      .then(body => {
        setModels(body.models)
        setModel(body.defaultModel)
      })
      .catch(() => setModels([]))
  }, [])

  const screenProps = {
    models,
    model,
    onModelChange: setModel,
    onHome: () => setMode('home'),
  }

  if (mode === 'chat')
    return (
      <ChatScreen
        {...screenProps}
        chat={chat}
      />
    )
  if (mode === 'argument') return <ArgumentScreen {...screenProps} />
  if (mode === 'chill') return <ChillScreen {...screenProps} />
  if (mode === 'characters') return <CharactersScreen {...screenProps} />
  return <HomeScreen onSelect={setMode} />
}
