import { useRouter } from '@tanstack/react-router'
import arrowLeft from '@/assets/icons/arrow-left.svg'
import iconCircleSm from '@/assets/ui/icon-circle-sm.svg'
import { cn } from '@/lib/utils'

/** 44px header of the mobile buying-flow screens: round back button and centered title. */
export function MobileScreenHeader({ title, className }: { title: string; className?: string }) {
  const router = useRouter()
  const back = () => (window.history.length > 1 ? router.history.back() : void router.navigate({ to: '/' }))

  return (
    <header className={cn('flex h-11 items-start md:hidden', className)}>
      <button type="button" aria-label="Voltar" onClick={back} className="relative size-[35px] shrink-0">
        <img src={iconCircleSm} alt="" className="absolute inset-0 size-full" />
        <span className="absolute top-[7px] left-[7px] grid size-5 place-items-center">
          <img src={arrowLeft} alt="" className="h-[7.33px] w-[13.17px] rotate-90" />
        </span>
      </button>
      <h1 className="flex-1 pt-[9px] text-center text-xl leading-4 font-bold">{title}</h1>
    </header>
  )
}
