import { Component, computed, ElementRef, inject, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, ValidatorFn } from '@angular/forms';
import { Task, TaskStore } from './task-store';

export type TaskFilter = 'all' | 'active' | 'completed';

const nonBlank: ValidatorFn = (control) =>
  typeof control.value === 'string' && control.value.trim() ? null : { required: true };

@Component({
  selector: 'app-root',
  imports: [ReactiveFormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly store = inject(TaskStore);
  readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [nonBlank] }),
  });
  readonly titleInput = viewChild<ElementRef<HTMLInputElement>>('titleInput');
  readonly filterGroup = viewChild<ElementRef<HTMLFieldSetElement>>('filterGroup');
  // View-only state: never written to storage, so saved data is unaffected.
  readonly filterControl = new FormControl<TaskFilter>('all', { nonNullable: true });
  readonly filter = toSignal(this.filterControl.valueChanges, {
    initialValue: 'all' as TaskFilter,
  });
  readonly visibleTasks = computed(() => {
    const filter = this.filter();
    return this.store
      .tasks()
      .filter((task) => filter === 'all' || task.completed === (filter === 'completed'));
  });
  readonly filters: readonly { value: TaskFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
  ];
  announcement = '';

  addTask(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.titleInput()?.nativeElement.focus();
      return;
    }
    this.store.add(this.form.controls.title.value);
    this.form.reset();
    this.announcement = 'Task added.';
    this.titleInput()?.nativeElement.focus();
  }

  toggleTask(task: Task): void {
    this.store.toggle(task.id);
    this.announcement = task.completed ? 'Task marked active.' : 'Task completed. Nice work!';
    // In a filtered view the toggled task leaves the list, so keep focus on the filter.
    if (this.filter() !== 'all') {
      this.filterGroup()?.nativeElement.querySelector<HTMLInputElement>('input:checked')?.focus();
    }
  }

  countFor(filter: TaskFilter): number {
    return filter === 'all'
      ? this.store.total()
      : filter === 'active'
        ? this.store.active()
        : this.store.completed();
  }

  setFilterAnnouncement(): void {
    this.announcement = `Showing ${this.filter()} tasks.`;
  }

  deleteTask(task: Task): void {
    if (window.confirm(`Delete “${task.title}”? This cannot be undone.`)) {
      this.store.delete(task.id);
      this.announcement = 'Task deleted.';
      this.titleInput()?.nativeElement.focus();
    }
  }
}
