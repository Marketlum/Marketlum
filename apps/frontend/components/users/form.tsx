"use client";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SingleFilePicker } from "@/components/files/single-file-picker";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import axios from "axios";

import api from "@/lib/api-sdk";
import { User } from "./types";
import { FileUpload } from "@/components/files/types";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }).max(128).optional().or(z.literal("")),
  isActive: z.boolean(),
  agentId: z.string().min(1, { message: "Please select an agent." }),
  defaultLocaleId: z.string().min(1, { message: "Please select a default locale." }),
  relationshipAgreementId: z.string().optional(),
  avatarFileId: z.string().optional(),
  birthday: z.string().optional(),
  joinedAt: z.string().optional(),
  leftAt: z.string().optional(),
});

type Agent = {
  id: string;
  name: string;
};

type Locale = {
  id: string;
  code: string;
};

type Agreement = {
  id: string;
  title: string;
};

type UserFormProps = {
  user?: User;
  onFormSubmit: () => void;
};

export function UserForm({ user, onFormSubmit }: UserFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [locales, setLocales] = useState<Locale[]>([]);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [avatarFile, setAvatarFile] = useState<FileUpload | null>(null);
  const isEditing = !!user;

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: user?.email || "",
      password: "",
      isActive: user?.isActive ?? true,
      agentId: user?.agentId || "",
      defaultLocaleId: user?.defaultLocaleId || "",
      relationshipAgreementId: user?.relationshipAgreementId || "",
      avatarFileId: user?.avatarFileId || "",
      birthday: user?.birthday?.split("T")[0] || "",
      joinedAt: user?.joinedAt?.split("T")[0] || "",
      leftAt: user?.leftAt?.split("T")[0] || "",
    },
  });

  useEffect(() => {
    // Fetch agents
    api.getAgents(1, 100).then((data) => setAgents(data.items || []));

    // Fetch locales
    api.getLocales({ page: 1, pageSize: 100 }).then((data) => setLocales(data.data || []));

    // Fetch agreements
    api.getAgreements({ page: 1, limit: 100 }).then((data) => setAgreements(data.items || []));
  }, []);

  useEffect(() => {
    if (user?.avatarFile) {
      setAvatarFile(user.avatarFile as any);
    }
  }, [user]);

  const onSubmit = async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsLoading(true);

      if (isEditing) {
        const updateData: any = {
          email: values.email,
          isActive: values.isActive,
          agentId: values.agentId,
          defaultLocaleId: values.defaultLocaleId,
          relationshipAgreementId: values.relationshipAgreementId || null,
          avatarFileId: avatarFile?.id || null,
          birthday: values.birthday || null,
          joinedAt: values.joinedAt || null,
          leftAt: values.leftAt || null,
        };

        await api.updateUser(user.id, updateData);
        toast.success("User updated successfully.");
      } else {
        if (!values.password) {
          toast.error("Password is required for new users.");
          return;
        }

        await api.createUser({
          email: values.email,
          password: values.password,
          isActive: values.isActive,
          agentId: values.agentId,
          defaultLocaleId: values.defaultLocaleId,
          relationshipAgreementId: values.relationshipAgreementId || undefined,
          avatarFileId: avatarFile?.id || undefined,
          birthday: values.birthday || undefined,
          joinedAt: values.joinedAt || undefined,
          leftAt: values.leftAt || undefined,
        });
        toast.success("User created successfully.");
      }

      onFormSubmit();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 409) {
          toast.error(error.response.data.message || "Email or agent already in use.");
        } else {
          toast.error(error.response?.data?.message || (isEditing ? "Failed to update user." : "Failed to create user."));
        }
      } else {
        toast.error(isEditing ? "Failed to update user." : "Failed to create user.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Avatar Section */}
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            {avatarFile ? (
              <AvatarImage
                src={`${apiBaseUrl}/files/${avatarFile.id}/thumbnail`}
                alt="Avatar"
              />
            ) : null}
            <AvatarFallback>{getInitials(form.watch("email") || "US")}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <FormLabel>Avatar</FormLabel>
            <SingleFilePicker
              value={avatarFile}
              onChange={setAvatarFile}
              accept="image/*"
            />
          </div>
        </div>

        {/* Email & Password */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="user@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{isEditing ? "Password (leave blank to keep current)" : "Password"}</FormLabel>
                <FormControl>
                  <Input type="password" placeholder={isEditing ? "••••••••" : "At least 8 characters"} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Agent & Locale */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="agentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Agent</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an agent" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>Each user must be linked to an agent.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="defaultLocaleId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Default Locale</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a locale" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {locales.map((locale) => (
                      <SelectItem key={locale.id} value={locale.id}>
                        {locale.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Relationship Agreement */}
        <FormField
          control={form.control}
          name="relationshipAgreementId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Relationship Agreement (Optional)</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(value === "__none__" ? "" : value)}
                value={field.value || "__none__"}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an agreement" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {agreements.map((agreement) => (
                    <SelectItem key={agreement.id} value={agreement.id}>
                      {agreement.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Dates */}
        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="birthday"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Birthday</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="joinedAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Joined At</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="leftAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Left At</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Active Status */}
        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Active</FormLabel>
                <FormDescription>
                  Inactive users cannot log in to the system.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading
              ? isEditing
                ? "Updating..."
                : "Creating..."
              : isEditing
              ? "Update User"
              : "Create User"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
