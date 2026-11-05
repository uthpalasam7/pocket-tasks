import { computed, inject, Injectable, InjectionToken, signal } from '@angular/core';

export interface Task {
  readonly id: string;
  readonly title: string;
  readonly completed: boolean;
}

export const STORAGE_KEY = 'pocket-tasks.v1';
// Delay access because even reading window.localStorage can throw in private/restricted contexts.
export const TASK_STORAGE = new InjectionToken<() => Storage>('Task storage', {
  providedIn: 'root',
  factory: () => () => window.localStorage,
});

function isTask(value: unknown): value is Task {
  if (typeof value !== 'object' || value === null) return false;
  const task = value as Record<string, unknown>;
  return (
    typeof task['id'] === 'string' &&
    task['id'].trim().length > 0 &&
    typeof task['title'] === 'string' &&
    task['title'].trim().length > 0 &&
    typeof task['completed'] === 'boolean'
  );
}

@Injectable({ providedIn: 'root' })
export class TaskStore {
  private readonly storage = inject(TASK_STORAGE);
  private readonly taskState = signal<readonly Task[]>([]);
  readonly tasks = this.taskState.asReadonly();
  readonly warning = signal('');
  readonly total = computed(() => this.tasks().length);
  readonly completed = computed(() => this.tasks().filter((task) => task.completed).length);
  readonly active = computed(() => this.total() - this.completed());

  constructor() {
    let raw: string | null;
    try {
      raw = this.storage().getItem(STORAGE_KEY);
    } catch {
      this.warning.set(
        'Browser storage is unavailable. Tasks will stay in this tab for now, but may be lost when you refresh or close it.',
      );
      return;
    }
    if (raw === null) return;
    try {
      const data: unknown = JSON.parse(raw);
      if (typeof data !== 'object' || data === null) throw new Error('Invalid data');
      const record = data as Record<string, unknown>;
      const tasks = record['tasks'];
      if (
        record['version'] !== 1 ||
        !Array.isArray(tasks) ||
        !tasks.every(isTask) ||
        new Set(tasks.map((task) => task.id)).size !== tasks.length
      )
        throw new Error('Invalid tasks');
      this.taskState.set(
        tasks.map((task) => ({ id: task.id, title: task.title.trim(), completed: task.completed })),
      );
    } catch {
      this.warning.set(
        'Saved tasks could not be read. Starting with an empty list. Your next task change will replace the unreadable data.',
      );
    }
  }

  add(title: string): boolean {
    const trimmed = title.trim();
    if (!trimmed) return false;
    this.update([...this.tasks(), { id: crypto.randomUUID(), title: trimmed, completed: false }]);
    return true;
  }

  toggle(id: string): void {
    this.update(
      this.tasks().map((task) => (task.id === id ? { ...task, completed: !task.completed } : task)),
    );
  }

  delete(id: string): void {
    this.update(this.tasks().filter((task) => task.id !== id));
  }

  private update(tasks: readonly Task[]): void {
    this.taskState.set(tasks);
    try {
      this.storage().setItem(STORAGE_KEY, JSON.stringify({ version: 1, tasks }));
      this.warning.set('');
    } catch {
      this.warning.set(
        'Your latest changes could not be saved to this browser. Keep this tab open; changes may be lost on refresh. Try freeing browser storage or allowing site storage.',
      );
    }
  }
}
