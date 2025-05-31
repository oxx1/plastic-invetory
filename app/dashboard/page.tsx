"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Plus, Minus, Eye, RotateCcw, Upload, Download, Search, LogOut, Camera } from "lucide-react"
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
import { BarcodeScanner } from "@/components/barcode-scanner"

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
  previousStock: number
  newStock: number
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
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false)

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

        // Update the item in Supabase
        const { error: updateError } = await supabase.from("inventory").update(updatedItem).eq("id", itemId)

        if (updateError) throw updateError

        // Create log entry
        const logEntry: LogEntry = {
          id: Date.now().toString() + Math.random(),
          timestamp: new Date().toISOString(),
          artikel: item.artikel,
          location: location,
          operation: change > 0 ? "add" : "remove",
          previousStock,
          newStock,
          user: user?.username,
        }

        // Add log entry to Supabase
        const { error: logError } = await supabase.from("logs").insert(logEntry)

        if (logError) throw logError

        // Update local state
        setInventory((prev) => prev.map((i) => (i.id === itemId ? updatedItem : i)))
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

  const handleImport = async () => {
    try {
      const lines = importData.trim().split("\n")
      const headers = lines[0].split(",")
      const newItems: InventoryItem[] = []

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",")
        if (values.length >= 4) {
          newItems.push({
            id: Date.now().toString() + i,
            artikel: values[0],
            lagerplats1: values[1],
            status1: values[2] === "Grön" ? "Grön" : "Röd",
            lager1: values[2] === "Grön" ? 1 : 0,
            lagerplats2: values[3] || "",
            status2: values[4] ? (values[4] === "Grön" ? "Grön" : "Röd") : "",
            lager2: values[4] === "Grön" ? 1 : 0,
            streckkod: values[5] || "",
          })
        }
      }

      // Clear existing inventory and insert new items
      const { error: deleteError } = await supabase.from("inventory").delete().neq("id", "0") // Delete all records

      if (deleteError) throw deleteError

      // Insert new items
      const { error: insertError } = await supabase.from("inventory").insert(newItems)

      if (insertError) throw insertError

      setInventory(newItems)
      setFilteredInventory(newItems)
      setShowImportDialog(false)
      setImportData("")

      toast({
        title: "Import successful",
        description: `${newItems.length} items have been imported.`,
      })
    } catch (error) {
      console.error("Error importing data:", error)
      toast({
        title: "Import failed",
        description: "Could not import data. Please check the format and try again.",
        variant: "destructive",
      })
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

  const handleBarcodeScan = (code: string) => {
    // Find item with matching barcode
    const item = inventory.find((item) => item.streckkod === code)

    if (item) {
      setSelectedItem(item)
      setShowMobileDetail(true)
      setShowBarcodeScanner(false)
    } else {
      toast({
        title: "Item not found",
        description: `No item found with barcode: ${code}`,
        variant: "destructive",
      })
    }
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
            <div className="relative group">
              {logo ? (
                <div className="w-12 h-12 rounded-lg overflow-hidden shadow-lg bg-white border-2 border-gray-200">
                  <img src={logo || "/placeholder.svg"} alt="Company Logo" className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-xl">PF</span>
                </div>
              )}
              <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" id="logo-upload" />
                <label
                  htmlFor="logo-upload"
                  className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-600 text-xs"
                  title="Upload logo"
                >
                  +
                </label>
                {logo && (
                  <button
                    onClick={removeLogo}
                    className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-red-600 text-xs ml-1"
                    title="Remove logo"
                  >
                    ×
                  </button>
                )}
              </div>
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
                      <TableHead>Artikel</TableHead>
                      <TableHead>Lagerplats 1</TableHead>
                      <TableHead>Status 1</TableHead>
                      <TableHead className="hidden sm:table-cell">Lagerplats 2</TableHead>
                      <TableHead className="hidden sm:table-cell">Status 2</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="flex justify-center items-center">
                            <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-500"></div>
                            <span className="ml-2">Loading...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredInventory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
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
                          <TableCell>{item.lagerplats1}</TableCell>
                          <TableCell>
                            <Badge
                              variant={item.status1 === "Grön" ? "default" : "destructive"}
                              className={item.status1 === "Grön" ? "bg-green-500 hover:bg-green-600" : ""}
                            >
                              {item.lager1 > 0 ? "I lager" : "Slut!"}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">{item.lagerplats2 || "-"}</TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {item.lagerplats2 && item.lagerplats2.trim() !== "" ? (
                              <Badge
                                variant={item.status2 === "Grön" ? "default" : "destructive"}
                                className={item.status2 === "Grön" ? "bg-green-500 hover:bg-green-600" : ""}
                              >
                                {item.lager2 > 0 ? "I lager" : "Slut!"}
                              </Badge>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleStockOperation(item, "add")}
                                className="h-8 w-8 p-0"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStockOperation(item, "remove")}
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
                    className="w-full justify-start"
                  >
                    {selectedItem?.lagerplats1}
                  </Button>
                  {selectedItem?.lagerplats2 && (
                    <Button
                      variant={selectedLocation === selectedItem?.lagerplats2 ? "default" : "outline"}
                      onClick={() => setSelectedLocation(selectedItem?.lagerplats2 || "")}
                      className="w-full justify-start"
                    >
                      {selectedItem?.lagerplats2}
                    </Button>
                  )}
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
                        <TableHead>Lagerplats 1</TableHead>
                        <TableHead>Status 1</TableHead>
                        <TableHead>Lagerplats 2</TableHead>
                        <TableHead>Status 2</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getEmptyItems().map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.artikel}</TableCell>
                          <TableCell>{item.lagerplats1}</TableCell>
                          <TableCell>
                            <Badge
                              variant={item.status1 === "Grön" ? "default" : "destructive"}
                              className={item.status1 === "Grön" ? "bg-green-500 hover:bg-green-600" : ""}
                            >
                              {item.lager1 > 0 ? "I lager" : "Slut!"}
                            </Badge>
                          </TableCell>
                          <TableCell>{item.lagerplats2 || "-"}</TableCell>
                          <TableCell>
                            {item.lagerplats2 && item.lagerplats2.trim() !== "" ? (
                              <Badge
                                variant={item.status2 === "Grön" ? "default" : "destructive"}
                                className={item.status2 === "Grön" ? "bg-green-500 hover:bg-green-600" : ""}
                              >
                                {item.lager2 > 0 ? "I lager" : "Slut!"}
                              </Badge>
                            ) : (
                              "-"
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
                  placeholder="Artikel,Lagerplats 1,Status 1,Lagerplats 2,Status 2,Streckkod
Art123,Lager1,Grön,Lager2,Grön,1234
Art456,Lager3,Röd,,,C1800000000645"
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  className="min-h-32"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleImport}>Import</Button>
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
                          <TableCell>{entry.previousStock}</TableCell>
                          <TableCell>{entry.newStock}</TableCell>
                          <TableCell>{entry.user || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
            <div className="flex justify-end">
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

        {/* Keyboard shortcuts info */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="pt-4 md:pt-6 text-center">
            <div className="text-xs md:text-sm text-muted-foreground">
              <strong>Keyboard Shortcuts:</strong> K (Add stock) • L (Remove stock) • E (Show empty) • R (Refresh)
            </div>
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
            onClick={() => setShowBarcodeScanner(true)}
            className="flex flex-col items-center"
          >
            <Camera className="h-5 w-5" />
            <span className="text-xs mt-1">Scan</span>
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

        {/* Barcode Scanner Dialog */}
        <Dialog open={showBarcodeScanner} onOpenChange={setShowBarcodeScanner}>
          <DialogContent className="sm:max-w-md p-0">
            <BarcodeScanner onScan={handleBarcodeScan} onClose={() => setShowBarcodeScanner(false)} />
          </DialogContent>
        </Dialog>

        {/* Add padding at the bottom to prevent content from being hidden behind the mobile nav */}
        <div className="h-16 md:hidden"></div>
      </div>
    </div>
  )
}
