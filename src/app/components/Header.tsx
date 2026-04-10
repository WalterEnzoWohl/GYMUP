import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router'
import { brandLogoBlack, brandLogoWhite } from '@/assets'
import { UserAvatar } from './UserAvatar'
import { useAppData } from '../data/AppDataContext'

interface HeaderProps {
  showBack?: boolean
  backLabel?: string
  title?: string
  rightContent?: ReactNode
  onBack?: () => void
}

export function Header({ showBack, backLabel, title, rightContent, onBack }: HeaderProps) {
  const navigate = useNavigate()
  const { appSettings } = useAppData()
  const resolvedRightContent = rightContent !== undefined ? rightContent : (
    <UserAvatar />
  )
  const brandLogo = appSettings.theme === 'light' ? brandLogoBlack : brandLogoWhite

  const handleBack = () => {
    if (onBack) onBack()
    else navigate(-1)
  }

  return (
    <div
      className="sticky top-0 shrink-0 z-30 border-b border-[#203347] px-4 backdrop-blur-xl"
      style={{
        background: 'rgba(11, 31, 51, 0.94)',
        paddingTop: 'var(--wohl-safe-top)',
      }}
    >
      <div className="flex h-14 items-center">
        <div className="flex flex-1 items-center">
          {showBack ? (
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-[#90A4B8] transition-colors hover:text-white"
            >
              <ArrowLeft size={20} />
              {backLabel && (
                <span
                  className="text-sm"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  {backLabel}
                </span>
              )}
            </button>
          ) : (
            <div className="-ml-1 flex h-14 w-14 items-center justify-center overflow-visible">
              <img src={brandLogo} alt="WOHL" className="theme-preserve h-[47px] w-[47px] object-contain" />
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-center px-2">
          {title ? (
            <span
              className="truncate text-base font-bold text-white"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              {title}
            </span>
          ) : (
            <span
              className="text-[1.7rem] font-black leading-none tracking-[0.16em] text-white uppercase"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              WOHL
            </span>
          )}
        </div>

        <div className="flex flex-1 items-center justify-end">
          {resolvedRightContent}
        </div>
      </div>
    </div>
  )
}
