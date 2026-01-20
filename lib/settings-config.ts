import { User, Building2, LucideIcon } from "lucide-react"

export interface SettingsNavItem {
  href: string
  label: string
  icon: LucideIcon
}

export const settingsNavItems: SettingsNavItem[] = [
  {
    href: "/settings/profile",
    label: "Profile",
    icon: User,
  },
  {
    href: "/settings/accounts",
    label: "Accounts",
    icon: Building2,
  },
]
