import { navigate } from '../../shared/lib/navigation'
import { Icon } from '../../shared/ui/Icon'
import { PillButton } from '../../shared/ui/PillButton'
import { GameLoop } from './components/GameLoop'
import { LandingFooter } from './components/LandingFooter'
import { LandingHeader } from './components/LandingHeader'
import { MatchdayMarquee } from './components/MatchdayMarquee'
import { ProductBento } from './components/ProductBento'
import { SquadStage } from './components/SquadStage'

function CommunitySection() {
  return <section className="relative flex min-h-[620px] flex-col justify-center overflow-hidden bg-[linear-gradient(125deg,#37003c_0%,#6d006f_57%,#e90052_130%)] px-5 py-[105px] text-white tablet:min-h-[670px] tablet:px-[max(42px,calc((100vw-1286px)/2))] tablet:py-[130px]" id="community">
    <div className="absolute right-[-120px] top-2.5 size-[650px] rounded-full border border-pl-cyan/45 shadow-[0_0_0_90px_#04f5ff0b,0_0_0_180px_#04f5ff08]" aria-hidden="true" />
    <div className="absolute left-5 top-[50px] font-serif text-[150px] font-extrabold leading-[.8] text-pl-green tablet:left-[max(42px,calc((100vw-1286px)/2))] tablet:top-[65px]">“</div>
    <blockquote className="relative z-[1] m-0 max-w-[1060px] font-display text-[clamp(2.8rem,13vw,4.4rem)] font-extrabold leading-[.94] tracking-[-.055em] tablet:text-[clamp(3rem,6vw,6.5rem)]">There is no passive way to watch football once your captain is on the pitch.</blockquote>
    <div className="relative z-[1] mt-[55px] block tablet:flex tablet:items-center tablet:gap-[35px]"><span className="text-[9px] font-extrabold tracking-[.17em] text-pl-green">FANTASY PL MANAGER</span><p className="mt-3 max-w-[260px] text-xs text-[#e4cde7] tablet:m-0 tablet:max-w-none">The weekend means more when every minute counts.</p></div>
  </section>
}

function FinalCta() {
  return <section className="relative flex min-h-[580px] flex-col items-center justify-center overflow-hidden bg-pl-green px-5 py-[90px] text-center text-pl-purple tablet:min-h-[720px] tablet:px-[30px] tablet:py-[120px]">
    <div className="absolute scale-[5.5] -rotate-[15deg] text-pl-pink opacity-[.12]" aria-hidden="true"><Icon name="ball" size={88} /></div><span className="text-[9px] font-extrabold tracking-[.2em]">YOUR TEAM. YOUR CALLS.</span><h2 className="relative z-[1] mb-[45px] mt-[25px] font-display text-[clamp(3.6rem,18vw,6rem)] font-black uppercase leading-[.82] tracking-[-.07em] tablet:text-[clamp(4rem,9vw,9rem)]">Think you know<br />football?</h2><PillButton className="relative z-[1] min-h-14 px-7" variant="dark" onClick={() => navigate('/login')}>Build your first XI <Icon name="arrow" size={18} /></PillButton>
  </section>
}

export function LandingPage() {
  return <main className="overflow-clip bg-paper text-ink">
    <section className="relative isolate min-h-0 bg-pl-purple text-white tablet:min-h-[clamp(730px,86svh,800px)] stage:min-h-[clamp(740px,88svh,840px)]">
      <div className="relative z-20"><LandingHeader /></div>
      <div className="absolute inset-0 z-0 bg-[linear-gradient(90deg,transparent_calc(50%-1px),#fff_50%,transparent_calc(50%+1px)),repeating-linear-gradient(#ffffff10_0_1px,transparent_1px_80px)] opacity-[.19] [mask-image:linear-gradient(to_bottom,#000,transparent_82%)] tablet:bg-[linear-gradient(90deg,transparent_calc(25%-1px),#fff_25%,transparent_calc(25%+1px),transparent_calc(50%-1px),#fff_50%,transparent_calc(50%+1px),transparent_calc(75%-1px),#fff_75%,transparent_calc(75%+1px)),repeating-linear-gradient(#ffffff10_0_1px,transparent_1px_80px)]" aria-hidden="true" />
      <div className="relative z-10 mx-auto max-w-[1440px] px-5 pb-[470px] pt-[58px] tablet:px-7 tablet:pb-[58px] tablet:pt-[clamp(55px,7vh,90px)] stage:px-[42px] stage:pb-[72px]">
        <p className="mb-6 flex animate-stage-in items-center gap-3 text-[11px] font-bold uppercase tracking-[.15em] text-[#d7bfd9] tablet:mb-[30px]"><span className="w-[35px] border-t-2 border-pl-green" /> Fantasy football, fully felt</p>
        <h1 className="m-0 max-w-[11ch] font-display text-[clamp(3.6rem,21.5vw,6rem)] font-black uppercase leading-[.78] tracking-[-.07em] tablet:text-[clamp(4.8rem,12.5vw,8.5rem)] tablet:leading-[.75] tablet:tracking-[-.075em] stage:text-[clamp(4.8rem,11.5vw,11rem)]" aria-label="Make football yours."><span className="block animate-stage-in">MAKE</span><span className="block animate-stage-in [animation-delay:.07s]">FOOTBALL</span><span className="block animate-stage-in [animation-delay:.14s]"><em className="not-italic text-pl-green">YOURS.</em></span></h1>
        <div className="mt-[30px] max-w-full animate-stage-in [animation-delay:.2s] tablet:mt-8 tablet:max-w-[min(48vw,520px)] stage:mt-10 stage:max-w-[600px]"><p className="m-0 max-w-[340px] text-[15px] leading-[1.65] text-[#d7c4da] tablet:max-w-[470px] stage:max-w-none">Build the squad you believe in. Turn every pass, tackle and late winner into a reason to care more.</p><div className="mt-[22px] flex flex-col items-start tablet:mt-[18px] stage:mt-5"><PillButton className="whitespace-nowrap" onClick={() => navigate('/login')}>Build your first XI <Icon name="arrow" size={18} /></PillButton></div></div>
      </div>
      <div className="absolute bottom-7 right-1/2 z-[5] w-[min(78vw,290px)] translate-x-1/2 rotate-2 animate-mobile-product-in tablet:bottom-auto tablet:right-7 tablet:top-[185px] tablet:w-[min(35vw,390px)] tablet:translate-x-0 tablet:rotate-4 tablet:animate-product-in stage:right-[max(32px,calc((100vw-1440px)/2+42px))] stage:top-[165px] stage:w-[min(30vw,410px)]"><span className="absolute right-[calc(100%+20px)] top-[32%] hidden w-[135px] text-right text-[9px] uppercase leading-normal tracking-[.1em] text-[#b99abd] stage:block">Your weekend,<br />under new management.</span><SquadStage /></div>
    </section>
    <MatchdayMarquee /><ProductBento /><GameLoop /><CommunitySection /><FinalCta /><LandingFooter />
  </main>
}
