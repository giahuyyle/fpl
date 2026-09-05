import { Icon } from '../../../shared/ui/Icon'
import { price } from '../squadConfig'

type Props = {
  bank: number
  squadValue: number
  username: string
}

function BadgePlaceholder() {
  return <div aria-label="Team badge placeholder" className="grid size-24 place-items-center rounded-[26px] bg-[#f3eff4] text-pl-purple" role="img">
    <div className="grid size-14 place-items-center rounded-[18px] border-4 border-pl-purple text-3xl font-light">+</div>
  </div>
}

export function SquadInfoPanel({ bank, squadValue, username }: Props) {
  return <aside aria-label="Squad information" className="overflow-hidden rounded-[28px] bg-white shadow-[0_30px_80px_#1700191c] wide:absolute wide:inset-0 wide:overflow-auto">
    <div className="flex items-center gap-4 border-b border-[#e9e3ea] px-5 py-6 tablet:px-7">
      <BadgePlaceholder />
      <div className="min-w-0">
        <h2 className="truncate font-display text-3xl font-black tracking-[-.04em] text-pl-purple">Squad</h2>
        <p className="mt-1 truncate text-sm font-semibold text-muted">{username}</p>
      </div>
    </div>

    <section className="border-b border-[#e9e3ea] px-5 py-7 tablet:px-7">
      <h3 className="font-display text-xl font-extrabold text-pl-purple">Team badge</h3>
      <div className="mt-5"><BadgePlaceholder /></div>
    </section>

    <section className="border-b border-[#e9e3ea] px-5 py-7 tablet:px-7">
      <h3 className="font-display text-xl font-extrabold text-pl-purple">Fan league</h3>
      <div className="mt-5 flex items-center gap-3 rounded-2xl bg-[#f7f4f8] px-4 py-4 text-muted">
        <span className="grid size-11 place-items-center rounded-full bg-white text-pl-purple"><Icon name="users" size={22} /></span>
        <strong className="text-sm">Not selected</strong>
      </div>
    </section>

    <section className="px-5 py-7 tablet:px-7">
      <h3 className="font-display text-xl font-extrabold text-pl-purple">Finance</h3>
      <dl className="mt-5 grid gap-4 text-sm">
        <div className="flex items-center justify-between gap-4"><dt className="text-muted">Squad value</dt><dd className="font-display text-lg font-extrabold text-pl-purple">{price(squadValue)}</dd></div>
        <div className="flex items-center justify-between gap-4"><dt className="text-muted">In the bank</dt><dd className="font-display text-lg font-extrabold text-pl-purple">{price(bank)}</dd></div>
      </dl>
    </section>
  </aside>
}
