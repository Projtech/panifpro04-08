
import React from "react";
import { Card } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  description: string;
}

export function StatCard({ title, value, icon, description }: StatCardProps) {
  return (
    <Card className="p-6">
      <div className="flex justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-bakery-brown">{value}</p>
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        </div>
        <div className="self-start">{icon}</div>
      </div>
    </Card>
  );
}
