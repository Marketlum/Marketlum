"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
});

export function AppTaxonomiesForm() {
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:3001/taxonomies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      console.log(JSON.stringify(data));

      if (!response.ok) throw new Error("Failed to submit");

      toast({ title: "Success!", description: "User created successfully." });
    } catch (error) {
      toast({ title: "Error", description: "Submission failed.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Input {...register("name")} placeholder="Your Name" />
        {errors.name && <p className="text-red-500">{errors.name.message}</p>}
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? "Submitting..." : "Submit"}
      </Button>
    </form>
  );
}
