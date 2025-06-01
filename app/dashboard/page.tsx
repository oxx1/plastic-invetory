"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Plus, Minus, Eye, RotateCcw, Upload, Download, Search, LogOut, Quote, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { MobileItemView } from "@/components/mobile-item-view"

interface InventoryItem {
  id: string
  artikel: string
  lagerplats1: string
  lagerplats2?: string
  status1: "Grön" | "Röd"
  status2: "Grön" | "Röd" | ""
  lager1: number
  lager2: number
  streckkod?: string
}

interface LogEntry {
  id: string
  timestamp: string
  artikel: string
  location: string
  operation: "add" | "remove"
  previousstock: number // Changed from previousStock
  newstock: number // Changed from newStock
  user?: string
}

export default function Dashboard() {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [showLocationDialog, setShowLocationDialog] = useState(false)
  const [showEmptyDialog, setShowEmptyDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [operationType, setOperationType] = useState<"add" | "remove">("add")
  const [selectedLocation, setSelectedLocation] = useState<string>("")
  const [importData, setImportData] = useState("")
  const [log, setLog] = useState<LogEntry[]>([])
  const [showLogDialog, setShowLogDialog] = useState(false)
  const [logo, setLogo] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showMobileDetail, setShowMobileDetail] = useState(false)
  const [showQuoteDialog, setShowQuoteDialog] = useState(false)
  const [showClearDialog, setShowClearDialog] = useState(false) // Declare showClearDialog

  const quotes = [
    "The best time to check your inventory was 20 years ago. The second best time is now.",
    "Success is not final, stockout is not fatal: it is the courage to reorder that counts.",
    "The only way to do great logistics is to love what you move.",
    "Innovation distinguishes between a warehouse leader and a follower.",
    "Quality plastic is not an accident. It is always the result of high temperature.",
    "The future belongs to those who believe in the beauty of their supply chains.",
    "Excellence is never an accident in molding. It is always the result of high injection pressure.",
    "Plastic is fantastic when managed responsibly!",
    "Organization is the key to warehouse efficiency.",
    "Every logistics expert was once a beginner with a clipboard.",
    "To be or not to be in stock, that is the question.",
    "I have a dream that one day all pallets will be stacked equally.",
    "Ask not what your warehouse can do for you, ask what you can do for your warehouse.",
    "Float like a forklift, sting like a barcode scanner.",
    "I think, therefore I am... out of stock.",
    "Give me liberty, or give me better inventory tracking!",
    "Houston, we have a logistics problem.",
    "May the forks be with you.",
    "I'll be back... with more plastic pellets.",
    "Show me the inventory!",
    "Frankly my dear, I don't give a pallet.",
    "Here's looking at you, SKU.",
    "You can't handle the truth... about our lead times!",
    "Life is like a box of plastic parts, you never know what you're gonna mold.",
    "Keep your friends close, but your suppliers closer.",
    "The plastic will set you free... from metal alternatives.",
    "With great inventory comes great responsibility.",
    "I see dead stock... everywhere.",
    "Nobody puts plastic in a corner.",
    "You had me at 'free shipping'.",
    "E.T. phone warehouse.",
    "I feel the need... the need for speed in delivery!",
    "Say hello to my little friend... the injection molding machine.",
    "There's no place like the warehouse.",
    "I'm gonna make him an offer he can't refuse... bulk discount.",
    "Plastic, plastic everywhere, but not a drop to waste.",
    "It was the best of stock, it was the worst of stock.",
    "Call me Ishmael... Inventory Manager.",
    "It is a truth universally acknowledged that a warehouse in possession of good stock must be in want of more space.",
    "All happy warehouses are alike; each unhappy warehouse is out of stock in its own way.",
    "To infinity and beyond... our storage capacity!",
    "The force is strong with this supply chain.",
    "Winter is coming... better stock up on heating pellets.",
    "That's one small step for man, one giant leap for logistics.",
    "We choose to go to the warehouse not because it is easy, but because it is necessary.",
    "The only thing we have to fear is stockout itself.",
    "Four score and seven pallets ago...",
    "Mr. Gorbachev, tear down this warehouse wall!",
    "I have nothing to offer but blood, toil, tears and plastic.",
    "Never, never, never give up... on finding that missing SKU.",
  ]

  const { toast } = useToast()
  const router = useRouter()
  const { user, logout } = useAuth()

  // Load data from Supabase on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)

        // Fetch inventory data
        const { data: inventoryData, error: inventoryError } = await supabase.from("inventory").select("*")

        if (inventoryError) throw inventoryError

        if (inventoryData && inventoryData.length > 0) {
          setInventory(inventoryData)
          setFilteredInventory(inventoryData)
        }

        // Fetch log data
        const { data: logData, error: logError } = await supabase
          .from("logs")
          .select("*")
          .order("timestamp", { ascending: false })

        if (logError) throw logError

        if (logData) {
          setLog(logData)
        }

        // Fetch logo
        const { data: logoData } = await supabase.from("settings").select("value").eq("key", "company_logo").single()

        if (logoData) {
          setLogo(logoData.value)
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        toast({
          title: "Error loading data",
          description: "Could not load inventory data. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [toast])

  // Filter inventory based on search term
  useEffect(() => {
    if (searchTerm) {
      const filtered = inventory.filter(
        (item) =>
          item.artikel.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.lagerplats1.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.lagerplats2 && item.lagerplats2.toLowerCase().includes(searchTerm.toLowerCase())),
      )
      setFilteredInventory(filtered)
    } else {
      setFilteredInventory(inventory)
    }
  }, [searchTerm, inventory])

  // Update stock in Supabase
  const updateStock = useCallback(
    async (itemId: string, change: number, location: string) => {
      try {
        // Find the item to update
        const item = inventory.find((i) => i.id === itemId)
        if (!item) return

        let previousStock = 0
        let newStock = 0
        let updatedItem = { ...item }

        if (location === item.lagerplats1) {
          previousStock = item.lager1
          newStock = Math.max(0, item.lager1 + change)
          updatedItem = {
            ...item,
            lager1: newStock,
            status1: newStock > 0 ? "Grön" : "Röd",
          }
        } else if (location === item.lagerplats2) {
          previousStock = item.lager2
          newStock = Math.max(0, item.lager2 + change)
          updatedItem = {
            ...item,
            lager2: newStock,
            status2: newStock > 0 ? "Grön" : "Röd",
          }
        }

        // Update local state FIRST for immediate UI feedback
        setInventory((prev) => prev.map((i) => (i.id === itemId ? updatedItem : i)))

        // Update the item in Supabase
        const { error: updateError } = await supabase.from("inventory").update(updatedItem).eq("id", itemId)

        if (updateError) {
          // If database update fails, revert the local state
          setInventory((prev) => prev.map((i) => (i.id === itemId ? item : i)))
          throw updateError
        }

        // Create log entry (matching database column names)
        const logEntry = {
          id: Date.now().toString() + Math.random(),
          timestamp: new Date().toISOString(),
          artikel: item.artikel,
          location: location,
          operation: change > 0 ? "add" : "remove",
          previousstock: previousStock,
          newstock: newStock,
          user: user?.username,
        }

        // Add log entry to Supabase
        const { error: logError } = await supabase.from("logs").insert(logEntry)

        if (logError) {
          console.error("Log error:", logError)
          // Don't revert inventory change if only logging fails
        }

        // Update local log state
        setLog((prev) => [logEntry, ...prev])

        toast({
          title: change > 0 ? "Stock added" : "Stock removed",
          description: `${item.artikel} at ${location} updated successfully.`,
        })
      } catch (error) {
        console.error("Error updating stock:", error)
        toast({
          title: "Error updating stock",
          description: "Could not update inventory. Please try again.",
          variant: "destructive",
        })
      }
    },
    [inventory, user, toast],
  )

  const handleStockOperation = (item: InventoryItem, operation: "add" | "remove") => {
    setSelectedItem(item)
    setOperationType(operation)

    if (item.lagerplats2 && item.lagerplats2.trim()) {
      setShowLocationDialog(true)
    } else {
      setSelectedLocation(item.lagerplats1)
      setShowLocationDialog(true)
    }
  }

  const getEmptyItems = () => {
    return inventory.filter(
      (item) =>
        (item.lager1 === 0 && item.lagerplats1) ||
        (item.lager2 === 0 && item.lagerplats2 && item.lagerplats2.trim() !== ""),
    )
  }

  const refreshData = async () => {
    try {
      setIsLoading(true)

      const { data, error } = await supabase.from("inventory").select("*")

      if (error) throw error

      if (data) {
        setInventory(data)
        setFilteredInventory(data)
        toast({
          title: "Data refreshed",
          description: "Inventory data has been refreshed.",
        })
      }
    } catch (error) {
      console.error("Error refreshing data:", error)
      toast({
        title: "Error refreshing data",
        description: "Could not refresh inventory data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const exportToCSV = () => {
    const headers = [
      "Artikel",
      "Lagerplats 1",
      "Status 1",
      "Lager 1",
      "Lagerplats 2",
      "Status 2",
      "Lager 2",
      "Streckkod",
    ]
    const csvContent = [
      headers.join(","),
      ...inventory.map((item) =>
        [
          item.artikel,
          item.lagerplats1,
          item.status1,
          item.lager1,
          item.lagerplats2 || "",
          item.status2 || "",
          item.lager2 || 0,
          item.streckkod || "",
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "inventory.csv"
    a.click()
    window.URL.revokeObjectURL(url)

    toast({
      title: "Export successful",
      description: "Inventory data has been exported to CSV.",
    })
  }

  const copyLogToClipboard = async () => {
    const headers = ["Timestamp", "Artikel", "Location", "Operation", "Previous Stock", "New Stock", "User"]
    const csvContent = [
      headers.join(","),
      ...log.map((entry) =>
        [
          new Date(entry.timestamp).toLocaleString(),
          entry.artikel,
          entry.location,
          entry.operation,
          entry.previousstock,
          entry.newstock,
          entry.user || "",
        ].join(","),
      ),
    ].join("\n")

    try {
      await navigator.clipboard.writeText(csvContent)
      toast({
        title: "Log copied to clipboard",
        description: "Log data has been copied to your clipboard as CSV format.",
      })
    } catch (error) {
      console.error("Failed to copy to clipboard:", error)
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleImport = async () => {
    try {
      console.log("Import started with data:", importData)

      if (!importData.trim()) {
        toast({
          title: "Import failed",
          description: "Please enter some data to import.",
          variant: "destructive",
        })
        return
      }

      const lines = importData.trim().split("\n")
      console.log("Lines found:", lines.length)

      if (lines.length < 2) {
        toast({
          title: "Import failed",
          description: "Please provide at least a header row and one data row.",
          variant: "destructive",
        })
        return
      }

      // Detect separator (tab or comma)
      const firstLine = lines[0]
      const separator = firstLine.includes("\t") ? "\t" : ","
      console.log("Using separator:", separator === "\t" ? "TAB" : "COMMA")

      const headers = lines[0].split(separator)
      console.log("Headers:", headers)

      const newItems: InventoryItem[] = []

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(separator).map((val) => val.trim())
        console.log(`Row ${i}:`, values)

        if (values.length >= 2 && values[0] && values[0] !== "") {
          // Generate unique ID
          const id = `item_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`

          // Column mapping for your format:
          // Column 0: artikal
          // Column 1: lagerplats1
          // Column 2: lager1 (stock)
          // Column 3: lagerplats2
          // Column 4: lager2 (stock)

          const lager1 = Number.parseInt(values[2]) || 0
          const lager2 = Number.parseInt(values[4]) || 0

          const newItem: InventoryItem = {
            id: id,
            artikel: values[0] || "",
            lagerplats1: values[1] || "Default",
            status1: lager1 > 0 ? "Grön" : "Röd",
            lager1: lager1,
            lagerplats2: values[3] || "",
            status2: values[3] && lager2 > 0 ? "Grön" : values[3] ? "Röd" : "",
            lager2: lager2,
            streckkod: values[5] || "",
          }

          console.log("Created item:", newItem)
          newItems.push(newItem)
        }
      }

      console.log("Total items to import:", newItems.length)

      if (newItems.length === 0) {
        toast({
          title: "Import failed",
          description: "No valid items found. Please check your data format.",
          variant: "destructive",
        })
        return
      }

      setIsLoading(true)

      console.log("Deleting existing items...")
      const { error: deleteError } = await supabase
        .from("inventory")
        .delete()
        .neq("id", "impossible_id_that_never_exists")

      if (deleteError) {
        console.error("Delete error:", deleteError)
        throw deleteError
      }

      console.log("Inserting new items...")
      const batchSize = 100
      for (let i = 0; i < newItems.length; i += batchSize) {
        const batch = newItems.slice(i, i + batchSize)
        const { error: insertError } = await supabase.from("inventory").insert(batch)

        if (insertError) {
          console.error("Insert error:", insertError)
          throw insertError
        }
      }

      setInventory(newItems)
      setFilteredInventory(newItems)
      setShowImportDialog(false)
      setImportData("")
      setIsLoading(false)

      toast({
        title: "Import successful",
        description: `${newItems.length} items have been imported successfully!`,
      })

      console.log("Import completed successfully")
    } catch (error) {
      console.error("Error importing data:", error)
      setIsLoading(false)
      toast({
        title: "Import failed",
        description: `Could not import data: ${error.message || "Unknown error"}. Check console for details.`,
        variant: "destructive",
      })
    }
  }

  const handleClearAll = async () => {
    try {
      setIsLoading(true)

      // Clear inventory
      const { error: inventoryError } = await supabase
        .from("inventory")
        .delete()
        .neq("id", "impossible_id_that_never_exists")

      if (inventoryError) throw inventoryError

      // Clear logs
      const { error: logsError } = await supabase.from("logs").delete().neq("id", "impossible_id_that_never_exists")

      if (logsError) throw logsError

      // Update local state
      setInventory([])
      setFilteredInventory([])
      setLog([])
      setShowClearDialog(false)

      toast({
        title: "All data cleared",
        description: "All inventory items and logs have been deleted.",
      })
    } catch (error) {
      console.error("Error clearing data:", error)
      toast({
        title: "Error clearing data",
        description: "Could not clear all data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleLocationSelection = () => {
    if (selectedItem && selectedLocation) {
      updateStock(selectedItem.id, operationType === "add" ? 1 : -1, selectedLocation)
      setShowLocationDialog(false)
    }
  }

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      try {
        const reader = new FileReader()
        reader.onload = async (e) => {
          const logoDataUrl = e.target?.result as string

          // Update logo in Supabase
          const { error } = await supabase.from("settings").upsert({ key: "company_logo", value: logoDataUrl })

          if (error) throw error

          setLogo(logoDataUrl)
          toast({
            title: "Logo updated",
            description: "Company logo has been updated successfully.",
          })
        }
        reader.readAsDataURL(file)
      } catch (error) {
        console.error("Error uploading logo:", error)
        toast({
          title: "Logo upload failed",
          description: "Could not upload logo. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  const removeLogo = async () => {
    try {
      const { error } = await supabase.from("settings").delete().eq("key", "company_logo")

      if (error) throw error

      setLogo(null)
      toast({
        title: "Logo removed",
        description: "Company logo has been removed.",
      })
    } catch (error) {
      console.error("Error removing logo:", error)
      toast({
        title: "Error removing logo",
        description: "Could not remove logo. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleLogout = async () => {
    await logout()
    router.push("/login")
  }

  const handleItemDetails = (item: InventoryItem) => {
    setSelectedItem(item)
    setShowLocationDialog(true)
  }

  const handleMobileItemClick = (item: InventoryItem) => {
    setSelectedItem(item)
    setShowMobileDetail(true)
  }

  const getRandomQuote = () => {
    return quotes[Math.floor(Math.random() * quotes.length)]
  }

  // Get current stock for selected item and location
  const getCurrentStock = () => {
    if (!selectedItem || !selectedLocation) return 0

    if (selectedLocation === selectedItem.lagerplats1) {
      return selectedItem.lager1
    } else if (selectedLocation === selectedItem.lagerplats2) {
      return selectedItem.lager2
    }
    return 0
  }

  if (!user) {
    router.push("/login")
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              {logo ? (
                <div className="w-16 h-16 rounded-lg overflow-hidden shadow-lg bg-white border-2 border-gray-200">
                  <img src={logo || "/placeholder.svg"} alt="Company Logo" className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-xl">PF</span>
                </div>
              )}
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Plastic Is Fantastic
              </h1>
              <p className="text-sm text-gray-500">Logged in as: {user.username}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setShowImportDialog(true)}
              className="shadow-sm text-xs md:text-sm"
            >
              <Upload className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              Import
            </Button>
            <Button variant="outline" onClick={exportToCSV} className="shadow-sm text-xs md:text-sm">
              <Download className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              Export
            </Button>
            <Button variant="outline" onClick={() => setShowLogDialog(true)} className="shadow-sm text-xs md:text-sm">
              <Eye className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              Log
            </Button>
            <Button variant="outline" onClick={() => setShowQuoteDialog(true)} className="shadow-sm text-xs md:text-sm">
              <Quote className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              Quote
            </Button>
            {user?.role === "admin" && (
              <Button
                variant="destructive"
                onClick={() => setShowClearDialog(true)}
                className="shadow-sm text-xs md:text-sm"
              >
                <Trash2 className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                Clear All
              </Button>
            )}
            <Button variant="outline" onClick={handleLogout} className="shadow-sm text-xs md:text-sm">
              <LogOut className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              Logout
            </Button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-2 md:gap-4 md:items-center">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search articles or locations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-2 md:mt-0">
            <Button onClick={() => setShowEmptyDialog(true)} variant="outline" className="text-xs md:text-sm">
              <Eye className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              Empty (E)
            </Button>
            <Button onClick={refreshData} variant="outline" className="text-xs md:text-sm">
              <RotateCcw className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              Refresh (R)
            </Button>
          </div>
        </div>

        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="p-4 md:p-6">
            <CardTitle>Inventory Items ({filteredInventory.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0 md:p-0">
            <div className="overflow-x-auto -mx-4 md:mx-0">
              <div className="min-w-full inline-block align-middle">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-1/3">Artikel</TableHead>
                      <TableHead className="w-1/3">Lagerplats</TableHead>
                      <TableHead className="w-8 px-1">L1</TableHead>
                      <TableHead className="w-8 px-1">L2</TableHead>
                      <TableHead className="w-16">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <div className="flex justify-center items-center">
                            <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-500"></div>
                            <span className="ml-2">Loading...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredInventory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          No inventory items found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredInventory.map((item) => (
                        <TableRow
                          key={item.id}
                          className="cursor-pointer md:cursor-default"
                          onClick={() => {
                            if (window.innerWidth < 768) {
                              handleMobileItemClick(item)
                            }
                          }}
                        >
                          <TableCell className="font-medium">{item.artikel}</TableCell>
                          <TableCell className="text-xs">
                            <div>{item.lagerplats1}</div>
                            {item.lagerplats2 && <div className="text-gray-500">{item.lagerplats2}</div>}
                          </TableCell>
                          <TableCell className="px-1">
                            <div
                              className={`w-3 h-3 rounded-full ${
                                item.status1 === "Grön" ? "bg-green-500" : "bg-red-500"
                              }`}
                              title={`${item.lagerplats1}: ${item.lager1}`}
                            ></div>
                          </TableCell>
                          <TableCell className="px-1">
                            {item.lagerplats2 ? (
                              <div
                                className={`w-3 h-3 rounded-full ${
                                  item.status2 === "Grön" ? "bg-green-500" : "bg-red-500"
                                }`}
                                title={`${item.lagerplats2}: ${item.lager2}`}
                              ></div>
                            ) : (
                              <div className="w-3 h-3 rounded-full bg-gray-200"></div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleStockOperation(item, "add")
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleStockOperation(item, "remove")
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location Selection Dialog */}
        <Dialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Select Location</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p>Item: {selectedItem?.artikel}</p>
              <p>Operation: {operationType === "add" ? "Add stock" : "Remove stock"}</p>
              <div className="space-y-2">
                <Label>Choose location:</Label>
                <div className="space-y-2">
                  <Button
                    variant={selectedLocation === selectedItem?.lagerplats1 ? "default" : "outline"}
                    onClick={() => setSelectedLocation(selectedItem?.lagerplats1 || "")}
                    className="w-full justify-between"
                  >
                    <span>{selectedItem?.lagerplats1}</span>
                    <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-md text-xs">
                      Current: {selectedItem?.lager1 || 0}
                    </span>
                  </Button>
                  {selectedItem?.lagerplats2 && (
                    <Button
                      variant={selectedLocation === selectedItem?.lagerplats2 ? "default" : "outline"}
                      onClick={() => setSelectedLocation(selectedItem?.lagerplats2 || "")}
                      className="w-full justify-between"
                    >
                      <span>{selectedItem?.lagerplats2}</span>
                      <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-md text-xs">
                        Current: {selectedItem?.lager2 || 0}
                      </span>
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <span className="font-medium">Current stock: </span>
                  <span className="font-bold">{getCurrentStock()}</span>
                  <span className="ml-2 font-medium">New stock: </span>
                  <span className="font-bold">
                    {operationType === "add" ? getCurrentStock() + 1 : Math.max(0, getCurrentStock() - 1)}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleLocationSelection} disabled={!selectedLocation}>
                  Confirm
                </Button>
                <Button variant="outline" onClick={() => setShowLocationDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Empty Items Dialog */}
        <Dialog open={showEmptyDialog} onOpenChange={setShowEmptyDialog}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Empty Stock Items</DialogTitle>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto">
              {isLoading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-500"></div>
                  <span className="ml-2">Loading...</span>
                </div>
              ) : getEmptyItems().length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No items with empty stock!</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Artikel</TableHead>
                        <TableHead>Lagerplats</TableHead>
                        <TableHead>L1</TableHead>
                        <TableHead>L2</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getEmptyItems().map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.artikel}</TableCell>
                          <TableCell>
                            <div>{item.lagerplats1}</div>
                            {item.lagerplats2 && <div className="text-gray-500">{item.lagerplats2}</div>}
                          </TableCell>
                          <TableCell>
                            <div
                              className={`w-3 h-3 rounded-full ${
                                item.status1 === "Grön" ? "bg-green-500" : "bg-red-500"
                              }`}
                              title={`${item.lagerplats1}: ${item.lager1}`}
                            ></div>
                          </TableCell>
                          <TableCell>
                            {item.lagerplats2 ? (
                              <div
                                className={`w-3 h-3 rounded-full ${
                                  item.status2 === "Grön" ? "bg-green-500" : "bg-red-500"
                                }`}
                                title={`${item.lagerplats2}: ${item.lager2}`}
                              ></div>
                            ) : (
                              <div className="w-3 h-3 rounded-full bg-gray-200"></div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Import Dialog */}
        <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Import Inventory Data</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="import-data">CSV Data</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Format: Artikel,Lagerplats 1,Status 1,Lagerplats 2,Status 2,Streckkod
                </p>
                <Textarea
                  id="import-data"
                  placeholder="artikal	lagerplats1	lager1	lagerplats2	lager2
4,0 x 750		1		0
4.0 x 750		1		0
4.0 x 800		1		0"
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  className="min-h-32"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleImport} disabled={isLoading || !importData.trim()}>
                  {isLoading ? "Importing..." : "Import"}
                </Button>
                <Button variant="outline" onClick={() => setShowImportDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Log Dialog */}
        <Dialog open={showLogDialog} onOpenChange={setShowLogDialog}>
          <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>Stock Change Log</DialogTitle>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto">
              {isLoading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-500"></div>
                  <span className="ml-2">Loading...</span>
                </div>
              ) : log.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No stock changes recorded yet!</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Artikel</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Operation</TableHead>
                        <TableHead>Previous</TableHead>
                        <TableHead>New</TableHead>
                        <TableHead>User</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {log.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="text-xs md:text-sm whitespace-nowrap">
                            {new Date(entry.timestamp).toLocaleString()}
                          </TableCell>
                          <TableCell className="font-medium">{entry.artikel}</TableCell>
                          <TableCell>{entry.location}</TableCell>
                          <TableCell>
                            <Badge variant={entry.operation === "add" ? "default" : "outline"}>
                              {entry.operation === "add" ? "Added" : "Removed"}
                            </Badge>
                          </TableCell>
                          <TableCell>{entry.previousstock}</TableCell>
                          <TableCell>{entry.newstock}</TableCell>
                          <TableCell>{entry.user || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={copyLogToClipboard} disabled={log.length === 0}>
                <Download className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                Copy Log
              </Button>
              <Button variant="outline" onClick={() => setShowLogDialog(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Mobile Item Detail Dialog */}
        <Dialog open={showMobileDetail} onOpenChange={setShowMobileDetail}>
          <DialogContent className="sm:max-w-md">
            {selectedItem && (
              <MobileItemView
                item={selectedItem}
                onAddStock={(location) => {
                  updateStock(selectedItem.id, 1, location)
                }}
                onRemoveStock={(location) => {
                  updateStock(selectedItem.id, -1, location)
                }}
                onClose={() => setShowMobileDetail(false)}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Private use notice */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="pt-4 md:pt-6 text-center">
            <div className="text-xs md:text-sm text-muted-foreground italic">detta är för privat bruk ;)</div>
          </CardContent>
        </Card>

        {/* Mobile Bottom Navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-2 flex justify-around items-center z-50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowEmptyDialog(true)}
            className="flex flex-col items-center"
          >
            <Eye className="h-5 w-5" />
            <span className="text-xs mt-1">Empty</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={refreshData} className="flex flex-col items-center">
            <RotateCcw className="h-5 w-5" />
            <span className="text-xs mt-1">Refresh</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowQuoteDialog(true)}
            className="flex flex-col items-center"
          >
            <Quote className="h-5 w-5" />
            <span className="text-xs mt-1">Quote</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowLogDialog(true)}
            className="flex flex-col items-center"
          >
            <Eye className="h-5 w-5" />
            <span className="text-xs mt-1">Log</span>
          </Button>
        </div>

        {/* Quote of the Day Dialog */}
        <Dialog open={showQuoteDialog} onOpenChange={setShowQuoteDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>💡 Quote of the Day</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                <p className="text-lg italic text-gray-700 leading-relaxed">"{getRandomQuote()}"</p>
              </div>
              <div className="flex justify-center">
                <Button onClick={() => setShowQuoteDialog(false)}>Close</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Clear All Confirmation Dialog */}
        <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>⚠️ Clear All Data</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This will permanently delete ALL inventory items and logs. This action cannot be undone.
              </p>
              <p className="text-sm font-medium text-red-600">Are you absolutely sure you want to continue?</p>
              <div className="flex gap-2">
                <Button variant="destructive" onClick={handleClearAll} disabled={isLoading}>
                  {isLoading ? "Clearing..." : "Yes, Clear All Data"}
                </Button>
                <Button variant="outline" onClick={() => setShowClearDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add padding at the bottom to prevent content from being hidden behind the mobile nav */}
        <div className="h-16 md:hidden"></div>
      </div>
    </div>
  )
}
