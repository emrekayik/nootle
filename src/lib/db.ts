import Dexie, { Table } from "dexie";
import { v4 as uuidv4 } from "uuid";

export interface Category {
  id: string;
  name: string;
  color: string;
  created: string;
  updated: string;
}

export interface Todo {
  id: string;
  task: string;
  priority: string;
  is_completed: boolean;
  due_date: string;
  categoryId?: string;
  created: string;
  updated: string;
}

export interface Notebook {
  id: string;
  title: string;
  color: string;
  categoryId?: string;
  created: string;
  updated: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  is_favorite: boolean;
  notebookId: string;
  categoryId?: string;
  date: string;
  created: string;
  updated: string;
}

export interface Drawing {
  id: string;
  title: string;
  data: string;
  categoryId?: string;
  created: string;
  updated: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  all_day: boolean;
  description: string;
  date: string;
  categoryId?: string;
  created: string;
  updated: string;
}

export interface TimerSession {
  id: string;
  duration: number; // in seconds
  completedAt: string;
  categoryId?: string;
  created: string;
  updated: string;
}

export interface Profile {
  id: string;
  name: string;
  email: string;
  avatar: string; // base64 or object URL (best base64)
  slug: string;
  created: string;
  updated: string;
}

export class NootleDexie extends Dexie {
  categories!: Table<Category>;
  todos!: Table<Todo>;
  notebooks!: Table<Notebook>;
  notes!: Table<Note>;
  drawings!: Table<Drawing>;
  events!: Table<CalendarEvent>;
  timerSessions!: Table<TimerSession>;
  profiles!: Table<Profile>;

  constructor() {
    super("NootleDB");
    this.version(2).stores({
      categories: "id, name, created",
      todos: "id, priority, due_date, categoryId, created",
      notebooks: "id, title, categoryId, created",
      notes: "id, title, notebookId, categoryId, date, created",
      drawings: "id, title, categoryId, created",
      events: "id, date, created",
      timerSessions: "id, completedAt, categoryId, created",
      profiles: "id",
    });
  }
}

export const db = new NootleDexie();

export const generateId = () => uuidv4();

export async function exportDatabase() {
  const data = {
    categories: await db.categories.toArray(),
    todos: await db.todos.toArray(),
    notebooks: await db.notebooks.toArray(),
    notes: await db.notes.toArray(),
    drawings: await db.drawings.toArray(),
    events: await db.events.toArray(),
    timerSessions: await db.timerSessions.toArray(),
    profiles: await db.profiles.toArray(),
  };
  return data;
}

export async function mergeDatabase(data: any) {
  const tables = [
    "categories",
    "todos",
    "notebooks",
    "notes",
    "drawings",
    "events",
    "timerSessions",
    "profiles",
  ] as const;

  await db.transaction(
    "rw",
    tables.map((t) => db[t]),
    async () => {
      for (const table of tables) {
        if (!data[table]) continue;

        for (const incomingItem of data[table]) {
          const localItem = await db[table].get(incomingItem.id);

          if (!localItem) {
            await db[table].put(incomingItem);
          } else {
            const localUpdated = localItem.updated
              ? new Date(localItem.updated).getTime()
              : 0;
            const incomingUpdated = incomingItem.updated
              ? new Date(incomingItem.updated).getTime()
              : 0;

            if (incomingUpdated > localUpdated) {
              await db[table].put(incomingItem);
            }
          }
        }
      }
    },
  );
}
