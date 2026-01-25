import { UserIcon, BuildingsIcon, Icon } from "@phosphor-icons/react"

export type PhosphorIcon = Icon

export interface SettingsNavItem {
  href: string
  label: string
  icon: PhosphorIcon
}

export const settingsNavItems: SettingsNavItem[] = [
  {
    href: "/settings/profile",
    label: "Profile",
    icon: UserIcon,
  },
  {
    href: "/settings/accounts",
    label: "Accounts",
    icon: BuildingsIcon,
  },
]
