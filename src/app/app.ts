import { Component, ElementRef, inject, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, ValidatorFn } from '@angular/forms';
import { Task, TaskStore } from './task-store';

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
  }

  deleteTask(task: Task): void {
    if (window.confirm(`Delete “${task.title}”? This cannot be undone.`)) {
      this.store.delete(task.id);
      this.announcement = 'Task deleted.';
      this.titleInput()?.nativeElement.focus();
    }
  }
}
