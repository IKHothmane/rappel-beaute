import Image from "next/image";
import { imagePath, imageSize, type GuideImage } from "@/lib/guide";

const DESKTOP_SIZES =
  "(min-width: 1152px) 830px, (min-width: 1024px) calc(100vw - 320px), (min-width: 768px) calc(100vw - 64px), calc(100vw - 40px)";
const MOBILE_SIZES = "(min-width: 640px) 220px, 45vw";

/** Capture légendée ; le clic ouvre le fichier d'origine dans un nouvel onglet. */
export function GuideFigure({ image }: { image: GuideImage }) {
  const src = imagePath(image);
  return (
    <figure className="min-w-0">
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className="block cursor-zoom-in overflow-hidden rounded-xl border border-vt-line bg-white shadow-soft transition hover:border-vt-primary"
      >
        <Image
          src={src}
          alt={image.alt}
          {...imageSize(image)}
          sizes={image.mobile ? MOBILE_SIZES : DESKTOP_SIZES}
          className="block h-auto w-full"
        />
        <span className="sr-only"> : ouvrir en grand dans un nouvel onglet</span>
      </a>
      <figcaption className="mt-[var(--vt-size-0p5rem)] text-[length:var(--vt-fs-caption)] text-vt-muted">
        <span className="font-semibold text-vt-ink">{image.caption}</span>
        <span aria-hidden="true"> · Cliquer pour agrandir</span>
      </figcaption>
    </figure>
  );
}
