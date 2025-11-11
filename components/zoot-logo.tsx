'use client'

import Image from 'next/image'
import { Building2 } from 'lucide-react'
import { useState } from 'react'

interface LogoProps {
  width?: number
  height?: number
  className?: string
  showText?: boolean
}

export function ZootLogo({ width = 32, height = 32, className = "", showText = false }: LogoProps) {
  const [imageError, setImageError] = useState(false)

  if (imageError) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="bg-gradient-to-br from-orange-500 via-green-500 to-blue-500 flex items-center justify-center rounded-xl shadow-lg" 
             style={{ width, height }}>
          <Building2 className="text-white" size={width * 0.5} />
        </div>
        {showText && (
          <div className="flex flex-col">
            <span className="font-bold text-2xl bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              ZOOT
            </span>
            <span className="text-xs font-medium text-gray-500 tracking-widest">
              DIGITAL
            </span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Image
        src="/zoot-digital-logo.png"
        alt="Zoot Digital"
        width={width}
        height={height}
        className="object-contain"
        onError={() => setImageError(true)}
        priority
      />
      {showText && (
        <div className="flex flex-col">
          <span className="font-bold text-2xl bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            ZOOT
          </span>
          <span className="text-xs font-medium text-gray-500 tracking-widest">
            DIGITAL
          </span>
        </div>
      )}
    </div>
  )
}