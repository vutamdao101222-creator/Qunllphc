import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  ASSIGNMENTS,
  ASSIGNMENT_SUBMISSIONS,
  Assignment,
  AssignmentSubmission,
  LEARNING_PROFILES,
  LearningProfile,
  STUDENT_DAILY_STATUS,
  StudentDailyStatus,
  STUDENTS,
  TEACHER_FEEDBACKS,
  TeacherFeedback,
} from '../data/mockData';

type FeedbackCategory = TeacherFeedback['category'] | 'all';
type FeedbackPeriod = 'today' | 'week' | 'all';

interface CreateFeedbackInput {
  studentId: string;
  classId: string;
  teacherId: string;
  date: string;
  category: TeacherFeedback['category'];
  title: string;
  content: string;
}

interface AttendanceUpdateInput {
  studentId: string;
  date: string;
  attendance: StudentDailyStatus['attendance'];
  checkInTime?: string;
  concentrationScore?: number;
  participationScore?: number;
  behavior?: StudentDailyStatus['behavior'];
  note?: string;
}

interface SchoolDataContextType {
  studentStatuses: StudentDailyStatus[];
  feedbacks: TeacherFeedback[];
  assignments: Assignment[];
  submissions: AssignmentSubmission[];
  learningProfiles: LearningProfile[];
  setAttendance: (input: AttendanceUpdateInput) => Promise<void>;
  createFeedback: (input: CreateFeedbackInput) => Promise<void>;
  markFeedbackRead: (feedbackId: string) => Promise<void>;
  toggleReplyRequested: (feedbackId: string, value: boolean) => Promise<void>;
  addFeedbackReply: (
    feedbackId: string,
    payload: { fromRole: 'teacher' | 'parent'; authorName: string; date: string; content: string }
  ) => Promise<void>;
  filterFeedbacks: (items: TeacherFeedback[], period: FeedbackPeriod, category: FeedbackCategory) => TeacherFeedback[];
}

const STORAGE_KEY = 'edu_school_data_v1';
const CHANNEL_NAME = 'edu_school_data_channel';
const TODAY = '08/04/2026';

interface SchoolStore {
  studentStatuses: StudentDailyStatus[];
  feedbacks: TeacherFeedback[];
  assignments: Assignment[];
  submissions: AssignmentSubmission[];
}

const defaultStore: SchoolStore = {
  studentStatuses: STUDENT_DAILY_STATUS,
  feedbacks: TEACHER_FEEDBACKS,
  assignments: ASSIGNMENTS,
  submissions: ASSIGNMENT_SUBMISSIONS,
};

const SchoolDataContext = createContext<SchoolDataContextType | null>(null);

function readStore(): SchoolStore {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultStore;
  try {
    const parsed = JSON.parse(raw) as SchoolStore;
    return {
      studentStatuses: parsed.studentStatuses ?? defaultStore.studentStatuses,
      feedbacks: parsed.feedbacks ?? defaultStore.feedbacks,
      assignments: parsed.assignments ?? defaultStore.assignments,
      submissions: parsed.submissions ?? defaultStore.submissions,
    };
  } catch {
    return defaultStore;
  }
}

function writeStore(next: SchoolStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function sameWeek(date: string): boolean {
  if (date === TODAY) return true;
  const weekDates = new Set(['06/04/2026', '07/04/2026', '08/04/2026', '09/04/2026', '10/04/2026', '11/04/2026', '12/04/2026']);
  return weekDates.has(date);
}

export function SchoolDataProvider({ children }: { children: React.ReactNode }) {
  const [store, setStore] = useState<SchoolStore>(() => readStore());

  useEffect(() => {
    writeStore(store);
  }, [store]);

  useEffect(() => {
    const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null;
    const onMessage = () => setStore(readStore());
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        setStore(readStore());
      }
    };

    bc?.addEventListener('message', onMessage);
    window.addEventListener('storage', onStorage);
    return () => {
      bc?.removeEventListener('message', onMessage);
      bc?.close();
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const publishRealtime = () => {
    if (typeof BroadcastChannel === 'undefined') return;
    const bc = new BroadcastChannel(CHANNEL_NAME);
    bc.postMessage({ type: 'sync' });
    bc.close();
  };

  const updateStore = async (updater: (prev: SchoolStore) => SchoolStore) => {
    await new Promise(resolve => setTimeout(resolve, 120));
    setStore(prev => {
      const next = updater(prev);
      writeStore(next);
      return next;
    });
    publishRealtime();
  };

  const setAttendance: SchoolDataContextType['setAttendance'] = async (input) => {
    await updateStore(prev => {
      const existing = prev.studentStatuses.find(s => s.studentId === input.studentId && s.date === input.date);
      let nextStatuses: StudentDailyStatus[];
      if (existing) {
        nextStatuses = prev.studentStatuses.map(s => {
          if (s.studentId !== input.studentId || s.date !== input.date) return s;
          return {
            ...s,
            attendance: input.attendance,
            checkInTime: input.checkInTime ?? s.checkInTime,
            concentrationScore: input.concentrationScore ?? s.concentrationScore,
            participationScore: input.participationScore ?? s.participationScore,
            behavior: input.behavior ?? s.behavior,
            note: input.note ?? s.note,
          };
        });
      } else {
        nextStatuses = [
          ...prev.studentStatuses,
          {
            studentId: input.studentId,
            date: input.date,
            attendance: input.attendance,
            checkInTime: input.checkInTime,
            concentrationScore: input.concentrationScore ?? 70,
            participationScore: input.participationScore ?? 70,
            behavior: input.behavior ?? 'normal',
            note: input.note ?? 'Giáo viên đã cập nhật điểm danh.',
          },
        ];
      }
      return { ...prev, studentStatuses: nextStatuses };
    });
  };

  const createFeedback: SchoolDataContextType['createFeedback'] = async (input) => {
    await updateStore(prev => ({
      ...prev,
      feedbacks: [
        {
          id: `fb-${Date.now()}`,
          ...input,
          readByParent: false,
          replyRequested: false,
          replies: [],
        },
        ...prev.feedbacks,
      ],
    }));
  };

  const markFeedbackRead: SchoolDataContextType['markFeedbackRead'] = async (feedbackId) => {
    await updateStore(prev => ({
      ...prev,
      feedbacks: prev.feedbacks.map(item => (item.id === feedbackId ? { ...item, readByParent: true } : item)),
    }));
  };

  const toggleReplyRequested: SchoolDataContextType['toggleReplyRequested'] = async (feedbackId, value) => {
    await updateStore(prev => ({
      ...prev,
      feedbacks: prev.feedbacks.map(item => (item.id === feedbackId ? { ...item, replyRequested: value } : item)),
    }));
  };

  const addFeedbackReply: SchoolDataContextType['addFeedbackReply'] = async (feedbackId, payload) => {
    await updateStore(prev => ({
      ...prev,
      feedbacks: prev.feedbacks.map(item => {
        if (item.id !== feedbackId) return item;
        return {
          ...item,
          replies: [
            ...item.replies,
            {
              id: `reply-${Date.now()}`,
              ...payload,
            },
          ],
        };
      }),
    }));
  };

  const filterFeedbacks: SchoolDataContextType['filterFeedbacks'] = (items, period, category) => {
    return items.filter(item => {
      const periodOk = period === 'all' ? true : period === 'today' ? item.date === TODAY : sameWeek(item.date);
      const categoryOk = category === 'all' ? true : item.category === category;
      return periodOk && categoryOk;
    });
  };

  const value = useMemo<SchoolDataContextType>(() => ({
    studentStatuses: store.studentStatuses,
    feedbacks: store.feedbacks,
    assignments: store.assignments,
    submissions: store.submissions,
    learningProfiles: LEARNING_PROFILES,
    setAttendance,
    createFeedback,
    markFeedbackRead,
    toggleReplyRequested,
    addFeedbackReply,
    filterFeedbacks,
  }), [store.studentStatuses, store.feedbacks, store.assignments, store.submissions]);

  return (
    <SchoolDataContext.Provider value={value}>
      {children}
    </SchoolDataContext.Provider>
  );
}

export function useSchoolData() {
  const ctx = useContext(SchoolDataContext);
  if (!ctx) throw new Error('useSchoolData must be used inside SchoolDataProvider');
  return ctx;
}

export const SCHOOL_TODAY = TODAY;
export const SCHOOL_STUDENTS = STUDENTS;
