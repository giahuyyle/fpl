import { Icon } from '../../../shared/ui/Icon'
import { navigate } from '../../../shared/lib/navigation'

const gameSteps = [
  { step: 'Pick', title: 'Build with intent.', copy: 'Choose 15 players under budget. Every compromise becomes part of your strategy.' },
  { step: 'Play', title: 'Make the brave call.', copy: 'Set your captain, work the market and time your chips when the upside is real.' },
  { step: 'Rise', title: 'Let the weekend decide.', copy: 'Real performances become your points. Every goal can redraw your league table.' },
]

export function GameLoop({ destination = '/login' }: { destination?: string }) {
  return <section className="mx-auto block max-w-[1370px] px-5 pb-[100px] pt-[15px] tablet:grid tablet:grid-cols-[1fr_1.5fr] tablet:gap-[55px] tablet:px-[42px] tablet:pb-[170px] tablet:pt-[50px] wide:gap-[100px]" id="game">
    <div className="mb-[60px] self-start tablet:sticky tablet:top-[60px] tablet:mb-0"><span className="text-[9px] font-extrabold tracking-[.18em] text-pl-pink">THE GAME LOOP</span><h2 className="my-[22px] mt-6 font-display text-[clamp(2.6rem,4.6vw,4.8rem)] font-extrabold leading-[.95] tracking-[-.055em] text-pl-purple">Simple rules.<br />Endless opinions.</h2><p className="max-w-[340px] leading-[1.7] text-[#756a77]">The squad is yours. So is every decision that follows.</p><button className="mt-[30px] flex items-center gap-2.5 border-0 border-b-2 border-pl-purple bg-transparent px-0 pb-1.5 text-xs font-extrabold text-pl-purple" onClick={() => navigate(destination)}>Learn how to play <Icon name="arrow" size={17} /></button></div>
    <div>{gameSteps.map((item, index) => <article className="grid min-h-[260px] grid-cols-[75px_1fr] grid-rows-[auto_1fr] gap-x-[15px] border-t border-[#c6bdc8] py-9 tablet:min-h-[290px] tablet:grid-cols-[120px_1fr] tablet:gap-x-[34px]" key={item.step}><div className="row-span-2 flex flex-col gap-3.5"><span className="font-display text-[38px] font-extrabold leading-none tracking-[-.07em] text-[#b7aabc] tablet:text-[54px]">0{index + 1}</span><em className="text-[10px] font-extrabold not-italic uppercase tracking-[.16em] text-pl-pink">{item.step}</em></div><h3 className="mb-[18px] mt-[5px] font-display text-[29px] font-extrabold leading-none tracking-[-.05em] text-pl-purple tablet:text-[35px]">{item.title}</h3><p className="m-0 max-w-[490px] text-sm leading-[1.75] text-[#756a77]">{item.copy}</p></article>)}</div>
  </section>
}
