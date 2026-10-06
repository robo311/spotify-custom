// Undo/redo stacks of snapshots. Edits sharing a coalesce key within a short window collapse into one step,
// so dragging a colour picker is one undo, not hundreds.

export const COALESCE_MS = 600

export class History<T> {
  private undoStack: T[] = []
  private redoStack: T[] = []
  private lastKey: string | undefined
  private lastAt = 0

  constructor(private readonly limit = 100) {}

  get canUndo(): boolean {
    return this.undoStack.length > 0
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0
  }

  /** Call before applying an edit, with the state as it was. */
  record(before: T, coalesceKey?: string, now = Date.now()): void {
    const coalesce = coalesceKey !== undefined && coalesceKey === this.lastKey && now - this.lastAt < COALESCE_MS
    this.lastKey = coalesceKey
    this.lastAt = now
    this.redoStack = []
    if (coalesce) return
    this.undoStack.push(before)
    if (this.undoStack.length > this.limit) this.undoStack.shift()
  }

  undo(current: T): T | undefined {
    const previous = this.undoStack.pop()
    if (previous === undefined) return undefined
    this.redoStack.push(current)
    this.lastKey = undefined
    return previous
  }

  redo(current: T): T | undefined {
    const next = this.redoStack.pop()
    if (next === undefined) return undefined
    this.undoStack.push(current)
    this.lastKey = undefined
    return next
  }

  clear(): void {
    this.undoStack = []
    this.redoStack = []
    this.lastKey = undefined
  }
}
