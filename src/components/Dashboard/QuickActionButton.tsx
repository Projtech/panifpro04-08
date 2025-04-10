
import React from "react";
import { Link } from "react-router-dom";
import { LucideIcon } from "lucide-react";

interface QuickActionButtonProps {
  title: string;
  href: string;
  icon?: LucideIcon;
}

export function QuickActionButton({ title, href, icon: Icon }: QuickActionButtonProps) {
  return (
    <Link 
      to={href}
      className="block p-4 bg-bakery-cream hover:bg-bakery-amber hover:text-white transition-colors duration-200 rounded-lg text-center text-bakery-brown font-medium"
    >
      <div className="flex flex-col items-center justify-center">
        {Icon && <Icon className="h-5 w-5 mb-2" />}
        {title}
      </div>
    </Link>
  );
}
