"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Minus } from "lucide-react"

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

interface MobileItemViewProps {
  item: InventoryItem
  onAddStock: (location: string) => void
  onRemoveStock: (location: string) => void
  onClose: () => void
}

export function MobileItemView({ item, onAddStock, onRemoveStock, onClose }: MobileItemViewProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">{item.artikel}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-medium">Lagerplats 1:</h3>
              <p>{item.lagerplats1}</p>
            </div>
            <Badge
              variant={item.status1 === "Grön" ? "default" : "destructive"}
              className={item.status1 === "Grön" ? "bg-green-500 hover:bg-green-600" : ""}
            >
              {item.lager1 > 0 ? "I lager" : "Slut!"}
            </Badge>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <Button size="sm" onClick={() => onAddStock(item.lagerplats1)} className="h-8 w-8 p-0">
              <Plus className="h-4 w-4" />
            </Button>
            <span className="font-medium">{item.lager1}</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onRemoveStock(item.lagerplats1)}
              className="h-8 w-8 p-0"
              disabled={item.lager1 <= 0}
            >
              <Minus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {item.lagerplats2 && item.lagerplats2.trim() !== "" && (
          <div className="space-y-2 pt-2 border-t">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-medium">Lagerplats 2:</h3>
                <p>{item.lagerplats2}</p>
              </div>
              <Badge
                variant={item.status2 === "Grön" ? "default" : "destructive"}
                className={item.status2 === "Grön" ? "bg-green-500 hover:bg-green-600" : ""}
              >
                {item.lager2 > 0 ? "I lager" : "Slut!"}
              </Badge>
            </div>

            <div className="flex items-center gap-2 mt-1">
              <Button size="sm" onClick={() => onAddStock(item.lagerplats2)} className="h-8 w-8 p-0">
                <Plus className="h-4 w-4" />
              </Button>
              <span className="font-medium">{item.lager2}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRemoveStock(item.lagerplats2)}
                className="h-8 w-8 p-0"
                disabled={item.lager2 <= 0}
              >
                <Minus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {item.streckkod && (
          <div className="pt-2 border-t">
            <h3 className="font-medium">Streckkod:</h3>
            <p className="font-mono">{item.streckkod}</p>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={onClose} className="w-full">
          Close
        </Button>
      </CardFooter>
    </Card>
  )
}
