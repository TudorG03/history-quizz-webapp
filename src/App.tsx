import { Scene } from './components/Scene'
import { UI } from './components/UI'

function App() {
  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-900 touch-none">
      <Scene />
      <UI />
    </div>
  )
}

export default App
