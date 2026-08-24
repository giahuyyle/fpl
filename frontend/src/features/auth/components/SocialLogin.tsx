export function SocialLogin() {
  return <>
    <div className="my-[18px] mt-[26px] flex items-center gap-[13px] text-[8px] font-bold tracking-[.15em] text-[#9f97a0]"><i className="flex-1 border-t border-[#e8e3e9]" /><span>OR CONTINUE WITH</span><i className="flex-1 border-t border-[#e8e3e9]" /></div>
    <div className="grid grid-cols-2 gap-[11px] [&_button]:h-[45px] [&_button]:rounded [&_button]:border [&_button]:border-[#e0dbe2] [&_button]:bg-white [&_button]:text-xs [&_button]:font-semibold [&_button]:text-[#463849]"><button type="button"><span className="mr-[7px] text-[15px] font-extrabold text-[#4285f4]">G</span> Google</button><button type="button"><span className="mr-2 text-[#111]">●</span> Apple</button></div>
  </>
}
