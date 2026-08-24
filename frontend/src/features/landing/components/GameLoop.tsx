import { Icon } from '../../../shared/ui/Icon'
import { navigate } from '../../../shared/lib/navigation'

const gameSteps = [
  { step: 'Pick', title: 'Build with intent.', copy: 'Choose 15 players under budget. Every compromise becomes part of your strategy.' },
  { step: 'Play', title: 'Make the brave call.', copy: 'Set your captain, work the market and time your chips when the upside is real.' },
  { step: 'Rise', title: 'Let the weekend decide.', copy: 'Real performances become your points. Every goal can redraw your league table.' },
]

export function GameLoop() {
  return <section className="game-loop" id="game"><div className="game-loop-index"><span>THE GAME LOOP</span><h2>Simple rules.<br />Endless opinions.</h2><p>The squad is yours. So is every decision that follows.</p><button className="text-arrow" onClick={() => navigate('/login')}>Learn how to play <Icon name="arrow" size={17} /></button></div><div className="game-loop-steps">{gameSteps.map((item, index) => <article key={item.step}><div><span>0{index + 1}</span><em>{item.step}</em></div><h3>{item.title}</h3><p>{item.copy}</p></article>)}</div></section>
}
