"use client"

import { useState, useEffect, useRef } from "react"
import { User as UserIcon, Camera as CameraIcon, SpinnerGap as SpinnerGapIcon } from "@phosphor-icons/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import type { UserProfile } from "@/lib/database.types"

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [dateOfBirth, setDateOfBirth] = useState("")

  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        setEmail(user.email || "")

        // Fetch or create profile
        let { data: profile, error } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", user.id)
          .single()

        if (error && error.code === "PGRST116") {
          // Profile doesn't exist, create it
          const { data: newProfile } = await supabase
            .from("user_profiles")
            .insert({ id: user.id })
            .select()
            .single()
          profile = newProfile
        }

        if (profile) {
          setProfile(profile)
          setFirstName(profile.first_name || "")
          setLastName(profile.last_name || "")
          setDateOfBirth(profile.date_of_birth || "")
        }
      }
      setLoading(false)
    }

    fetchProfile()
  }, [])

  const handleSave = async () => {
    if (!profile) return

    setSaving(true)

    const supabase = createClient()
    const { error } = await supabase
      .from("user_profiles")
      .update({
        first_name: firstName || null,
        last_name: lastName || null,
        date_of_birth: dateOfBirth || null,
      })
      .eq("id", profile.id)

    if (error) {
      toast.error("Failed to save profile")
    } else {
      setProfile({
        ...profile,
        first_name: firstName || null,
        last_name: lastName || null,
        date_of_birth: dateOfBirth || null,
      })
      toast.success("Profile saved successfully")
    }

    setSaving(false)
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !profile) return

    setUploading(true)

    const supabase = createClient()
    const fileExt = file.name.split(".").pop()
    const filePath = `${profile.id}/avatar.${fileExt}`

    // Upload file to storage
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      toast.error("Failed to upload image")
      setUploading(false)
      return
    }

    // Get public URL with cache-busting timestamp
    const { data: { publicUrl } } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath)

    const avatarUrlWithCacheBust = `${publicUrl}?t=${Date.now()}`

    // Update profile with avatar URL
    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({ avatar_url: avatarUrlWithCacheBust })
      .eq("id", profile.id)

    if (updateError) {
      toast.error("Failed to update profile")
    } else {
      setProfile({ ...profile, avatar_url: avatarUrlWithCacheBust })
      toast.success("Profile picture updated")
    }

    // Reset file input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }

    setUploading(false)
  }

  const getInitials = () => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase()
    }
    if (firstName) {
      return firstName[0].toUpperCase()
    }
    if (email) {
      return email[0].toUpperCase()
    }
    return "U"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <SpinnerGapIcon className="h-8 w-8 animate-spin text-muted-foreground" weight="thin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-semibold mb-2">Profile</h2>
        <p className="text-muted-foreground">Manage your account information</p>
      </div>

      <Card className="border-border/50 bg-card/80 backdrop-blur shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <UserIcon className="h-5 w-5 text-primary" weight="thin" />
            </div>
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Profile Picture */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile?.avatar_url || ""} alt="Profile" />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <SpinnerGapIcon className="h-4 w-4 animate-spin" weight="thin" />
                ) : (
                  <CameraIcon className="h-4 w-4" weight="thin" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
            <div>
              <p className="font-medium">Profile Picture</p>
              <p className="text-sm text-muted-foreground">
                Click the camera icon to upload a new photo
              </p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter your first name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter your last name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Date of Birth</Label>
            <Input
              id="dateOfBirth"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              disabled
              className="bg-muted/50"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed
            </p>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            {saving ? (
              <>
                <SpinnerGapIcon className="mr-2 h-4 w-4 animate-spin" weight="thin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
