import { useDraggable } from '@dnd-kit/core';
import type { Task } from '../types';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={`bg-white p-3 rounded-lg border border-gray-200 cursor-pointer hover:shadow-md transition-shadow ${
        isDragging ? 'shadow-lg opacity-90' : ''
      }`}
    >
      <p className="text-sm font-medium text-gray-800 mb-1">{task.title}</p>
      {task.assignee && (
        <p className="text-xs text-gray-500">
          Assigned to: {task.assignee.name || task.assignee.email}
        </p>
      )}
    </div>
  );
}
