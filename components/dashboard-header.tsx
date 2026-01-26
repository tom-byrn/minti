"use client"

import { useState, useEffect } from "react"
import { List as ListIcon, MagnifyingGlass as MagnifyingGlassIcon, Gear as GearIcon, ChatCircle as ChatCircleIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAIPopup } from "./ai-popup-provider"
import { useTransactionSearch } from "./transaction-search-provider"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { settingsNavItems } from "@/lib/settings-config"
import { createClient } from "@/lib/supabase/client"
import type { UserProfile } from "@/lib/database.types"

const navLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/accounts", label: "Accounts" },
  { href: "/analytics", label: "Analytics" },
  { href: "/budget", label: "Budget" },
  { href: "/goals", label: "Goals" },
  { href: "/subscriptions", label: "Subscriptions" },
  { href: "/ai", label: "AI Assistant" },
]

export function DashboardHeader() {
  const { togglePopup } = useAIPopup()
  const { openSearch } = useTransactionSearch()
  const pathname = usePathname()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [email, setEmail] = useState("")

  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        setEmail(user.email || "")
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", user.id)
          .single()

        if (profile) {
          setProfile(profile)
        }
      }
    }

    fetchProfile()
  }, [])

  const getInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase()
    }
    if (profile?.first_name) {
      return profile.first_name[0].toUpperCase()
    }
    if (email) {
      return email[0].toUpperCase()
    }
    return "U"
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-card shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 lg:px-8">
        {/* Logo and Navigation */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 group">
            <svg
              viewBox="0 0 32 32"
              className="h-9 w-9 group-hover:opacity-90 transition-opacity"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="32" height="32" rx="8" fill="#7DB87D"/>
              <text x="16" y="24" textAnchor="middle" fontFamily="Georgia, 'PT Serif', serif" fontSize="22" fontWeight="600" fill="white">M</text>
            </svg>
            <span className="text-xl font-serif font-semibold text-foreground">Minti</span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            {navLinks.map((link) => {
              const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-base font-medium transition-colors hover:text-primary/80 relative ${
                    isActive
                      ? "text-primary after:absolute after:bottom-[-4px] after:left-0 after:right-0 after:h-0.5 after:bg-primary after:rounded-full"
                      : "text-muted-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Search and Actions */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={openSearch}
            className="hidden md:flex w-64 justify-start text-muted-foreground bg-background/50 border-border/50 hover:bg-background"
          >
            <MagnifyingGlassIcon className="mr-2 h-4 w-4" weight="thin" />
            <span className="flex-1 text-left">Search transactions...</span>
            <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>

          <Button variant="ghost" size="icon" onClick={togglePopup} className="hover:bg-primary/10 hover:text-primary rounded-xl">
            <ChatCircleIcon className="h-5 w-5" weight="thin" />
          </Button>

          <Link href="/settings">
            <Button variant="ghost" size="icon" className="hover:bg-primary/10 hover:text-primary rounded-xl">
              <GearIcon className="h-5 w-5" weight="thin" />
            </Button>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={profile?.avatar_url || ""} alt="User" />
                  <AvatarFallback className="bg-primary/10 text-primary">{getInitials()}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {settingsNavItems.map((item) => {
                const Icon = item.icon
                return (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link href={item.href} className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                )
              })}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <form action="/auth/signout" method="post">
                  <button type="submit" className="w-full text-left">Log out</button>
                </form>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="icon" className="md:hidden">
            <ListIcon className="h-5 w-5" weight="thin" />
          </Button>
        </div>
      </div>
    </header>
  )
}
