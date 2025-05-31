"use client"

import { useState } from "react"

import type React from "react"
import { useEffect, useCallback } from "react"
import { Plus, Minus, Eye, RotateCcw, Upload, Download, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth"

// Update the InventoryItem interface to include separate status fields for each location
interface InventoryItem {
  id: string
  artikel: string
  lagerplats1: string
  lagerplats2?: string
  status1: "Grön" | "Röd" // Status for Lager 1
  status2: "Grön" | "Röd" | "" // Status for Lager 2
  lager1: number // Stock in Lager 1
  lager2: number // Stock in Lager 2
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

// Update the sample data to include separate status and stock fields
const sampleData: InventoryItem[] = [
  {
    id: "1",
    artikel: "Art123",
    lagerplats1: "Lager1",
    lagerplats2: "Lager2",
    status1: "Grön",
    status2: "Grön",
    lager1: 3,
    lager2: 2,
    streckkod: "1234",
  },
  {
    id: "2",
    artikel: "Art456",
    lagerplats1: "Lager3",
    lagerplats2: "",
    status1: "Röd",
    status2: "",
    lager1: 0,
    lager2: 0,
    streckkod: "C1800000000645",
  },
  {
    id: "3",
    artikel: "Art789",
    lagerplats1: "Lager1",
    lagerplats2: "Lager4",
    status1: "Grön",
    status2: "Röd",
    lager1: 12,
    lager2: 0,
    streckkod: "5678",
  },
]

export default function InventoryApp() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
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

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        router.push("/dashboard")
      } else {
        router.push("/login")
      }
    }
  }, [user, isLoading, router])

  // Load data from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem("inventory-data")
    const savedLog = localStorage.getItem("inventory-log")

    if (savedData) {
      const parsed = JSON.parse(savedData)
      setInventory(parsed)
      setFilteredInventory(parsed)
    } else {
      setInventory(sampleData)
      setFilteredInventory(sampleData)
      localStorage.setItem("inventory-data", JSON.stringify(sampleData))
    }

    if (savedLog) {
      setLog(JSON.parse(savedLog))
    }
  }, [])

  // Save to localStorage whenever inventory changes
  useEffect(() => {
    if (inventory.length > 0) {
      localStorage.setItem("inventory-data", JSON.stringify(inventory))
    }
  }, [inventory])

  useEffect(() => {
    if (log.length > 0) {
      localStorage.setItem("inventory-log", JSON.stringify(log))
    }
  }, [log])

  // Load logo from localStorage
  useEffect(() => {
    const savedLogo = localStorage.getItem("company-logo")
    if (savedLogo) {
      setLogo(savedLogo)
    }
  }, [])

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

  // Update the updateStock function to handle location-specific stock updates
  const updateStock = useCallback((itemId: string, change: number, location: string) => {
    setInventory((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
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

          // Add log entry
          const logEntry: LogEntry = {
            id: Date.now().toString() + Math.random(),
            timestamp: new Date().toLocaleString(),
            artikel: item.artikel,
            location: location,
            operation: change > 0 ? "add" : "remove",
            previousStock,
            newStock,
          }

          setLog((prevLog) => [logEntry, ...prevLog])

          return updatedItem
        }
        return item
      }),
    )
  }, [])

  // Update the handleStockOperation function to always show location selection
  const handleStockOperation = (item: InventoryItem, operation: "add" | "remove") => {
    setSelectedItem(item)
    setOperationType(operation)

    // Always show location selection dialog
    if (item.lagerplats2 && item.lagerplats2.trim()) {
      setShowLocationDialog(true)
    } else {
      // For items with only one location, pre-select it
      setSelectedLocation(item.lagerplats1)
      setShowLocationDialog(true)
    }
  }

  // Update the getEmptyItems function to check both locations
  const getEmptyItems = () => {
    return inventory.filter(
      (item) =>
        (item.lager1 === 0 && item.lagerplats1) ||
        (item.lager2 === 0 && item.lagerplats2 && item.lagerplats2.trim() !== ""),
    )
  }

  const refreshData = () => {
    // In a real app, this would fetch from server
    const savedData = localStorage.getItem("inventory-data")
    if (savedData) {
      const parsed = JSON.parse(savedData)
      setInventory(parsed)
      setFilteredInventory(parsed)
    }
  }

  // Update the exportToCSV function to include the new fields
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
  }

  // Update the handleImport function to handle the new data structure
  const handleImport = () => {
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
            lager1: values[2] === "Grön" ? 1 : 0, // Set default stock based on status
            lagerplats2: values[3] || "",
            status2: values[4] ? (values[4] === "Grön" ? "Grön" : "Röd") : "",
            lager2: values[4] === "Grön" ? 1 : 0, // Set default stock based on status
            streckkod: values[5] || "",
          })
        }
      }

      setInventory(newItems)
      setFilteredInventory(newItems)
      setShowImportDialog(false)
      setImportData("")
    } catch (error) {
      alert("Error importing data. Please check the format.")
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (e.key.toLowerCase()) {
        case "k":
          e.preventDefault()
          // For demo, operate on first item
          if (filteredInventory.length > 0) {
            handleStockOperation(filteredInventory[0], "add")
          }
          break
        case "l":
          e.preventDefault()
          if (filteredInventory.length > 0) {
            handleStockOperation(filteredInventory[0], "remove")
          }
          break
        case "e":
          e.preventDefault()
          setShowEmptyDialog(true)
          break
        case "r":
          e.preventDefault()
          refreshData()
          break
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [filteredInventory])

  const handleLocationSelection = () => {
    if (selectedItem && selectedLocation) {
      updateStock(selectedItem.id, operationType === "add" ? 1 : -1, selectedLocation)
      setShowLocationDialog(false)
    }
  }

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const logoDataUrl = e.target?.result as string
        setLogo(logoDataUrl)
        localStorage.setItem("company-logo", logoDataUrl)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeLogo = () => {
    setLogo(null)
    localStorage.removeItem("company-logo")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative group">
              {logo ? (
                <div className="w-12 h-12 rounded-lg overflow-hidden shadow-lg bg-white border-2 border-gray-200">
                  <img src={logo || "/placeholder.svg"} alt="Company Logo" className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-xl">IL</span>
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
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Plastic Is Fantastic
            </h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowImportDialog(true)} className="shadow-sm">
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            <Button variant="outline" onClick={exportToCSV} className="shadow-sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" onClick={() => setShowLogDialog(true)} className="shadow-sm">
              <Eye className="h-4 w-4 mr-2" />
              Log
            </Button>
          </div>
        </div>

        <div className="flex gap-4 items-center">
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
          <Button onClick={() => setShowEmptyDialog(true)} variant="outline">
            <Eye className="h-4 w-4 mr-2" />
            Show Empty (E)
          </Button>
          <Button onClick={refreshData} variant="outline">
            <RotateCcw className="h-4 w-4 mr-2" />
            Refresh (R)
          </Button>
        </div>

        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Inventory Items ({filteredInventory.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Update the Table component to display separate status and stock columns
            Replace the existing Table component with this updated version */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Artikel</TableHead>
                  <TableHead>Lagerplats 1</TableHead>
                  <TableHead>Status 1</TableHead>
                  <TableHead>Lagerplats 2</TableHead>
                  <TableHead>Status 2</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventory.map((item) => (
                  <TableRow key={item.id}>
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
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleStockOperation(item, "add")} className="h-8 w-8 p-0">
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
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Location Selection Dialog */}
        <Dialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
          <DialogContent>
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Empty Stock Items</DialogTitle>
            </DialogHeader>
            <div className="max-h-96 overflow-y-auto">
              {getEmptyItems().length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No items with empty stock!</p>
              ) : (
                // Update the Empty Items Dialog table to show location-specific statuses
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
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Import Dialog */}
        <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Import Inventory Data</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="import-data">CSV Data</Label>
                {/* Update the import dialog help text */}
                <p className="text-sm text-muted-foreground mb-2">
                  Format: Artikel,Lagerplats 1,Status 1,Lagerplats 2,Status 2,Streckkod
                </p>
                {/* Update the import dialog placeholder text */}
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
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Stock Change Log</DialogTitle>
            </DialogHeader>
            <div className="max-h-96 overflow-y-auto">
              {log.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No stock changes recorded yet!</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Artikel</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Operation</TableHead>
                      <TableHead>Previous Stock</TableHead>
                      <TableHead>New Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {log.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-sm">{entry.timestamp}</TableCell>
                        <TableCell className="font-medium">{entry.artikel}</TableCell>
                        <TableCell>{entry.location}</TableCell>
                        <TableCell>
                          <Badge variant={entry.operation === "add" ? "default" : "outline"}>
                            {entry.operation === "add" ? "Added" : "Removed"}
                          </Badge>
                        </TableCell>
                        <TableCell>{entry.previousStock}</TableCell>
                        <TableCell>{entry.newStock}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setShowLogDialog(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Keyboard shortcuts info */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">
              <strong>Keyboard Shortcuts:</strong> K (Add stock) • L (Remove stock) • E (Show empty) • R (Refresh)
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
