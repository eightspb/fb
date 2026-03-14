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
import { Conference } from "@/lib/types/conference"
import {
  formatConferenceDateRange,
  getConferenceDateSortKey,
  isConferenceUpcoming,
} from "@/lib/conference-date"

export function ConferencePopup() {
  const [open, setOpen] = useState(false)
  const [conference, setConference] = useState<Conference | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadUpcomingConference() {
      try {
        const response = await fetch('/api/conferences?status=published')
        if (response.ok) {
          const data: Conference[] = await response.json()

          const upcoming = data
            .filter((c) => isConferenceUpcoming(c.date, c.date_end))
            .sort((a, b) => getConferenceDateSortKey(a.date) - getConferenceDateSortKey(b.date))
            .slice(0, 1) // Берем только ближайшую

          if (upcoming.length > 0) {
            setConference(upcoming[0])
          }
        }
      } catch (error) {
        console.error('Failed to load upcoming conference:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadUpcomingConference()
  }, [])

  useEffect(() => {
    // Показываем попап только если есть опубликованное предстоящее мероприятие
    if (!loading && conference) {
      // Проверяем, видел ли пользователь попап для этого мероприятия
      const popupKey = `conference_popup_seen_${conference.id}`
      const hasSeenPopup = localStorage.getItem(popupKey)
      
      if (!hasSeenPopup) {
        // Показываем попап после небольшой задержки
        const timer = setTimeout(() => {
          setOpen(true)
        }, 2000)
        return () => clearTimeout(timer)
      }
    }
  }, [loading, conference])

  const handleOpenChange = (open: boolean) => {
    if (!open && conference) {
      // При закрытии отмечаем, что пользователь видел попап для этого мероприятия
      const popupKey = `conference_popup_seen_${conference.id}`
      localStorage.setItem(popupKey, "true")
    }
    setOpen(open)
  }

  // Не показываем попап если нет предстоящих мероприятий
  if (!conference) {
    return null
  }

  const conferenceUrl = conference.slug 
    ? `/conferences/${conference.slug}` 
    : `/conferences/${conference.id}`

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-teal-900">Приглашаем на мероприятие!</DialogTitle>
          <DialogDescription className="pt-2">
            Не пропустите предстоящее событие в области вакуумной аспирационной биопсии.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
            <div className="rounded-lg bg-teal-50 p-4 border border-teal-100">
                <div className="mb-3">
                    {conference.type && (
                      <p className="text-xs font-bold text-teal-600 uppercase tracking-wider mb-1">
                        {conference.type}
                      </p>
                    )}
                    <h3 className="font-bold text-lg text-slate-900 leading-snug">
                        {conference.title}
                    </h3>
                </div>
                <div className="flex items-center gap-2 text-slate-600 mb-1">
                    <Calendar className="h-4 w-4 text-teal-600" />
                    <span>{formatConferenceDateRange(conference.date, conference.date_end)}</span>
                </div>
                {conference.location && (
                  <div className="flex items-center gap-2 text-slate-600">
                      <MapPin className="h-4 w-4 text-teal-600" />
                      <span>{conference.location}</span>
                  </div>
                )}
            </div>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button asChild className="w-full bg-teal-600 hover:bg-teal-700 text-white">
            <Link href={conferenceUrl}>
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
