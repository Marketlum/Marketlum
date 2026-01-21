"use client"

import * as React from "react"
import {
  BookOpen,
  Command,
  Diamond,
  HandHeart,
  Send,
  Users,
  LifeBuoy,
  Radio,
} from "lucide-react"

import { MarketlumSidebarMainMenu } from "@/components/sidebar-main-menu"
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

const data = {
  user: {
    name: "pjedrzejewski",
    email: "pawel@marketlum.com",
    avatar: "",
  },
  navMain: [
    {
      title: "Value",
      url: "/value",
      icon: Diamond,
    },
    {
      title: "Agents",
      url: "/agents",
      icon: Users,
    },
    {
      title: "Taxonomies",
      url: "/taxonomies",
      icon: BookOpen,
    },
    {
      title: "Value Streams",
      url: "/value-streams",
      icon: HandHeart,
    },
    {
      title: "Channels",
      url: "/channels",
      icon: Radio,
    },
  ],
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
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Acme Inc.</span>
                  <span className="truncate text-xs">Serve as an example market</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <MarketlumSidebarMainMenu items={data.navMain} />
        <MarketlumSidebarSecondaryMenu items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <MarketlumSidebarUserMenu user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
