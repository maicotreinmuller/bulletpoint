import { openDB, type DBSchema, type IDBPDatabase } from "idb"
import type { Group, Note, Topic } from "./types"

/**
 * Camada de acesso a dados (Repository) sobre IndexedDB.
 * 100% offline e local ao dispositivo — nenhum servidor envolvido.
 */

interface NotesDB extends DBSchema {
  groups: {
    key: string
    value: Group
  }
  topics: {
    key: string
    value: Topic
    indexes: { "by-group": string }
  }
  notes: {
    key: string
    value: Note
    indexes: { "by-topic": string }
  }
}

const DB_NAME = "notas-chat-db"
const DB_VERSION = 2

let dbPromise: Promise<IDBPDatabase<NotesDB>> | null = null

function getDB() {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB só está disponível no navegador.")
  }
  if (!dbPromise) {
    dbPromise = openDB<NotesDB>(DB_NAME, DB_VERSION, {
      upgrade(db, _oldVersion, _newVersion, tx) {
        if (!db.objectStoreNames.contains("topics")) {
          const topics = db.createObjectStore("topics", { keyPath: "id" })
          topics.createIndex("by-group", "groupId")
        } else if (!tx.objectStore("topics").indexNames.contains("by-group")) {
          tx.objectStore("topics").createIndex("by-group", "groupId")
        }
        if (!db.objectStoreNames.contains("notes")) {
          const notes = db.createObjectStore("notes", { keyPath: "id" })
          notes.createIndex("by-topic", "topicId")
        }
        if (!db.objectStoreNames.contains("groups")) {
          db.createObjectStore("groups", { keyPath: "id" })
        }
      },
    })
  }
  return dbPromise
}

/* ----------------------------- Grupos ----------------------------- */

export async function dbGetGroups(): Promise<Group[]> {
  const db = await getDB()
  return db.getAll("groups")
}

export async function dbPutGroup(group: Group): Promise<void> {
  const db = await getDB()
  await db.put("groups", group)
}

export async function dbDeleteGroup(id: string): Promise<void> {
  const db = await getDB()
  await db.delete("groups", id)
}

/* ----------------------------- Tópicos ----------------------------- */

export async function dbGetTopics(): Promise<Topic[]> {
  const db = await getDB()
  return db.getAll("topics")
}

export async function dbPutTopic(topic: Topic): Promise<void> {
  const db = await getDB()
  await db.put("topics", topic)
}

export async function dbDeleteTopic(id: string): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(["topics", "notes"], "readwrite")
  await tx.objectStore("topics").delete(id)
  // Remove em cascata as notas do tópico.
  const idx = tx.objectStore("notes").index("by-topic")
  let cursor = await idx.openCursor(id)
  while (cursor) {
    await cursor.delete()
    cursor = await cursor.continue()
  }
  await tx.done
}

/* ------------------------------ Notas ------------------------------ */

export async function dbGetNotes(): Promise<Note[]> {
  const db = await getDB()
  return db.getAll("notes")
}

export async function dbPutNote(note: Note): Promise<void> {
  const db = await getDB()
  await db.put("notes", note)
}

export async function dbDeleteNote(id: string): Promise<void> {
  const db = await getDB()
  await db.delete("notes", id)
}
