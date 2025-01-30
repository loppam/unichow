import { ReactNode } from "react";
import RiderNavigation from "./RiderNavigation";

interface RiderLayoutProps {
  children: ReactNode;
}

export default function RiderLayout({ children }: RiderLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto">{children}</div>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t pb-safe">
        <RiderNavigation />
      </nav>
    </div>
  );
}
