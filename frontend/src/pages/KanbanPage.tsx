import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { tasksApi, projectsApi } from '../api';
import { useToastStore } from '../store/toast';
import { Loading } from '../components/Loading';
import type { Task, TaskStatus } from '../types';
import { KanbanColumn } from '../components/KanbanColumn';
import { TaskModal } from '../components/TaskModal';

const columns: { id: TaskStatus; title: string }[] = [
  { id: 'todo', title: 'To Do' },
  { id: 'in_progress', title: 'In Progress' },
  { id: 'review', title: 'Review' },
  { id: 'done', title: 'Done' },
];

export function KanbanPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStatus, setCreateStatus] = useState<TaskStatus>('todo');
  const queryClient = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId!),
    enabled: !!projectId,
  });

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => tasksApi.list(projectId!),
    enabled: !!projectId,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status?: string } }) =>
      tasksApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      addToast('success', 'Task updated');
    },
    onError: () => {
      addToast('error', 'Failed to update task');
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks?.data.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as TaskStatus;

    const task = tasks?.data.find((t) => t.id === taskId);
    if (task && task.status !== newStatus) {
      updateMutation.mutate({ id: taskId, data: { status: newStatus } });
    }
  };

  if (isLoading) return <Loading />;

  const tasksByStatus = columns.reduce((acc, col) => {
    acc[col.id] = tasks?.data.filter((t) => t.status === col.id) || [];
    return acc;
  }, {} as Record<TaskStatus, Task[]>);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to="/projects" className="text-sm text-gray-500 hover:text-gray-700 mb-1 block">
            ← Back to Projects
          </Link>
          <h1 className="text-2xl font-semibold">{project?.name || 'Project'}</h1>
        </div>
        <button
          onClick={() => {
            setCreateStatus('todo');
            setShowCreateModal(true);
          }}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
        >
          New Task
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-4 gap-4 min-h-[500px]">
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              tasks={tasksByStatus[column.id]}
              onTaskClick={setSelectedTask}
              onAddTask={(status) => {
                setCreateStatus(status);
                setShowCreateModal(true);
              }}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask && (
            <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200 opacity-80">
              <p className="text-sm font-medium">{activeTask.title}</p>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {showCreateModal && projectId && (
        <TaskModal
          projectId={projectId}
          status={createStatus}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {selectedTask && (
        <TaskModal
          projectId={projectId!}
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
