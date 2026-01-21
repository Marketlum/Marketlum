"use client"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { useState } from "react"
import { toast } from "sonner"

import api from "@/lib/api-sdk"
import { LocaleFlag } from "./locale-flag"

// Comprehensive list of common locale codes
const AVAILABLE_LOCALES = [
  { code: "en-US", name: "English (United States)" },
  { code: "en-GB", name: "English (United Kingdom)" },
  { code: "en-AU", name: "English (Australia)" },
  { code: "en-CA", name: "English (Canada)" },
  { code: "en-IE", name: "English (Ireland)" },
  { code: "en-NZ", name: "English (New Zealand)" },
  { code: "pl-PL", name: "Polish (Poland)" },
  { code: "de-DE", name: "German (Germany)" },
  { code: "de-AT", name: "German (Austria)" },
  { code: "de-CH", name: "German (Switzerland)" },
  { code: "fr-FR", name: "French (France)" },
  { code: "fr-BE", name: "French (Belgium)" },
  { code: "fr-CA", name: "French (Canada)" },
  { code: "fr-CH", name: "French (Switzerland)" },
  { code: "es-ES", name: "Spanish (Spain)" },
  { code: "es-MX", name: "Spanish (Mexico)" },
  { code: "es-AR", name: "Spanish (Argentina)" },
  { code: "it-IT", name: "Italian (Italy)" },
  { code: "pt-PT", name: "Portuguese (Portugal)" },
  { code: "pt-BR", name: "Portuguese (Brazil)" },
  { code: "nl-NL", name: "Dutch (Netherlands)" },
  { code: "nl-BE", name: "Dutch (Belgium)" },
  { code: "ru-RU", name: "Russian (Russia)" },
  { code: "ja-JP", name: "Japanese (Japan)" },
  { code: "ko-KR", name: "Korean (South Korea)" },
  { code: "zh-CN", name: "Chinese (Simplified, China)" },
  { code: "zh-TW", name: "Chinese (Traditional, Taiwan)" },
  { code: "zh-HK", name: "Chinese (Hong Kong)" },
  { code: "ar-SA", name: "Arabic (Saudi Arabia)" },
  { code: "ar-AE", name: "Arabic (UAE)" },
  { code: "ar-EG", name: "Arabic (Egypt)" },
  { code: "hi-IN", name: "Hindi (India)" },
  { code: "tr-TR", name: "Turkish (Turkey)" },
  { code: "sv-SE", name: "Swedish (Sweden)" },
  { code: "da-DK", name: "Danish (Denmark)" },
  { code: "fi-FI", name: "Finnish (Finland)" },
  { code: "no-NO", name: "Norwegian (Norway)" },
  { code: "cs-CZ", name: "Czech (Czech Republic)" },
  { code: "sk-SK", name: "Slovak (Slovakia)" },
  { code: "hu-HU", name: "Hungarian (Hungary)" },
  { code: "ro-RO", name: "Romanian (Romania)" },
  { code: "bg-BG", name: "Bulgarian (Bulgaria)" },
  { code: "uk-UA", name: "Ukrainian (Ukraine)" },
  { code: "el-GR", name: "Greek (Greece)" },
  { code: "he-IL", name: "Hebrew (Israel)" },
  { code: "th-TH", name: "Thai (Thailand)" },
  { code: "vi-VN", name: "Vietnamese (Vietnam)" },
  { code: "id-ID", name: "Indonesian (Indonesia)" },
  { code: "ms-MY", name: "Malay (Malaysia)" },
]

const formSchema = z.object({
  code: z.string().min(1, { message: "Please select a locale." }),
})

type LocaleFormProps = {
  locale?: { id: string; code: string }
  onFormSubmit: () => void
}

export function LocaleForm({ locale, onFormSubmit }: LocaleFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const isEditing = !!locale

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: locale?.code || "",
    },
  })

  const onSubmit = async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsLoading(true)

      if (isEditing) {
        await api.updateLocale(locale.id, { code: values.code })
        toast.success("Locale updated successfully.")
      } else {
        await api.createLocale({ code: values.code })
        toast.success("Locale created successfully.")
      }

      onFormSubmit()
    } catch (error: unknown) {
      const axiosError = error as { response?: { status?: number } };
      if (axiosError?.response?.status === 409) {
        toast.error("Locale code already exists.")
      } else {
        toast.error(isEditing ? "Failed to update locale." : "Failed to create locale.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Locale</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="locale-form-code">
                    <SelectValue placeholder="Select a locale" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="max-h-[300px]">
                  {AVAILABLE_LOCALES.map((loc) => (
                    <SelectItem key={loc.code} value={loc.code}>
                      <div className="flex items-center gap-2">
                        <LocaleFlag code={loc.code} className="text-base" />
                        <span>{loc.name}</span>
                        <span className="text-muted-foreground font-mono text-xs">({loc.code})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
          <Button type="submit" data-testid="locale-form-submit">
            {isLoading ? (isEditing ? "Updating..." : "Creating...") : (isEditing ? "Update" : "Create")}
          </Button>
        </div>
      </form>
    </Form>
  )
}
