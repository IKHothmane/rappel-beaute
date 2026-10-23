import type { Metadata } from "next";
import { Salon3dViewer } from "@/components/salon-3d/salon-3d-viewer";

export const metadata: Metadata = {
  title: "Plan 3D",
};

export default function Salon3dPage() {
  return <Salon3dViewer />;
}
