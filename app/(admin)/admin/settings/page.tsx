"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Save, Store, Palette, Upload } from "lucide-react"

export default function BranchSettings() {
  const [storeName, setStoreName] = useState("Demo Restaurant")
  const [primaryColor, setPrimaryColor] = useState("#d4af37") // Default Gold
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = () => {
    setIsSaving(true)
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false)
      // Show success toast or similar
    }, 1000)
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto h-full animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold font-outfit text-white">Store Settings</h1>
          <p className="text-zinc-400 mt-1">Customize your brand and operational preferences.</p>
        </div>
        
        <Button 
          variant="primary" 
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-xl flex items-center gap-2"
        >
          <Save size={18} />
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Brand Information */}
        <Card className="bg-white/5 border-white/10 glass-panel">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Store className="text-primary-500" />
              <CardTitle>Brand Information</CardTitle>
            </div>
            <CardDescription>Update your store&apos;s public profile.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Store Name</label>
                <Input 
                  value={storeName} 
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="Enter store name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Contact Email</label>
                <Input type="email" placeholder="contact@restaurant.com" />
              </div>
            </div>

            <div className="space-y-2 pt-4">
              <label className="text-sm font-medium text-zinc-300 block">Store Logo</label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center">
                  <Store className="text-zinc-600 w-8 h-8" />
                </div>
                <Button variant="outline" className="h-10">
                  <Upload size={16} className="mr-2" /> Upload Logo
                </Button>
                <p className="text-xs text-zinc-500 max-w-[200px]">
                  Recommended size: 512x512px. PNG or JPG under 2MB.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Theme Customization */}
        <Card className="bg-white/5 border-white/10 glass-panel">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="text-primary-500" />
              <CardTitle>Theme Customization</CardTitle>
            </div>
            <CardDescription>Personalize the customer menu colors to match your brand.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="space-y-2 flex-1 max-w-[200px]">
                  <label className="text-sm font-medium text-zinc-300">Primary Brand Color</label>
                  <div className="flex items-center gap-3 bg-black/40 border border-white/10 p-2 rounded-xl">
                    <input 
                      type="color" 
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
                    />
                    <span className="font-mono text-sm text-zinc-300">{primaryColor.toUpperCase()}</span>
                  </div>
                </div>
                
                {/* Live Preview */}
                <div className="flex-1 border-l border-white/10 pl-8 ml-4">
                  <p className="text-sm font-medium text-zinc-400 mb-4">Live Preview</p>
                  <div className="flex gap-4">
                    <button 
                      className="px-6 py-2 rounded-lg font-medium shadow-lg transition-transform hover:scale-105"
                      style={{ backgroundColor: primaryColor, color: '#000' }}
                    >
                      Primary Button
                    </button>
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                      style={{ backgroundColor: `${primaryColor}33`, color: primaryColor, border: `1px solid ${primaryColor}66` }}
                    >
                      1
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
