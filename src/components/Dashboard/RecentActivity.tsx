
import React from "react";
import { Card } from "@/components/ui/card";

interface ActivityItem {
  id: string | number;
  type: string;
  description: string;
  time: string;
}

interface RecentActivityProps {
  activities: ActivityItem[];
}

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold text-bakery-brown mb-4">Atividades Recentes</h2>
      <div className="space-y-4">
        {activities.map(activity => (
          <div key={activity.id} className="flex items-start space-x-4 pb-3 border-b border-muted last:border-0">
            <div className="w-2 h-2 mt-2 rounded-full bg-bakery-amber"></div>
            <div className="flex-1">
              <p className="text-sm text-gray-800">{activity.description}</p>
              <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
