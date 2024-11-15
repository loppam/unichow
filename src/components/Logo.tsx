interface LogoProps {
  size?: "sm" | "md" | "lg";
}

export default function Logo({ size = "md" }: LogoProps) {
  const sizes = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

  const containerSizes = {
    sm: "mb-4",
    md: "mb-8",
    lg: "mb-12",
  };

  return (
    <div className={`rounded-full bg-black mx-auto w-fit ${containerSizes[size]}`}>
      <img 
        src="/whitefavicon192x192.png" 
        alt="logo" 
        className={sizes[size]} 
      />
    </div>
  );
}
