"use client";

import Cropper from "react-easy-crop";
import { useState, useCallback } from "react";

type ImageCropperProps = {
  file: File;
  onCancel: () => void;
  onComplete: (blob: Blob) => void;
};

type Area = {
  width: number;
  height: number;
  x: number;
  y: number;
};

export default function ImageCropper({ file, onCancel, onComplete }: ImageCropperProps) {
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback(
    (_: Area, areaPixels: Area) => {
      setCroppedAreaPixels(areaPixels);
    },
    []
  );

  async function createCroppedImage() {
    if (!croppedAreaPixels) return;

    const image = await loadImage(URL.createObjectURL(file));
    const croppedBlob = await cropImage(image, croppedAreaPixels);
    onComplete(croppedBlob);
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl max-w-lg w-full space-y-4 shadow-xl">

        <div className="relative w-full h-80">
          <Cropper
            image={URL.createObjectURL(file)}
            crop={crop}
            zoom={zoom}
            aspect={16 / 9}
            onCropChange={setCrop}
            onZoomChange={(value) => setZoom(Number(value))}
            onCropComplete={onCropComplete}
          />
        </div>

        {/* Zoom slider */}
        <input
          type="range"
          min={1}
          max={3}
          step={0.1}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-full"
        />

        <div className="flex justify-end gap-3">
          <button className="px-4 py-2 bg-gray-200 rounded" onClick={onCancel}>
            Cancel
          </button>

          <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={createCroppedImage}>
            Save Crop
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------
   UTIL: Load an image element from a URL
------------------------------------------------------------ */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = url;
  });
}

/* ------------------------------------------------------------
   UTIL: Crop an image using canvas + return Blob
------------------------------------------------------------ */
function cropImage(image: HTMLImageElement, crop: Area): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = crop.width;
  canvas.height = crop.height;

  return new Promise((resolve) => {
    if (!ctx) {
      console.error("Canvas context is null");
      return resolve(new Blob());
    }

    ctx.drawImage(
      image,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      crop.width,
      crop.height
    );

    canvas.toBlob((blob) => resolve(blob as Blob), "image/jpeg");
  });
}
