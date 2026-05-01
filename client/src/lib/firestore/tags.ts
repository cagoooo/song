import {
    collection, doc, getDocs, addDoc, deleteDoc, query, where, Timestamp,
    onSnapshot, type Unsubscribe,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebase';
import type { Tag } from './types';

export async function getTags(): Promise<Tag[]> {
    const tagsRef = collection(db, COLLECTIONS.tags);
    const snapshot = await getDocs(tagsRef);
    const tags: Tag[] = [];
    snapshot.forEach((doc) => tags.push({ id: doc.id, name: doc.data().name }));
    return tags;
}

export async function getSongTags(songId: string): Promise<Tag[]> {
    const songTagsRef = collection(db, COLLECTIONS.songTags);
    const songTagsQuery = query(songTagsRef, where('songId', '==', songId));
    const snapshot = await getDocs(songTagsQuery);
    const tagIds: string[] = [];
    snapshot.forEach((doc) => tagIds.push(doc.data().tagId));
    if (tagIds.length === 0) return [];
    const tags = await getTags();
    return tags.filter((tag) => tagIds.includes(tag.id));
}

export async function addTag(name: string): Promise<string> {
    const tagsRef = collection(db, COLLECTIONS.tags);
    const existingQuery = query(tagsRef, where('name', '==', name.trim()));
    const existingSnapshot = await getDocs(existingQuery);
    if (!existingSnapshot.empty) throw new Error('標籤已存在');
    const newDoc = await addDoc(tagsRef, { name: name.trim(), createdAt: Timestamp.now() });
    return newDoc.id;
}

export async function addSongTag(songId: string, tagId: string): Promise<void> {
    const songTagsRef = collection(db, COLLECTIONS.songTags);
    const existingQuery = query(
        songTagsRef,
        where('songId', '==', songId),
        where('tagId', '==', tagId)
    );
    const existingSnapshot = await getDocs(existingQuery);
    if (!existingSnapshot.empty) throw new Error('標籤已存在');
    await addDoc(songTagsRef, { songId, tagId, createdAt: Timestamp.now() });
}

export async function removeSongTag(songId: string, tagId: string): Promise<void> {
    const songTagsRef = collection(db, COLLECTIONS.songTags);
    const deleteQuery = query(
        songTagsRef,
        where('songId', '==', songId),
        where('tagId', '==', tagId)
    );
    const snapshot = await getDocs(deleteQuery);
    const deletePromises: Promise<void>[] = [];
    snapshot.forEach((docSnapshot) => deletePromises.push(deleteDoc(docSnapshot.ref)));
    await Promise.all(deletePromises);
}

/**
 * 即時訂閱所有標籤 + 所有 songTags 對應關係。
 * 給訪客篩選列表用：一次拿到「所有標籤 + 各歌曲掛了哪些標籤」。
 */
export function subscribeAllTagData(callback: (data: {
    allTags: Tag[];
    songTagsMap: Map<string, string[]>; // songId → tagId[]
}) => void): Unsubscribe {
    let allTags: Tag[] = [];
    let songTagsMap = new Map<string, string[]>();

    const emit = () => callback({ allTags, songTagsMap });

    const unsubTags = onSnapshot(collection(db, COLLECTIONS.tags), (snap) => {
        allTags = [];
        snap.forEach((d) => allTags.push({ id: d.id, name: d.data().name }));
        emit();
    });

    const unsubSongTags = onSnapshot(collection(db, COLLECTIONS.songTags), (snap) => {
        songTagsMap = new Map();
        snap.forEach((d) => {
            const { songId, tagId } = d.data();
            const list = songTagsMap.get(songId) ?? [];
            list.push(tagId);
            songTagsMap.set(songId, list);
        });
        emit();
    });

    return () => {
        unsubTags();
        unsubSongTags();
    };
}

export async function deleteTag(tagId: string): Promise<void> {
    const songTagsRef = collection(db, COLLECTIONS.songTags);
    const songTagsQuery = query(songTagsRef, where('tagId', '==', tagId));
    const songTagsSnapshot = await getDocs(songTagsQuery);
    const deletePromises: Promise<void>[] = [];
    songTagsSnapshot.forEach((d) => deletePromises.push(deleteDoc(d.ref)));
    await Promise.all(deletePromises);
    const tagRef = doc(db, COLLECTIONS.tags, tagId);
    await deleteDoc(tagRef);
}
