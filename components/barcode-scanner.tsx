"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search, Camera, X } from "lucide-react"

interface BarcodeScannerProps {
  onScan: (code: string) => void
  onClose: () => void
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const [manualCode, setManualCode] = useState("")
  const [isCameraActive, setIsCameraActive] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualCode.trim()) {
      onScan(manualCode.trim())
    }
  }

  const toggleCamera = async () => {
    if (isCameraActive) {
      stopCamera()
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setIsCameraActive(true)
      }
    } catch (err) {
      console.error("Error accessing camera:", err)
      alert("Could not access camera. Please check permissions or use manual entry.")
    }
  }

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach((track) => track.stop())
      videoRef.current.srcObject = null
      setIsCameraActive(false)
    }
  }

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Scan Barcode</span>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isCameraActive ? (
          <div className="relative">
            <video ref={videoRef} autoPlay playsInline className="w-full rounded-md border border-gray-300" />
            <canvas ref={canvasRef} className="hidden" />
            <div
              className="absolute inset-0 border-2 border-blue-500 opacity-50 pointer-events-none"
              style={{
                borderTopWidth: "40%",
                borderBottomWidth: "40%",
                borderLeftWidth: "20%",
                borderRightWidth: "20%",
              }}
            ></div>
          </div>
        ) : (
          <form onSubmit={handleManualSubmit} className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Enter barcode manually..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button type="submit" className="w-full">
              Search
            </Button>
          </form>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={toggleCamera} variant={isCameraActive ? "destructive" : "outline"} className="w-full">
          <Camera className="h-4 w-4 mr-2" />
          {isCameraActive ? "Stop Camera" : "Use Camera"}
        </Button>
      </CardFooter>
    </Card>
  )
}
