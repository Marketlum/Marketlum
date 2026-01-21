"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const pathLabels: Record<string, string> = {
  "": "Home",
  "value": "Value",
  "value-streams": "Value Streams",
  "geography": "Geography",
  "taxonomies": "Taxonomies",
  "agreements": "Agreements",
  "channels": "Channels",
  "agents": "Agents",
  "users": "Users",
  "files": "Files",
  "ledger": "Ledger",
  "locales": "Locales",
  "map": "Map",
  "login": "Login",
  "forgot-password": "Forgot Password",
  "reset-password": "Reset Password",
  "support": "Support",
  "feedback": "Feedback",
};

function getLabel(segment: string): string {
  return pathLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
}

export function BreadcrumbNav() {
  const pathname = usePathname();

  // Don't show breadcrumbs on auth pages
  if (pathname === "/login" || pathname === "/forgot-password" || pathname === "/reset-password") {
    return null;
  }

  const segments = pathname.split("/").filter(Boolean);

  // If on home page, just show "Home"
  if (segments.length === 0) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Home</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/">Home</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {segments.map((segment, index) => {
          const href = "/" + segments.slice(0, index + 1).join("/");
          const isLast = index === segments.length - 1;
          const label = getLabel(segment);

          return (
            <span key={href} className="contents">
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={href}>{label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </span>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
