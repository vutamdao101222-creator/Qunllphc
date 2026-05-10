import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { createParentStudentLink, deleteParentStudentLink, fetchMyParentLinks, listParentStudentLinks, listScheduleAdjustments, resetScheduleAdjustment, upsertScheduleAdjustment } from '../lib/api';
import {
  ASSIGNMENTS,
  ASSIGNMENT_SUBMISSIONS,
  Assignment,
  AssignmentSubmission,
  LEARNING_PROFILES,
  LearningProfile,
  MOCK_SCHOOL_TODAY,
  ScheduleSlot,
  STUDENT_DAILY_STATUS,
  StudentDailyStatus,
  STUDENTS,
  StudentProfile,
  TEACHER_FEEDBACKS,
  TeacherFeedback,
  USERS,
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
  students: StudentProfile[];
  studentStatuses: StudentDailyStatus[];
  feedbacks: TeacherFeedback[];
  assignments: Assignment[];
  submissions: AssignmentSubmission[];
  learningProfiles: LearningProfile[];
  parentAccounts: ParentAccount[];
  parentStudentLinks: ParentStudentLink[];
  scheduleAdjustments: ScheduleAdjustment[];
  addStudent: (input: StudentProfile) => Promise<void>;
  updateStudent: (studentId: string, patch: Partial<Omit<StudentProfile, 'id'>>) => Promise<void>;
  deleteStudent: (studentId: string) => Promise<void>;
  setAttendance: (input: AttendanceUpdateInput) => Promise<void>;
  createFeedback: (input: CreateFeedbackInput) => Promise<void>;
  markFeedbackRead: (feedbackId: string) => Promise<void>;
  toggleReplyRequested: (feedbackId: string, value: boolean) => Promise<void>;
  addFeedbackReply: (
    feedbackId: string,
    payload: { fromRole: 'teacher' | 'parent'; authorName: string; date: string; content: string }
  ) => Promise<void>;
  createParentAccount: (input: CreateParentAccountInput) => Promise<ParentAccount>;
  linkStudentToParent: (input: LinkStudentParentInput) => Promise<void>;
  unlinkStudentFromParent: (linkId: string) => Promise<void>;
  updateClassSchedules: (input: UpdateClassScheduleInput) => Promise<void>;
  resetClassSchedules: (classId: string) => Promise<void>;
  getEffectiveSchedules: (classId: string, fallback: ScheduleSlot[]) => ScheduleSlot[];
  getParentsOfStudent: (studentId: string) => ParentAccount[];
  filterFeedbacks: (items: TeacherFeedback[], period: FeedbackPeriod, category: FeedbackCategory) => TeacherFeedback[];
  setLearningProfileNote: (studentId: string, note: string) => Promise<void>;
}

const STORAGE_KEY = 'edu_school_data_v2';
const CHANNEL_NAME = 'edu_school_data_channel';
const TODAY = MOCK_SCHOOL_TODAY;

interface SchoolStore {
  students: StudentProfile[];
  studentStatuses: StudentDailyStatus[];
  feedbacks: TeacherFeedback[];
  assignments: Assignment[];
  submissions: AssignmentSubmission[];
  parentAccounts: ParentAccount[];
  parentStudentLinks: ParentStudentLink[];
  scheduleAdjustments: ScheduleAdjustment[];
  learningProfileNotes: Record<string, string>;
}

export interface ParentAccount {
  id: string;
  name: string;
  username: string;
  password: string;
  email: string;
  createdAt: string;
}

export interface ParentStudentLink {
  id: string;
  parentId: string;
  studentId: string;
  relationship: 'father' | 'mother' | 'guardian';
  createdAt: string;
}

export interface ScheduleAdjustment {
  id: string;
  classId: string;
  schedules: ScheduleSlot[];
  reason: string;
  updatedBy: string;
  updatedAt: string;
}

interface CreateParentAccountInput {
  name: string;
  username: string;
  password: string;
  email: string;
}

interface LinkStudentParentInput {
  parentId: string;
  studentId: string;
  relationship: 'father' | 'mother' | 'guardian';
}

interface UpdateClassScheduleInput {
  classId: string;
  schedules: ScheduleSlot[];
  reason: string;
  updatedBy: string;
}

const defaultParentAccounts: ParentAccount[] = USERS.filter((u) => u.role === 'parent').map((u) => ({
  id: u.id,
  name: u.name,
  username: u.username,
  password: u.password,
  email: u.email,
  createdAt: '08/04/2026',
}));

const defaultParentStudentLinks: ParentStudentLink[] = STUDENTS.map((student, idx) => ({
  id: `lnk-default-${idx + 1}`,
  parentId: student.parentUserId,
  studentId: student.id,
  relationship: 'guardian',
  createdAt: '08/04/2026',
}));

const defaultStore: SchoolStore = {
  students: STUDENTS.map((s) => ({ ...s })),
  studentStatuses: STUDENT_DAILY_STATUS,
  feedbacks: TEACHER_FEEDBACKS,
  assignments: ASSIGNMENTS,
  submissions: ASSIGNMENT_SUBMISSIONS,
  parentAccounts: defaultParentAccounts,
  parentStudentLinks: defaultParentStudentLinks,
  scheduleAdjustments: [],
  learningProfileNotes: {},
};

const SchoolDataContext = createContext<SchoolDataContextType | null>(null);

function readStore(): SchoolStore {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultStore;
  try {
    const parsed = JSON.parse(raw) as SchoolStore;
    return {
      students: Array.isArray(parsed.students) ? parsed.students : defaultStore.students,
      studentStatuses: parsed.studentStatuses ?? defaultStore.studentStatuses,
      feedbacks: parsed.feedbacks ?? defaultStore.feedbacks,
      assignments: parsed.assignments ?? defaultStore.assignments,
      submissions: parsed.submissions ?? defaultStore.submissions,
      parentAccounts: parsed.parentAccounts ?? defaultStore.parentAccounts,
      parentStudentLinks: parsed.parentStudentLinks ?? defaultStore.parentStudentLinks,
      scheduleAdjustments: parsed.scheduleAdjustments ?? defaultStore.scheduleAdjustments,
      learningProfileNotes: parsed.learningProfileNotes ?? defaultStore.learningProfileNotes,
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
  const { user, loading: authLoading } = useAuth();
  const [store, setStore] = useState<SchoolStore>(() => readStore());

  useEffect(() => {
    writeStore(store);
  }, [store]);

  useEffect(() => {
    if (authLoading || !user) return;

    let mounted = true;
    const hydrateRemote = async () => {
      try {
        const [links, adjs] = await Promise.all([fetchMyParentLinks(), listScheduleAdjustments()]);
        if (!mounted) return;
        const remoteLinks: ParentStudentLink[] = Array.isArray(links?.items) ? links.items : [];
        const remoteAdjs: ScheduleAdjustment[] = Array.isArray(adjs?.items) ? adjs.items : [];
        setStore((prev) => ({
          ...prev,
          parentStudentLinks: remoteLinks.length ? remoteLinks : prev.parentStudentLinks,
          scheduleAdjustments: remoteAdjs.length ? remoteAdjs : prev.scheduleAdjustments,
        }));
      } catch {
        // ignore - keep local store (offline/demo)
      }
    };
    hydrateRemote();
    return () => {
      mounted = false;
    };
  }, [authLoading, user?.id]);

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

  const createParentAccount: SchoolDataContextType['createParentAccount'] = async (input) => {
    const normalizedUsername = input.username.trim().toLowerCase();
    const now = new Date().toISOString();
    const created: ParentAccount = {
      id: `parent-${Date.now()}`,
      name: input.name.trim(),
      username: normalizedUsername,
      password: input.password,
      email: input.email.trim(),
      createdAt: now,
    };

    await updateStore((prev) => {
      if (prev.parentAccounts.some((p) => p.username.toLowerCase() === normalizedUsername)) {
        throw new Error('Ten dang nhap phu huynh da ton tai');
      }
      return {
        ...prev,
        parentAccounts: [created, ...prev.parentAccounts],
      };
    });

    return created;
  };

  const linkStudentToParent: SchoolDataContextType['linkStudentToParent'] = async (input) => {
    const now = new Date().toISOString();
    try {
      const res = await createParentStudentLink({
        parentId: input.parentId,
        studentId: input.studentId,
        relationship: input.relationship,
      });
      const created = res?.item;
      if (!created) return;
      await updateStore((prev) => {
        const exists = prev.parentStudentLinks.some((l) => l.id === created.id);
        if (exists) return prev;
        return { ...prev, parentStudentLinks: [created, ...prev.parentStudentLinks] };
      });
    } catch {
      await updateStore((prev) => {
        const exists = prev.parentStudentLinks.some(
          (link) => link.parentId === input.parentId && link.studentId === input.studentId,
        );
        if (exists) return prev;
        const nextLink: ParentStudentLink = {
          id: `lnk-${Date.now()}`,
          parentId: input.parentId,
          studentId: input.studentId,
          relationship: input.relationship,
          createdAt: now,
        };
        return { ...prev, parentStudentLinks: [nextLink, ...prev.parentStudentLinks] };
      });
    }
  };

  const unlinkStudentFromParent: SchoolDataContextType['unlinkStudentFromParent'] = async (linkId) => {
    try {
      await deleteParentStudentLink(linkId);
    } catch {
      // ignore, still update UI to be responsive
    }
    await updateStore((prev) => ({
      ...prev,
      parentStudentLinks: prev.parentStudentLinks.filter((l) => l.id !== linkId),
    }));
  };

  const addStudent: SchoolDataContextType['addStudent'] = async (input) => {
    await updateStore((prev) => {
      if (prev.students.some((s) => s.id === input.id)) {
        throw new Error('Mã học sinh đã tồn tại');
      }
      return { ...prev, students: [input, ...prev.students] };
    });
  };

  const updateStudent: SchoolDataContextType['updateStudent'] = async (studentId, patch) => {
    await updateStore((prev) => ({
      ...prev,
      students: prev.students.map((s) => (s.id === studentId ? { ...s, ...patch } : s)),
    }));
  };

  const deleteStudent: SchoolDataContextType['deleteStudent'] = async (studentId) => {
    await updateStore((prev) => {
      const { [studentId]: _removed, ...restNotes } = prev.learningProfileNotes;
      return {
        ...prev,
        students: prev.students.filter((s) => s.id !== studentId),
        studentStatuses: prev.studentStatuses.filter((s) => s.studentId !== studentId),
        feedbacks: prev.feedbacks.filter((f) => f.studentId !== studentId),
        submissions: prev.submissions.filter((s) => s.studentId !== studentId),
        parentStudentLinks: prev.parentStudentLinks.filter((l) => l.studentId !== studentId),
        learningProfileNotes: restNotes,
      };
    });
  };

  const updateClassSchedules: SchoolDataContextType['updateClassSchedules'] = async (input) => {
    const now = new Date().toISOString();
    const normalized = input.schedules
      .map((slot) => ({
        dayOfWeek: Number(slot.dayOfWeek),
        startTime: slot.startTime,
        endTime: slot.endTime,
      }))
      .filter((slot) => slot.dayOfWeek >= 1 && slot.dayOfWeek <= 7 && slot.startTime && slot.endTime)
      .sort((a, b) => (a.dayOfWeek - b.dayOfWeek) || a.startTime.localeCompare(b.startTime));

    try {
      const res = await upsertScheduleAdjustment({
        classId: input.classId,
        schedules: normalized,
        reason: input.reason.trim(),
        updatedBy: input.updatedBy,
      });
      const saved = res?.item;
      if (saved) {
        await updateStore((prev) => ({
          ...prev,
          scheduleAdjustments: [saved, ...prev.scheduleAdjustments.filter((a) => a.classId !== input.classId)],
        }));
        return;
      }
    } catch {
      // fallback below
    }

    await updateStore((prev) => {
      const nextAdjustment: ScheduleAdjustment = {
        id: `adj-${Date.now()}`,
        classId: input.classId,
        schedules: normalized,
        reason: input.reason.trim(),
        updatedBy: input.updatedBy,
        updatedAt: now,
      };
      return {
        ...prev,
        scheduleAdjustments: [nextAdjustment, ...prev.scheduleAdjustments.filter((a) => a.classId !== input.classId)],
      };
    });
  };

  const resetClassSchedules: SchoolDataContextType['resetClassSchedules'] = async (classId) => {
    try {
      await resetScheduleAdjustment(classId);
    } catch {
      // ignore - still reset locally
    }
    await updateStore((prev) => ({
      ...prev,
      scheduleAdjustments: prev.scheduleAdjustments.filter((a) => a.classId !== classId),
    }));
  };

  const getEffectiveSchedules: SchoolDataContextType['getEffectiveSchedules'] = (classId, fallback) => {
    const latest = store.scheduleAdjustments.find((item) => item.classId === classId);
    return latest?.schedules?.length ? latest.schedules : fallback;
  };

  const getParentsOfStudent: SchoolDataContextType['getParentsOfStudent'] = (studentId) => {
    const parentIds = store.parentStudentLinks.filter((link) => link.studentId === studentId).map((link) => link.parentId);
    return store.parentAccounts.filter((parent) => parentIds.includes(parent.id));
  };

  const filterFeedbacks: SchoolDataContextType['filterFeedbacks'] = (items, period, category) => {
    return items.filter(item => {
      const periodOk = period === 'all' ? true : period === 'today' ? item.date === TODAY : sameWeek(item.date);
      const categoryOk = category === 'all' ? true : item.category === category;
      return periodOk && categoryOk;
    });
  };

  const learningProfilesMerged = useMemo(
    () =>
      LEARNING_PROFILES.map((p) => {
        const override = store.learningProfileNotes[p.studentId]?.trim();
        if (!override) return p;
        return { ...p, suggestedIntervention: override };
      }),
    [store.learningProfileNotes],
  );

  const setLearningProfileNote: SchoolDataContextType['setLearningProfileNote'] = async (studentId, note) => {
    await updateStore((prev) => ({
      ...prev,
      learningProfileNotes: { ...prev.learningProfileNotes, [studentId]: note },
    }));
  };

  const value = useMemo<SchoolDataContextType>(() => ({
    students: store.students,
    studentStatuses: store.studentStatuses,
    feedbacks: store.feedbacks,
    assignments: store.assignments,
    submissions: store.submissions,
    learningProfiles: learningProfilesMerged,
    parentAccounts: store.parentAccounts,
    parentStudentLinks: store.parentStudentLinks,
    scheduleAdjustments: store.scheduleAdjustments,
    addStudent,
    updateStudent,
    deleteStudent,
    setAttendance,
    createFeedback,
    markFeedbackRead,
    toggleReplyRequested,
    addFeedbackReply,
    createParentAccount,
    linkStudentToParent,
    unlinkStudentFromParent,
    updateClassSchedules,
    resetClassSchedules,
    getEffectiveSchedules,
    getParentsOfStudent,
    filterFeedbacks,
    setLearningProfileNote,
  }), [learningProfilesMerged, store.students, store.studentStatuses, store.feedbacks, store.assignments, store.submissions, store.parentAccounts, store.parentStudentLinks, store.scheduleAdjustments]);

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
