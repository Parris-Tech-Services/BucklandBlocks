import React, { useState } from "react";
import { BlockType, getBlockData } from "../engine/blocks";

export interface ItemIconView {
  name: string;
  /** Texture to show, or null to show the name as text instead. */
  image: string | null;
}

/**
 * What a slot shows for an item. `failedTexture` is the texture that last
 * failed to load in this slot; it only hides that exact texture, so a
 * different item dropped into the same slot still gets its picture.
 */
export function itemIconView(type: BlockType, failedTexture: string | null): ItemIconView | null {
  const data = getBlockData(type);
  if (!data || type === BlockType.AIR) return null;
  const texture = data.texture || null;
  return { name: data.name, image: texture && texture !== failedTexture ? texture : null };
}

/**
 * An item's picture with its readable name and stack count, sized to fill a
 * slot. If the item has no texture or the image fails to load, the name is
 * shown as text instead of a broken-image icon.
 */
const ItemIcon: React.FC<{ type: BlockType; count?: number }> = ({ type, count = 0 }) => {
  const [failedTexture, setFailedTexture] = useState<string | null>(null);
  const view = itemIconView(type, failedTexture);
  if (!view) return null;

  return (
    <span className="pointer-events-none relative flex h-full w-full items-center justify-center">
      {view.image ? (
        <img
          src={view.image}
          alt=""
          draggable={false}
          onError={() => setFailedTexture(view.image)}
          className="h-full w-full object-contain p-1 pixelated"
        />
      ) : (
        <span data-testid="item-text-fallback" className="px-0.5 text-center text-[8px] font-bold leading-tight text-white">
          {view.name}
        </span>
      )}
      {view.image && (
        <span
          className="absolute inset-x-0 top-0 truncate bg-black/60 px-0.5 text-[7px] font-bold leading-3 text-white"
          style={{ textShadow: "1px 1px 0 #000" }}
        >
          {view.name}
        </span>
      )}
      {count > 1 && (
        <span className="absolute bottom-0 right-1 font-mono text-[10px] font-bold text-white" style={{ textShadow: "1px 1px 0 #000" }}>
          {count}
        </span>
      )}
    </span>
  );
};

export default ItemIcon;
