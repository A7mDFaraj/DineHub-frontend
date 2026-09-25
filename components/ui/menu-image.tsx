"use client";
import Image, { type ImageProps } from "next/image";
import { canOptimizeImage } from "@/lib/image-policy";

// Preserve existing external URLs without turning the server optimizer into
// an unrestricted remote fetcher. Known storage hosts still get optimization.
export default function MenuImage(props: ImageProps) {
  return <Image {...props} alt={props.alt} unoptimized={props.unoptimized || (typeof props.src === "string" && !canOptimizeImage(props.src))} />;
}
