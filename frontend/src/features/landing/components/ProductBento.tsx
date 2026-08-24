import { Icon } from '../../../shared/ui/Icon'
import { SquadStage } from './SquadStage'

export function ProductBento() {
  return <section className="mx-auto max-w-[1370px] px-5 py-[90px] tablet:px-[42px] tablet:py-[145px] tablet:pb-[155px]" id="features">
    <div className="mb-[43px] tablet:grid tablet:grid-cols-[1fr_3fr] tablet:items-start tablet:mb-[70px]">
      <p className="m-0 mt-2.5 text-[10px] font-extrabold tracking-[.18em] text-pl-pink">INSIDE FANTASY PL</p>
      <h2 className="mt-[19px] max-w-[900px] font-display text-[clamp(2.6rem,13vw,4rem)] font-extrabold leading-[.98] tracking-[-.055em] text-pl-purple tablet:mt-0 tablet:text-[clamp(2.8rem,5vw,5.2rem)]">One place for every call that <em className="not-italic text-[#8e8290]">changes your weekend.</em></h2>
    </div>
    <div className="flex flex-col gap-3 tablet:grid tablet:grid-cols-2 tablet:grid-rows-[560px_300px_260px] wide:grid-cols-4 wide:grid-rows-[360px_290px]">
      <article className="relative min-h-[555px] overflow-hidden border border-[#d9d2dc] bg-pl-purple px-[23px] py-7 text-white tablet:col-span-2 tablet:min-h-0 tablet:p-[35px] wide:row-span-2">
        <div className="relative z-[2] max-w-[410px]"><span className="text-[8px] font-extrabold tracking-[.16em]">PLAN</span><h3 className="my-[9px] font-display text-[34px] font-extrabold leading-[1.05] tracking-[-.05em]">See the whole pitch.</h3><p className="m-0 text-xs leading-relaxed text-[#d9c5dc]">Shape your squad, balance the budget and make every position count before the deadline.</p></div><SquadStage compact />
      </article>
      <article className="relative min-h-80 overflow-hidden border border-[#d9d2dc] bg-pl-cyan p-7 text-pl-purple tablet:col-span-2 tablet:min-h-0 wide:col-span-2">
        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-5 text-[10px] font-extrabold"><span className="flex w-max items-center gap-[7px] before:size-[7px] before:rounded-full before:bg-pl-pink before:shadow-[0_0_0_4px_#e9005226]">LIVE</span><span>ARS 2–1 MCI</span><span>78:24</span></div>
        <div className="relative z-[2] mt-[45px] tablet:mt-[55px]"><span className="block text-[8px] font-extrabold tracking-[.16em]">GAMEWEEK</span><strong className="block font-display text-[100px] font-extrabold leading-[.84] tracking-[-.08em]">64</strong><p className="mt-3 text-[11px] font-bold">+9 points in play</p></div>
        <div className="absolute inset-x-0 bottom-0 h-[150px]" aria-hidden="true"><svg className="size-full" viewBox="0 0 600 100" preserveAspectRatio="none"><path className="fill-none stroke-pl-purple stroke-2" d="M0 82 C70 90 75 50 140 61 S218 82 278 41 385 73 445 25 520 50 600 5"/><path className="fill-[#00deea] stroke-none" d="M0 82 C70 90 75 50 140 61 S218 82 278 41 385 73 445 25 520 50 600 5 V100 H0Z"/></svg></div>
      </article>
      <article className="relative flex min-h-[250px] flex-col justify-between overflow-hidden border border-[#d9d2dc] bg-white p-6 tablet:min-h-0">
        <span className="grid size-[37px] place-items-center rounded-full border border-current"><Icon name="swap" /></span><div><span className="text-[8px] font-extrabold tracking-[.16em]">TRANSFER DESK</span><strong className="my-[7px] block font-display text-[22px] font-extrabold leading-[1.1] tracking-[-.04em]">Palmer</strong><small className="text-[9px] text-[#817483]">Form rising · next: BHA (H)</small></div><button className="absolute right-[22px] top-[22px] size-[35px] rounded-full border-0 bg-pl-purple text-xl text-white" aria-label="Add Palmer to squad">+</button>
      </article>
      <article className="relative flex min-h-[250px] flex-col justify-between overflow-hidden border border-[#d9d2dc] bg-pl-pink p-6 text-white tablet:min-h-0">
        <span className="grid size-[37px] place-items-center rounded-full border border-current"><Icon name="users" /></span><div><span className="text-[8px] font-extrabold tracking-[.16em]">FRIENDS LEAGUE</span><strong className="my-[7px] block font-display text-[22px] font-extrabold leading-[1.1] tracking-[-.04em]">You moved up to 2nd</strong></div><div className="mt-[18px] flex [&_i]:-mr-[7px] [&_i]:grid [&_i]:size-[34px] [&_i]:place-items-center [&_i]:rounded-full [&_i]:border-2 [&_i]:border-pl-pink [&_i]:bg-pl-green [&_i]:text-[7px] [&_i]:font-extrabold [&_i]:not-italic [&_i]:text-pl-purple"><i>JL</i><i className="!bg-pl-cyan">AK</i><i className="!w-[45px] !rounded-[20px] !bg-white">YOU</i></div>
      </article>
    </div>
  </section>
}
