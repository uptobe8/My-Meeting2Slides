"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface TaskStatus {
  id: string
  label: string
  status: "pending" | "in-progress" | "completed" | "error"
}

interface ProgressChecklistProps {
  tasks: TaskStatus[]
}

export function ProgressChecklist({ tasks }: ProgressChecklistProps) {
  return (
    <Card className="border-2 border-accent bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
          <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
          Progreso de Creación
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tasks.map((task, index) => (
            <div
              key={task.id}
              className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                task.status === "completed"
                  ? "bg-accent/10"
                  : task.status === "in-progress"
                    ? "bg-accent/20"
                    : task.status === "error"
                      ? "bg-destructive/10"
                      : "bg-muted/30"
              }`}
            >
              {/* Status Icon */}
              <div className="flex-shrink-0">
                {task.status === "completed" && (
                  <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-accent-foreground"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                {task.status === "in-progress" && (
                  <div className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                )}
                {task.status === "error" && (
                  <div className="w-6 h-6 rounded-full bg-destructive flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                )}
                {task.status === "pending" && (
                  <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">{index + 1}</span>
                  </div>
                )}
              </div>

              {/* Task Label */}
              <span
                className={`flex-1 text-sm ${
                  task.status === "completed"
                    ? "text-foreground font-medium"
                    : task.status === "in-progress"
                      ? "text-accent font-semibold"
                      : task.status === "error"
                        ? "text-destructive"
                        : "text-muted-foreground"
                }`}
              >
                {task.label}
              </span>

              {/* Status Badge */}
              {task.status === "in-progress" && (
                <span className="text-xs text-accent font-medium animate-pulse">Procesando...</span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
