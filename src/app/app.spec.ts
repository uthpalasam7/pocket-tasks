import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './app';
import { STORAGE_KEY, TASK_STORAGE } from './task-store';
import { memoryStorage } from './testing/memory-storage';

describe('Pocket Tasks interface', () => {
  let fixture: ComponentFixture<App>;
  let element: HTMLElement;
  let storage: Storage;

  beforeEach(async () => {
    storage = memoryStorage();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [{ provide: TASK_STORAGE, useValue: () => storage }],
    }).compileComponents();
    fixture = TestBed.createComponent(App);
    element = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  function add(title: string): void {
    const input = element.querySelector<HTMLInputElement>('#task-title')!;
    input.value = title;
    input.dispatchEvent(new Event('input'));
    element
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
  }

  it('shows the empty state and browser-only privacy explanation', () => {
    expect(element.querySelector('.empty-state')?.textContent).toContain(
      'A little list, a fresh start.',
    );
    expect(element.textContent).toContain('They don’t sync across devices.');
    expect(element.querySelector('label[for="task-title"]')).not.toBeNull();
  });

  it('rejects whitespace through form submission, shows an associated error, and focuses the input', () => {
    add(' \t ');
    const input = element.querySelector<HTMLInputElement>('#task-title')!;
    expect(element.querySelectorAll('.task-list li')).toHaveLength(0);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe('title-error');
    expect(element.querySelector('#title-error')?.textContent).toContain('Give your task a title');
    expect(document.activeElement).toBe(input);
  });

  it('adds a trimmed task, clears the form, removes the empty state and updates rendered counts', () => {
    add('  Water the plants  ');
    expect(element.querySelector('.task-title')?.textContent).toBe('Water the plants');
    expect(element.querySelector<HTMLInputElement>('#task-title')!.value).toBe('');
    expect(element.querySelector('.empty-state')).toBeNull();
    expect([...element.querySelectorAll('dd')].map((node) => node.textContent)).toEqual([
      '1',
      '1',
      '0',
    ]);
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!).tasks[0].title).toBe('Water the plants');
  });

  it('toggles from active to completed and back through the checkbox with accurate counts', () => {
    add('Read a chapter');
    const checkbox = element.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    checkbox.click();
    fixture.detectChanges();
    expect(checkbox.checked).toBe(true);
    expect(checkbox.getAttribute('aria-label')).toBe('Mark Read a chapter incomplete');
    expect([...element.querySelectorAll('dd')].map((node) => node.textContent)).toEqual([
      '1',
      '0',
      '1',
    ]);
    checkbox.click();
    fixture.detectChanges();
    expect(checkbox.checked).toBe(false);
    expect([...element.querySelectorAll('dd')].map((node) => node.textContent)).toEqual([
      '1',
      '1',
      '0',
    ]);
  });

  it('keeps the task and stored data when deletion is cancelled', () => {
    add('Keep me');
    const saved = storage.getItem(STORAGE_KEY);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    element.querySelector<HTMLButtonElement>('.delete-button')!.click();
    fixture.detectChanges();
    expect(confirm).toHaveBeenCalledWith('Delete “Keep me”? This cannot be undone.');
    expect(element.querySelectorAll('.task-list li')).toHaveLength(1);
    expect(storage.getItem(STORAGE_KEY)).toBe(saved);
    confirm.mockRestore();
  });

  it('deletes only the selected task after confirmation and restores the empty state after the last deletion', () => {
    add('First');
    add('Second');
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    element.querySelector<HTMLButtonElement>('[aria-label="Delete First"]')!.click();
    fixture.detectChanges();
    expect(element.querySelectorAll('.task-list li')).toHaveLength(1);
    expect(element.querySelector('.task-title')?.textContent).toBe('Second');
    element.querySelector<HTMLButtonElement>('.delete-button')!.click();
    fixture.detectChanges();
    expect(element.querySelector('.empty-state')).not.toBeNull();
    expect([...element.querySelectorAll('dd')].map((node) => node.textContent)).toEqual([
      '0',
      '0',
      '0',
    ]);
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!).tasks).toEqual([]);
    expect(document.activeElement).toBe(element.querySelector('#task-title'));
    confirm.mockRestore();
  });

  it('renders storage failures as an alert while still allowing tasks to be added', () => {
    vi.spyOn(storage, 'setItem').mockImplementation(() => {
      throw new Error('Full');
    });
    add('Remember this tab');
    expect(element.querySelector('.storage-warning')?.getAttribute('role')).toBe('alert');
    expect(element.querySelector('.storage-warning')?.textContent).toContain('could not be saved');
    expect(element.querySelector('.task-title')?.textContent).toBe('Remember this tab');
  });

  describe('filters', () => {
    const saved = JSON.stringify({
      version: 1,
      tasks: [
        { id: 'a', title: 'Alpha', completed: false },
        { id: 'b', title: 'Bravo', completed: true },
        { id: 'c', title: 'Charlie', completed: false },
      ],
    });

    async function createWithSaved(): Promise<void> {
      TestBed.resetTestingModule();
      storage = memoryStorage();
      storage.setItem(STORAGE_KEY, saved);
      await TestBed.configureTestingModule({
        imports: [App],
        providers: [{ provide: TASK_STORAGE, useValue: () => storage }],
      }).compileComponents();
      fixture = TestBed.createComponent(App);
      element = fixture.nativeElement as HTMLElement;
      fixture.detectChanges();
    }

    function titles(): string[] {
      return [...element.querySelectorAll('.task-title')].map((node) => node.textContent!);
    }

    function choose(label: string): void {
      const radio = [...element.querySelectorAll<HTMLInputElement>('.filter-option input')].find(
        (input) => input.closest('label')!.textContent!.trim().startsWith(label),
      )!;
      radio.click();
      fixture.detectChanges();
    }

    it('hides the filter group until a task exists', () => {
      expect(element.querySelector('.filter-group')).toBeNull();
      add('First');
      expect(element.querySelector('.filter-group')).not.toBeNull();
    });

    it('shows previously saved tasks under All and filters them without writing to storage', async () => {
      await createWithSaved();
      const write = vi.spyOn(storage, 'setItem');
      expect(titles()).toEqual(['Alpha', 'Bravo', 'Charlie']);
      choose('Active');
      expect(titles()).toEqual(['Alpha', 'Charlie']);
      choose('Completed');
      expect(titles()).toEqual(['Bravo']);
      choose('All');
      expect(titles()).toEqual(['Alpha', 'Bravo', 'Charlie']);
      expect(write).not.toHaveBeenCalled();
      expect(storage.getItem(STORAGE_KEY)).toBe(saved);
    });

    it('labels the group and shows global counts on each option', async () => {
      await createWithSaved();
      expect(element.querySelector('.filter-group legend')?.textContent).toBe('Show tasks');
      expect(
        [...element.querySelectorAll('.filter-option')].map((l) => l.textContent!.trim()),
      ).toEqual(['All 3', 'Active 2', 'Completed 1']);
      choose('Completed');
      expect([...element.querySelectorAll('dd')].map((n) => n.textContent)).toEqual([
        '3',
        '2',
        '1',
      ]);
    });

    it('keeps hidden tasks when toggling in a filtered view and moves focus to the filter', async () => {
      await createWithSaved();
      choose('Active');
      element.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
      fixture.detectChanges();
      expect(titles()).toEqual(['Charlie']);
      const stored = JSON.parse(storage.getItem(STORAGE_KEY)!).tasks;
      expect(stored).toHaveLength(3);
      expect(stored[0]).toMatchObject({ id: 'a', completed: true });
      expect(document.activeElement).toBe(element.querySelector('.filter-option input:checked'));
    });

    it('shows a filtered empty message instead of the first-run empty state', () => {
      add('Only one');
      choose('Completed');
      expect(element.querySelector('.filter-empty')?.textContent).toContain('No completed tasks.');
      expect(element.querySelector('.empty-state')).toBeNull();
    });
  });
});
