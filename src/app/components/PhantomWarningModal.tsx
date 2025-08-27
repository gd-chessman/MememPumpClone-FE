"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { useLang } from "@/lang/useLang"
import Link from "next/link"

interface PhantomWarningModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function PhantomWarningModal({ isOpen, onClose }: PhantomWarningModalProps) {
  const { t } = useLang()

  // Close modal when Escape key is pressed
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        onClose()
      }
    }

    window.addEventListener("keydown", handleEscKey)
    return () => window.removeEventListener("keydown", handleEscKey)
  }, [isOpen, onClose])

  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "auto"
    }
    return () => {
      document.body.style.overflow = "auto"
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-70" />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-white dark:bg-[#1a1a1a] rounded-xl border-2 border-cyan-500 shadow-lg">
        {/* Header */}
        <div className="flex justify-between items-center py-4 px-6 pb-4">
          <h2 className="text-[18px] font-semibold text-cyan-400 mt-2">
            {t('phantomWarning.title')}
          </h2>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 space-y-4">
          <div className="text-center">
            <div className="mb-4">
              <img
                src="/phantom.png"
                alt="Phantom"
                className="w-12 h-12 mx-auto mb-3"
              />
            </div>
            <p className="text-black dark:text-neutral-100 text-sm leading-relaxed">
              {t('phantomWarning.message')}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="gap-3 pt-4 flex items-center justify-center">
            <Link href="/dashboard" className="px-4 py-2 rounded-full bg-gradient-to-t from-theme-primary-500 to-theme-secondary-400 text-theme-neutral-100 hover:from-theme-blue-100 hover:to-theme-blue-200 transition-all duration-500">
              {t('createCoin.maintenance.returnDashboard')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
} 