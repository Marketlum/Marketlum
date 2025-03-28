"use client"
 
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"

import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { useState, FormEvent } from "react"
import { toast } from "sonner"

import { MarketlumValueStreamSelector } from "@/components/value-streams/selector"

import api from "@/lib/api-sdk"

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  purpose: z.string().optional(),
  parentId: z.string().optional(),
})

export function MarketlumValueStreamsForm(props) {
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  })

  const onSubmit = async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsLoading(true)

      console.log(values);
      await api.createValueStream({
        name: values.name,
        purpose: values.purpose,
        parentId: values.parentId,
      });
    } catch (error) {
        toast.error("Failed to create value stream.")
    } finally {
      setIsLoading(false)
        toast.success("Value stream created successfully.")
    }
      
      props.onFormSubmit();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Create a new value stream</CardTitle>
            <CardDescription>Starting a new team, virtual company or business line? Congrats!</CardDescription>
          </CardHeader>
          <CardContent>
            <div>
            <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Name of the new value stream" data-testid="form-name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}></FormField>
            </div>
            <br />
            <div>
            <FormField
            control={form.control}
            name="purpose"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Purpose</FormLabel>
                <FormControl>
                  <Textarea placeholder="The overall scope, potential, or deep intention the value stream will pursue or express." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}></FormField>
            </div>
            <br />
            <div>
            <FormField
            control={form.control}
            name="parentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Parent</FormLabel>
                <FormControl>
                  <MarketlumValueStreamSelector {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}></FormField>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button type="submit" data-testid="form-submit">{isLoading ? 'Creating...' : 'Create'}</Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}