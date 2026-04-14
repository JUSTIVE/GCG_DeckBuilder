export function CardBlurOverlay({ imageUrl }: { imageUrl: string }) {
  const mask = "linear-gradient(to top, black 35%, transparent 60%)";
  const srcSet = `${imageUrl.replace(/\.webp$/, "-sm.webp")} 200w, ${imageUrl} 800w`;
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ maskImage: mask, WebkitMaskImage: mask }}
    >
      <img
        src={imageUrl}
        srcSet={srcSet}
        sizes="(max-width: 640px) 200px, 400px"
        alt=""
        className="absolute w-full h-full object-cover top-0"
        style={{ filter: "blur(12px)" }}
      />
    </div>
  );
}
