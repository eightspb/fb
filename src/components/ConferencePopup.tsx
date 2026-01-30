"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import Link from "next/link"
import { Calendar, MapPin } from "lucide-react"

export function ConferencePopup() {
  const [open, setOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    // Check if the user has already seen the popup
    const hasSeenPopup = localStorage.getItem("conference_popup_seen_v3")
    
    if (!hasSeenPopup) {
      // Show popup after a short delay
      const timer = setTimeout(() => {
        setOpen(true)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleOpenChange = (open: boolean) => {
    if (!open) {
        // When closing, mark as seen
        localStorage.setItem("conference_popup_seen_v3", "true")
    }
    setOpen(open)
  }

  if (!isMounted) return null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-teal-900">Приглашаем на конференцию!</DialogTitle>
          <DialogDescription className="pt-2">
            Не пропустите главное событие года в области вакуумной аспирационной биопсии.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
            <div className="rounded-lg bg-teal-50 p-4 border border-teal-100">
                <div className="mb-3">
                    <p className="text-xs font-bold text-teal-600 uppercase tracking-wider mb-1">III Научно-практическая конференция</p>
                    <h3 className="font-bold text-lg text-slate-900 leading-snug">
                        Миниинвазивная хирургия / Молочная железа
                    </h3>
                </div>
                <div className="flex items-center gap-2 text-slate-600 mb-1">
                    <Calendar className="h-4 w-4 text-teal-600" />
                    <span>25 апреля 2026</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                    <MapPin className="h-4 w-4 text-teal-600" />
                    <span>Москва, МКНЦ им. Логинова</span>
                </div>
            </div>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button asChild className="w-full bg-teal-600 hover:bg-teal-700 text-white">
            <Link href="/conferences/sms3">
              Перейти к регистрации
            </Link>
          </Button>
          <Button variant="ghost" onClick={() => handleOpenChange(false)} className="w-full text-slate-500">
            Закрыть
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

