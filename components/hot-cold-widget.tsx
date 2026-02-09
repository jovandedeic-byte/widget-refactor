"use client";

export interface HotColdSettings {
  backgroundType?: "image" | "video" | "gradient" | "transparent";
  glow?: boolean;
  // Hot-specific
  hotVideoIndex?: number;
  hotImageIndex?: number;
  hotGradientColors?: [string, string];
  hotGradientDirection?: string;
  // Cold-specific
  coldVideoIndex?: number;
  coldImageIndex?: number;
  coldGradientColors?: [string, string];
  coldGradientDirection?: string;
  // Fallbacks
  videoIndex?: number;
  imageIndex?: number;
  imageExtension?: "jpg" | "png";
  gradientColors?: [string, string];
  gradientDirection?: string;
}

export interface HotColdWidgetProps {
  clientId: string;
  playerToken?: string | null;
  settings: HotColdSettings;
}

export function HotColdWidget({
  clientId,
  playerToken,
  settings,
}: HotColdWidgetProps) {
  // TODO: Implement hot/cold widget
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white">
      <div className="text-center p-8">
        <h2 className="text-xl font-bold mb-4">Hot & Cold Widget</h2>
        <p className="text-gray-400 mb-2">Background: {settings.backgroundType || "gradient"}</p>
        <p className="text-gray-400 mb-2">Glow: {settings.glow ? "Yes" : "No"}</p>
        <p className="text-gray-400 text-sm">Client: {clientId}</p>
      </div>
    </div>
  );
}
