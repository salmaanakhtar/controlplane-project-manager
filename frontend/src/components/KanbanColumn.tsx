import { useDroppable } from '@dnd-kit/core';
import type { Task, TaskStatus } from '../types';
import { TaskCard } from './TaskCard';

interface KanbanColumnProps {
  column: { id: TaskStatus; title: string };
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onAddTask: (status: TaskStatus) => void;
}

export function KanbanColumn({ column, tasks, onTaskClick, onAddTask }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`bg-gray-100 rounded-xl p-4 min-h-[400px] flex flex-col ${
        isOver ? 'ring-2 ring-blue-400' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-gray-700">
          {column.title}
          <span className="ml-2 text-sm text-gray-400">({tasks.length})</span>
        </h3>
        <button
          onClick={() => onAddTask(column.id)}
          className="text-gray-400 hover:text-gray-600 text-xl leading-none"
        >
          +
        </button>
      </div>
      <div className="space-y-3 flex-1">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
        ))}
      </div>
    </div>
  );
}
