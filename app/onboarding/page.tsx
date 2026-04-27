"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const YEAR_OPTIONS = ["Freshman", "Sophomore", "Junior", "Senior", "Master's", "PhD", "Other"];

export default function OnboardingPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    school: "",
    major: "",
    year: "",
    bio: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { error } = await supabase
      .from("users")
      .update({ ...form, onboarded: true } as never)
      .eq("id", user.id);

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard/professors");
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ backgroundColor: "#0a0a0a" }}
    >
      <div className="w-full max-w-md">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Set up your profile</h1>
          <p className="mt-1 text-sm text-white/40">
            This helps the AI personalize your emails.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
        >
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-white/70">Full name</Label>
            <Input
              id="name"
              placeholder="Alex Johnson"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="school" className="text-white/70">School</Label>
              <Input
                id="school"
                placeholder="MIT"
                value={form.school}
                onChange={(e) => update("school", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="year" className="text-white/70">Year</Label>
              <Select
                id="year"
                value={form.year}
                onChange={(e) => update("year", e.target.value)}
                required
              >
                <option value="" disabled>Select year</option>
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="major" className="text-white/70">Major</Label>
            <Input
              id="major"
              placeholder="Computer Science"
              value={form.major}
              onChange={(e) => update("major", e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bio" className="text-white/70">
              Short bio{" "}
              <span className="text-white/30">(used in emails)</span>
            </Label>
            <Textarea
              id="bio"
              rows={3}
              placeholder="I'm a junior studying CS with a focus on ML. I've built two small research projects on NLP and want to go deeper in the field."
              value={form.bio}
              onChange={(e) => update("bio", e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Saving…" : "Continue to professors →"}
          </Button>
        </form>
      </div>
    </div>
  );
}
