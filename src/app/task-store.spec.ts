import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { STORAGE_KEY, TASK_STORAGE, TaskStore } from './task-store';

import { memoryStorage } from './testing/memory-storage';

function createStore(storage: Storage): TaskStore {
  TestBed.configureTestingModule({
    providers: [{ provide: TASK_STORAGE, useValue: () => storage }],
  });
  return TestBed.inject(TaskStore);
}

describe('TaskStore', () => {
  it('starts empty with zero counts and no warning', () => {
    const store = createStore(memoryStorage());
    expect(store.tasks()).toEqual([]);
    expect([store.total(), store.active(), store.completed()]).toEqual([0, 0, 0]);
    expect(store.warning()).toBe('');
  });

  it('rejects blank titles without writing and trims valid titles', () => {
    const storage = memoryStorage();
    const write = vi.spyOn(storage, 'setItem');
    const store = createStore(storage);
    for (const title of ['', '  ', '\n\t']) expect(store.add(title)).toBe(false);
    expect(write).not.toHaveBeenCalled();
    expect(store.add('  Get outside  ')).toBe(true);
    expect(store.tasks()[0]).toMatchObject({ title: 'Get outside', completed: false });
  });

  it('keeps counts accurate through additions, toggles in both directions, and deletion', () => {
    const store = createStore(memoryStorage());
    store.add('One');
    store.add('Two');
    const id = store.tasks()[0]!.id;
    expect([store.total(), store.active(), store.completed()]).toEqual([2, 2, 0]);
    store.toggle(id);
    expect([store.total(), store.active(), store.completed()]).toEqual([2, 1, 1]);
    store.toggle(id);
    expect([store.total(), store.active(), store.completed()]).toEqual([2, 2, 0]);
    store.toggle(id);
    store.delete(id);
    expect([store.total(), store.active(), store.completed()]).toEqual([1, 1, 0]);
    expect(store.tasks()[0]!.title).toBe('Two');
  });

  it('restores additions, completion and deletions from the same storage after recreation', () => {
    const storage = memoryStorage();
    let store = createStore(storage);
    store.add('Keep');
    store.add('Remove');
    store.toggle(store.tasks()[0]!.id);
    store.delete(store.tasks()[1]!.id);
    TestBed.resetTestingModule();
    store = createStore(storage);
    expect(store.tasks()).toEqual([expect.objectContaining({ title: 'Keep', completed: true })]);
    expect([store.total(), store.active(), store.completed()]).toEqual([1, 0, 1]);
    expect(store.warning()).toBe('');
  });

  it.each([
    '{broken',
    'null',
    '[]',
    '{"version":2,"tasks":[]}',
    '{"version":1,"tasks":{}}',
    '{"version":1,"tasks":[null]}',
    '{"version":1,"tasks":[{"id":"1","title":"  ","completed":false}]}',
    '{"version":1,"tasks":[{"id":"","title":"Task","completed":false}]}',
    '{"version":1,"tasks":[{"id":"1","title":"Task","completed":"false"}]}',
    '{"version":1,"tasks":[{"id":"1","title":"A","completed":false},{"id":"1","title":"B","completed":true}]}',
  ])('rejects invalid stored data safely: %s', (raw) => {
    const storage = memoryStorage();
    storage.setItem(STORAGE_KEY, raw);
    const store = createStore(storage);
    expect(store.tasks()).toEqual([]);
    expect(store.warning()).toContain('could not be read');
    expect(storage.getItem(STORAGE_KEY)).toBe(raw);
    store.add('Fresh start');
    expect(store.warning()).toBe('');
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!).tasks[0].title).toBe('Fresh start');
  });

  it('handles a localStorage getter that throws and still allows all in-memory actions', () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: TASK_STORAGE,
          useValue: () => {
            throw new DOMException('Denied', 'SecurityError');
          },
        },
      ],
    });
    const store = TestBed.inject(TaskStore);
    expect(store.warning()).toContain('unavailable');
    store.add('Still usable');
    expect(store.warning()).toContain('could not be saved');
    store.toggle(store.tasks()[0]!.id);
    expect(store.completed()).toBe(1);
    store.delete(store.tasks()[0]!.id);
    expect(store.total()).toBe(0);
  });

  it('handles failed reads with visible warning', () => {
    const storage = memoryStorage();
    vi.spyOn(storage, 'getItem').mockImplementation(() => {
      throw new Error('read failed');
    });
    const store = createStore(storage);
    expect(store.warning()).toContain('unavailable');
    expect(store.total()).toBe(0);
  });

  it('keeps changes in memory when writes fail, then clears the warning after saving recovers', () => {
    const storage = memoryStorage();
    const write = vi.spyOn(storage, 'setItem').mockImplementation(() => {
      throw new DOMException('Full', 'QuotaExceededError');
    });
    const store = createStore(storage);
    store.add('Unsaved task');
    expect(store.total()).toBe(1);
    expect(store.warning()).toContain('could not be saved');
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
    write.mockRestore();
    store.toggle(store.tasks()[0]!.id);
    expect(store.warning()).toBe('');
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!).tasks[0].completed).toBe(true);
  });
});
