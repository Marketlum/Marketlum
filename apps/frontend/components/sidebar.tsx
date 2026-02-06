"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowLeftRight,
  BookOpen,
  Boxes,
  Diamond,
  FileSignature,
  FileText,
  FolderOpen,
  Globe,
  HandHeart,
  Landmark,
  Languages,
  Map,
  MessageSquare,
  Send,
  ShoppingCart,
  Users,
  UserCog,
  LifeBuoy,
  Radio,
  Search,
} from "lucide-react"

import { MarketlumSidebarMainMenu, type NavGroup } from "@/components/sidebar-main-menu"
import { MarketlumSidebarSecondaryMenu } from "@/components/sidebar-secondary-menu"
import { MarketlumSidebarUserMenu } from "@/components/sidebar-user-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Input } from "@/components/ui/input"

const data = {
  user: {
    name: "pjedrzejewski",
    email: "pawel@marketlum.com",
    avatar: "",
  },
  navGroups: [
    {
      label: "Market",
      items: [
        { title: "Value", url: "/value", icon: Diamond },
        { title: "Value Instances", url: "/value-instances", icon: Boxes },
        { title: "Agents", url: "/agents", icon: Users },
        { title: "Map", url: "/map", icon: Map },
        { title: "Exchanges", url: "/exchanges", icon: ArrowLeftRight },
        { title: "Offerings", url: "/offerings", icon: ShoppingCart },
        { title: "Agreements", url: "/agreements", icon: FileSignature },
        { title: "Invoices", url: "/invoices", icon: FileText },
        { title: "Ledger", url: "/ledger", icon: Landmark },
        { title: "Chat", url: "/chat", icon: MessageSquare },
      ],
    },
    {
      label: "Configuration",
      items: [
        { title: "Value Streams", url: "/value-streams", icon: HandHeart },
        { title: "Taxonomies", url: "/taxonomies", icon: BookOpen },
        { title: "Users", url: "/users", icon: UserCog },
        { title: "Files", url: "/files", icon: FolderOpen },
        { title: "Geography", url: "/geography", icon: Globe },
        { title: "Locales", url: "/locales", icon: Languages },
        { title: "Channels", url: "/channels", icon: Radio },
      ],
    },
  ] as NavGroup[],
  navSecondary: [
    {
      title: "Support",
      url: "/support",
      icon: LifeBuoy,
    },
    {
      title: "Feedback",
      url: "/feedback",
      icon: Send,
    },
  ],
}

export function MarketlumSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [searchQuery, setSearchQuery] = React.useState("")

  const filteredGroups = React.useMemo(() => {
    if (!searchQuery.trim()) return data.navGroups

    const query = searchQuery.toLowerCase()
    return data.navGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          item.title.toLowerCase().includes(query)
        ),
      }))
      .filter((group) => group.items.length > 0)
  }, [searchQuery])

  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg overflow-hidden">
                  <img src="/marketlum-logo.png" alt="Marketlum" className="size-8 object-cover" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-bold bg-gradient-to-r from-green-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">Marketlum</span>
                  <span className="truncate text-xs text-sidebar-foreground/70">Conscious market development</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="px-2 pb-2 group-data-[collapsible=icon]:hidden">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <MarketlumSidebarMainMenu groups={filteredGroups} />
        <MarketlumSidebarSecondaryMenu items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <MarketlumSidebarUserMenu user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
