"use client";

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth, useRequireAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { ROUTES } from '@/config/constants';
import { Loader2, Calendar, Plus, Check, X, CheckCircle, XCircle, Megaphone, Pin, Edit3, Trash2, Bell, Send, MessageSquare, Users, AlertCircle, Crown, User, Mail, UserCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Semester {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  users: {
    name: string;
    email: string;
  };
}

interface UserWithStats {
  id: string;
  email: string;
  role: 'admin' | 'member';
  nickname: string | null;
  created_at: string;
  profile_created_at: string | null;
  enrollments: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
  };
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export default function AdminPage() {
  useRequireAuth();
  const { isAdmin } = useAuth();
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | null>(null);
  const [showForm, setShowForm] = useState(false);
  
  // Announcement states
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementLoading, setAnnouncementLoading] = useState(true);
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [announcementSubmitting, setAnnouncementSubmitting] = useState(false);
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [announcementMessageType, setAnnouncementMessageType] = useState<'success' | 'error' | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    start_date: '',
    end_date: '',
    is_active: false
  });

  // Announcement form state
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: '',
    is_pinned: false
  });

  // Notification management states
  const [notificationLoading, setNotificationLoading] = useState<string | null>(null);
  const [notificationResults, setNotificationResults] = useState<string>('');
  const [upcomingSessions, setUpcomingSessions] = useState<any[]>([]);
  const [testNotificationForm, setTestNotificationForm] = useState({
    title: '',
    content: '',
  });
  const [sessionReminderForm, setSessionReminderForm] = useState({
    hoursAhead: '24',
  });

  // User management states
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [userUpdateLoading, setUserUpdateLoading] = useState<string | null>(null);
  const [usersPagination, setUsersPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 10,
    hasNextPage: false,
    hasPreviousPage: false
  });
  const [currentUsersPage, setCurrentUsersPage] = useState(1);

  const allowed = isAdmin;

  // Fetch semesters
  const fetchSemesters = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/semesters');
      if (response.ok) {
        const data = await response.json();
        setSemesters(data);
      }
    } catch (error) {
      console.error('Error fetching semesters:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch announcements
  const fetchAnnouncements = async () => {
    try {
      setAnnouncementLoading(true);
      const response = await fetch('/api/admin/announcements');
      if (response.ok) {
        const data = await response.json();
        setAnnouncements(data);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setAnnouncementLoading(false);
    }
  };

  useEffect(() => {
    if (allowed) {
      fetchSemesters();
      fetchAnnouncements();
      fetchUsers();
    }
  }, [allowed]);

  // Create new semester
  const handleCreateSemester = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setMessage('');
    setMessageType(null);

    try {
      const response = await fetch('/api/admin/semesters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(`학기 "${result.name}" 생성 완료`);
        setMessageType('success');
        setFormData({ name: '', start_date: '', end_date: '', is_active: false });
        setShowForm(false);
        fetchSemesters();
      } else {
        setMessage(`오류: ${result.error}`);
        setMessageType('error');
      }
    } catch (error) {
      setMessage('학기 생성 실패');
      setMessageType('error');
    } finally {
      setCreating(false);
    }
  };

  // Set semester as active
  const handleSetActive = async (semesterId: string) => {
    try {
      const response = await fetch(`/api/admin/semesters/${semesterId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: true })
      });

      if (response.ok) {
        setMessage('현재 학기 설정 완료');
        setMessageType('success');
        fetchSemesters();
      } else {
        const result = await response.json();
        setMessage(`오류: ${result.error}`);
        setMessageType('error');
      }
    } catch (error) {
      setMessage('학기 설정 실패');
      setMessageType('error');
    }
  };

  // Delete semester
  const handleDelete = async (semesterId: string) => {
    if (!confirm('정말 이 학기를 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/admin/semesters/${semesterId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setMessage('학기 삭제 완료');
        setMessageType('success');
        fetchSemesters();
      } else {
        const result = await response.json();
        setMessage(`오류: ${result.error}`);
        setMessageType('error');
      }
    } catch (error) {
      setMessage('학기 삭제 실패');
      setMessageType('error');
    }
  };

  // Announcement functions
  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setAnnouncementSubmitting(true);
    setAnnouncementMessage('');
    setAnnouncementMessageType(null);

    try {
      const response = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(announcementForm)
      });

      const result = await response.json();

      if (response.ok) {
        setAnnouncementMessage('공지사항이 생성되었습니다');
        setAnnouncementMessageType('success');
        setAnnouncementForm({ title: '', content: '', is_pinned: false });
        setShowAnnouncementForm(false);
        fetchAnnouncements();
        
        // 3초 후 메시지 자동 제거
        setTimeout(() => {
          setAnnouncementMessage('');
          setAnnouncementMessageType(null);
        }, 3000);
      } else {
        setAnnouncementMessage(`오류: ${result.error}`);
        setAnnouncementMessageType('error');
      }
    } catch (error) {
      setAnnouncementMessage('공지사항 생성 실패');
      setAnnouncementMessageType('error');
    } finally {
      setAnnouncementSubmitting(false);
    }
  };

  const handleEditAnnouncement = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setAnnouncementForm({
      title: announcement.title,
      content: announcement.content,
      is_pinned: announcement.is_pinned
    });
    setShowAnnouncementForm(true);
  };

  const handleUpdateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAnnouncement) return;
    
    setAnnouncementSubmitting(true);
    setAnnouncementMessage('');
    setAnnouncementMessageType(null);

    try {
      const response = await fetch(`/api/admin/announcements/${editingAnnouncement.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(announcementForm)
      });

      const result = await response.json();

      if (response.ok) {
        setAnnouncementMessage('공지사항이 수정되었습니다');
        setAnnouncementMessageType('success');
        setAnnouncementForm({ title: '', content: '', is_pinned: false });
        setShowAnnouncementForm(false);
        setEditingAnnouncement(null);
        fetchAnnouncements();
        
        // 3초 후 메시지 자동 제거
        setTimeout(() => {
          setAnnouncementMessage('');
          setAnnouncementMessageType(null);
        }, 3000);
      } else {
        setAnnouncementMessage(`오류: ${result.error}`);
        setAnnouncementMessageType('error');
      }
    } catch (error) {
      setAnnouncementMessage('공지사항 수정 실패');
      setAnnouncementMessageType('error');
    } finally {
      setAnnouncementSubmitting(false);
    }
  };

  const handleDeleteAnnouncement = async (announcementId: string) => {
    if (!confirm('정말 이 공지사항을 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/admin/announcements/${announcementId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setAnnouncementMessage('공지사항 삭제 완료');
        setAnnouncementMessageType('success');
        fetchAnnouncements();
        
        // 3초 후 메시지 자동 제거
        setTimeout(() => {
          setAnnouncementMessage('');
          setAnnouncementMessageType(null);
        }, 3000);
      } else {
        const result = await response.json();
        setAnnouncementMessage(`오류: ${result.error}`);
        setAnnouncementMessageType('error');
      }
    } catch (error) {
      setAnnouncementMessage('공지사항 삭제 실패');
      setAnnouncementMessageType('error');
    }
  };

  const handleCancelAnnouncementForm = () => {
    setShowAnnouncementForm(false);
    setEditingAnnouncement(null);
    setAnnouncementForm({ title: '', content: '', is_pinned: false });
  };

  // Notification management functions
  const showNotificationResult = (message: string, type: 'success' | 'error' = 'success') => {
    const emoji = type === 'success' ? '✅' : '❌';
    setNotificationResults(prev => `${prev}\n${emoji} ${new Date().toLocaleTimeString()}: ${message}`);
  };

  const createTestNotifications = async () => {
    setNotificationLoading('test');
    try {
      const response = await fetch('/api/notifications/test-create', {
        method: 'POST',
      });
      
      const result = await response.json();
      
      if (response.ok) {
        showNotificationResult(`Created ${result.notifications?.length || 0} test notifications`);
      } else {
        showNotificationResult(result.error || 'Failed to create test notifications', 'error');
      }
    } catch (error) {
      showNotificationResult('Error creating test notifications', 'error');
    } finally {
      setNotificationLoading(null);
    }
  };

  const createGlobalAnnouncementNotification = async () => {
    if (!testNotificationForm.title || !testNotificationForm.content) {
      showNotificationResult('Please fill in title and content', 'error');
      return;
    }

    setNotificationLoading('announcement');
    try {
      const response = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: testNotificationForm.title,
          content: testNotificationForm.content,
          is_pinned: false,
        }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        showNotificationResult(`Created announcement: "${testNotificationForm.title}" - Notifications sent to all users`);
        setTestNotificationForm({ title: '', content: '' });
        fetchAnnouncements(); // Refresh the announcements list
      } else {
        showNotificationResult(result.error || 'Failed to create announcement', 'error');
      }
    } catch (error) {
      showNotificationResult('Error creating announcement', 'error');
    } finally {
      setNotificationLoading(null);
    }
  };

  const checkUpcomingSessions = async () => {
    setNotificationLoading('check-sessions');
    try {
      const hoursAhead = parseInt(sessionReminderForm.hoursAhead) || 24;
      const response = await fetch(`/api/notifications/send-session-reminders?hoursAhead=${hoursAhead}`);
      
      const result = await response.json();
      
      if (response.ok) {
        setUpcomingSessions(result.sessions || []);
        showNotificationResult(`Found ${result.sessions?.length || 0} upcoming sessions in the next ${hoursAhead} hours`);
      } else {
        showNotificationResult(result.error || 'Failed to check upcoming sessions', 'error');
      }
    } catch (error) {
      showNotificationResult('Error checking upcoming sessions', 'error');
    } finally {
      setNotificationLoading(null);
    }
  };

  const sendSessionReminders = async () => {
    setNotificationLoading('send-reminders');
    try {
      const hoursAhead = parseInt(sessionReminderForm.hoursAhead) || 24;
      const response = await fetch('/api/notifications/send-session-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hoursAhead }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        showNotificationResult(`Sent ${result.remindersSent} session reminders for ${result.sessionsProcessed} sessions`);
      } else {
        showNotificationResult(result.error || 'Failed to send session reminders', 'error');
      }
    } catch (error) {
      showNotificationResult('Error sending session reminders', 'error');
    } finally {
      setNotificationLoading(null);
    }
  };

  const clearNotificationResults = () => {
    setNotificationResults('');
    setUpcomingSessions([]);
  };

  // User management functions
  const fetchUsers = async (page: number = 1) => {
    try {
      setUsersLoading(true);
      const response = await fetch(`/api/admin/users?page=${page}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setUsersPagination(data.pagination);
        setCurrentUsersPage(page);
      } else {
        console.error('Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setUsersLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'admin' | 'member') => {
    try {
      setUserUpdateLoading(userId);
      
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (response.ok) {
        // Update local state
        setUsers(prev => prev.map(user => 
          user.id === userId ? { ...user, role: newRole } : user
        ));
        
        // Show success message
        setMessage('사용자 권한이 업데이트되었습니다');
        setMessageType('success');
        setTimeout(() => {
          setMessage('');
          setMessageType(null);
        }, 3000);
      } else {
        const result = await response.json();
        throw new Error(result.error || 'Failed to update user role');
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      setMessage(error instanceof Error ? error.message : '사용자 권한 업데이트 실패');
      setMessageType('error');
      setTimeout(() => {
        setMessage('');
        setMessageType(null);
      }, 3000);
    } finally {
      setUserUpdateLoading(null);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">관리자</h1>
          <p className="text-muted-foreground mt-2">세미나 및 사용자 관리를 위한 페이지입니다.</p>
        </div>

        {!allowed ? (
          <Card>
            <CardHeader>
              <CardTitle>접근 불가</CardTitle>
              <CardDescription>해당 페이지에 접근할 권한이 없습니다.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={ROUTES.dashboard}>
                <Button variant="outline">대시보드로 돌아가기</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>세미나 관리</CardTitle>
                <CardDescription>세미나 생성 및 수정</CardDescription>
              </CardHeader>
              <CardContent className="space-x-2">
                <Link href={ROUTES.createSeminar}><Button>세미나 개설</Button></Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>사용자 관리</span>
                </CardTitle>
                <CardDescription>사용자 권한 및 프로필 관리</CardDescription>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        총 {usersPagination.totalCount}명의 사용자 중 {((currentUsersPage - 1) * 10) + 1}-{Math.min(currentUsersPage * 10, usersPagination.totalCount)}명 표시
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => fetchUsers(currentUsersPage)}
                        disabled={usersLoading}
                      >
                        새로고침
                      </Button>
                    </div>

                    <div className="border rounded-lg">
                      <div className="max-h-96 overflow-auto">
                        <table className="w-full">
                          <thead className="bg-muted/50 sticky top-0">
                            <tr className="border-b">
                              <th className="text-left p-3 font-medium">사용자</th>
                              <th className="text-left p-3 font-medium">권한</th>
                              <th className="text-center p-3 font-medium">등록 세미나</th>
                              <th className="text-center p-3 font-medium">승인됨</th>
                              <th className="text-center p-3 font-medium">가입일</th>
                            </tr>
                          </thead>
                          <tbody>
                            {users.map((user) => (
                              <tr key={user.id} className="border-b hover:bg-muted/25">
                                <td className="p-3">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                                      <User className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                    <div>
                                      <div className="font-medium">
                                        {user.nickname || user.email.split('@')[0]}
                                      </div>
                                      <div className="text-sm text-muted-foreground flex items-center">
                                        <Mail className="w-3 h-3 mr-1" />
                                        {user.email}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-3">
                                  <Select
                                    value={user.role}
                                    onValueChange={(newRole: 'admin' | 'member') => updateUserRole(user.id, newRole)}
                                    disabled={!!userUpdateLoading}
                                  >
                                    <SelectTrigger className="w-32">
                                      <SelectValue>
                                        <div className="flex items-center space-x-2">
                                          {user.role === 'admin' ? (
                                            <>
                                              <Crown className="w-4 h-4 text-yellow-600" />
                                              <span>관리자</span>
                                            </>
                                          ) : (
                                            <>
                                              <UserCheck className="w-4 h-4 text-blue-600" />
                                              <span>회원</span>
                                            </>
                                          )}
                                        </div>
                                      </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="member">
                                        <div className="flex items-center space-x-2">
                                          <UserCheck className="w-4 h-4 text-blue-600" />
                                          <span>회원</span>
                                        </div>
                                      </SelectItem>
                                      <SelectItem value="admin">
                                        <div className="flex items-center space-x-2">
                                          <Crown className="w-4 h-4 text-yellow-600" />
                                          <span>관리자</span>
                                        </div>
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                  {userUpdateLoading === user.id && (
                                    <Loader2 className="w-4 h-4 animate-spin mt-1 text-muted-foreground" />
                                  )}
                                </td>
                                <td className="p-3 text-center">
                                  <Badge variant="outline">
                                    {user.enrollments.total}
                                  </Badge>
                                </td>
                                <td className="p-3 text-center">
                                  <Badge variant={user.enrollments.approved > 0 ? "default" : "secondary"}>
                                    {user.enrollments.approved}
                                  </Badge>
                                </td>
                                <td className="p-3 text-center text-sm text-muted-foreground">
                                  {new Date(user.created_at).toLocaleDateString('ko-KR')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {users.length === 0 && !usersLoading && (
                      <div className="text-center p-8 text-muted-foreground">
                        등록된 사용자가 없습니다.
                      </div>
                    )}

                    {/* Pagination */}
                    {usersPagination.totalPages > 1 && (
                      <div className="flex items-center justify-between pt-4 border-t">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchUsers(currentUsersPage - 1)}
                            disabled={!usersPagination.hasPreviousPage || usersLoading}
                          >
                            <ChevronLeft className="w-4 h-4 mr-1" />
                            이전
                          </Button>
                          <span className="text-sm text-muted-foreground">
                            {usersPagination.currentPage} / {usersPagination.totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchUsers(currentUsersPage + 1)}
                            disabled={!usersPagination.hasNextPage || usersLoading}
                          >
                            다음
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          총 {usersPagination.totalCount}명
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5" />
                  <span>학기 관리</span>
                </CardTitle>
                <CardDescription>현재 학기 설정 및 학기별 세미나 관리</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add New Semester Button */}
                <Button 
                  onClick={() => setShowForm(!showForm)}
                  className="w-full"
                  variant={showForm ? "secondary" : "default"}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {showForm ? '취소' : '새 학기 생성'}
                </Button>

                {/* Create Form */}
                {showForm && (
                  <form onSubmit={handleCreateSemester} className="space-y-3 p-4 border rounded-lg">
                    <div className="space-y-2">
                      <Label>학기명</Label>
                      <Input
                        type="text"
                        placeholder="예: 2025-1"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label>시작일</Label>
                        <Input
                          type="date"
                          value={formData.start_date}
                          onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>종료일</Label>
                        <Input
                          type="date"
                          value={formData.end_date}
                          onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="is_active"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                        className="rounded"
                      />
                      <Label htmlFor="is_active" className="text-sm">현재 학기로 설정</Label>
                    </div>
                    <Button type="submit" disabled={creating} className="w-full">
                      {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      생성
                    </Button>
                  </form>
                )}

                {/* Message */}
                {message && (
                  <div className={`text-sm p-3 rounded-lg flex items-center gap-2 ${
                    messageType === 'success'
                      ? 'bg-green-50 text-green-800 border border-green-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    {messageType === 'success' ? (
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 flex-shrink-0" />
                    )}
                    <span>{message}</span>
                  </div>
                )}

                {/* Semesters List */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">등록된 학기</h4>
                  {loading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      <span className="text-sm">불러오는 중...</span>
                    </div>
                  ) : semesters.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">등록된 학기가 없습니다</p>
                  ) : (
                    semesters.map(semester => (
                      <div key={semester.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{semester.name}</span>
                            {semester.is_active && (
                              <Badge variant="outline" className="bg-green-50 text-green-800 border-green-200">
                                현재 학기
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(semester.start_date).toLocaleDateString()} - {new Date(semester.end_date).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {!semester.is_active && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSetActive(semester.id)}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(semester.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Announcement Management Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Megaphone className="w-5 h-5" />
                  <span>공지사항 관리</span>
                </CardTitle>
                <CardDescription>전체 공지사항 생성, 수정, 삭제</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add New Announcement Button */}
                <Button 
                  onClick={() => {
                    if (editingAnnouncement) {
                      handleCancelAnnouncementForm();
                    } else {
                      setShowAnnouncementForm(!showAnnouncementForm);
                    }
                  }}
                  className="w-full"
                  variant={showAnnouncementForm ? "secondary" : "default"}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {showAnnouncementForm ? '취소' : (editingAnnouncement ? '수정 취소' : '새 공지사항 작성')}
                </Button>

                {/* Create/Edit Form */}
                {showAnnouncementForm && (
                  <form 
                    onSubmit={editingAnnouncement ? handleUpdateAnnouncement : handleCreateAnnouncement} 
                    className="space-y-3 p-4 border rounded-lg"
                  >
                    <div className="space-y-2">
                      <Label>제목</Label>
                      <Input
                        type="text"
                        placeholder="공지사항 제목"
                        value={announcementForm.title}
                        onChange={(e) => setAnnouncementForm({...announcementForm, title: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>내용</Label>
                      <Textarea
                        placeholder="공지사항 내용을 입력하세요"
                        value={announcementForm.content}
                        onChange={(e) => setAnnouncementForm({...announcementForm, content: e.target.value})}
                        rows={4}
                        required
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="is_pinned"
                        checked={announcementForm.is_pinned}
                        onChange={(e) => setAnnouncementForm({...announcementForm, is_pinned: e.target.checked})}
                        className="rounded"
                      />
                      <Label htmlFor="is_pinned" className="text-sm">상단 고정</Label>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={announcementSubmitting} className="flex-1">
                        {announcementSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {editingAnnouncement ? '수정' : '생성'}
                      </Button>
                      <Button type="button" variant="outline" onClick={handleCancelAnnouncementForm}>
                        취소
                      </Button>
                    </div>
                  </form>
                )}

                {/* Announcement Message */}
                {announcementMessage && (
                  <div className={`text-sm p-3 rounded-lg flex items-center gap-2 ${
                    announcementMessageType === 'success'
                      ? 'bg-green-50 text-green-800 border border-green-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    {announcementMessageType === 'success' ? (
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 flex-shrink-0" />
                    )}
                    <span>{announcementMessage}</span>
                  </div>
                )}

                {/* Announcements List */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">등록된 공지사항</h4>
                  {announcementLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      <span className="text-sm">불러오는 중...</span>
                    </div>
                  ) : announcements.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">등록된 공지사항이 없습니다</p>
                  ) : (
                    announcements.map(announcement => (
                      <div key={announcement.id} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h5 className="font-medium">{announcement.title}</h5>
                              {announcement.is_pinned && (
                                <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">
                                  <Pin className="w-3 h-3 mr-1" />
                                  고정
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {announcement.content}
                            </p>
                            <div className="text-xs text-muted-foreground mt-2">
                              작성자: {announcement.users.name} | {new Date(announcement.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditAnnouncement(announcement)}
                            >
                              <Edit3 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteAnnouncement(announcement.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Notification Management Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="w-5 h-5" />
                  <span>알림 관리</span>
                </CardTitle>
                <CardDescription>
                  알림 시스템 테스트 및 관리
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Test Notifications */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="w-4 h-4" />
                      <h4 className="font-medium">테스트 알림</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      샘플 알림을 생성하여 시스템을 테스트합니다
                    </p>
                    <Button 
                      onClick={createTestNotifications}
                      disabled={!!notificationLoading}
                      className="w-full"
                    >
                      {notificationLoading === 'test' ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          생성 중...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          샘플 알림 생성
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Global Announcements */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4" />
                      <h4 className="font-medium">전체 공지사항</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      모든 사용자에게 공지사항을 전송합니다
                    </p>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="notification-title">제목</Label>
                        <Input
                          id="notification-title"
                          value={testNotificationForm.title}
                          onChange={(e) => setTestNotificationForm(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="공지사항 제목..."
                        />
                      </div>
                      <div>
                        <Label htmlFor="notification-content">내용</Label>
                        <Textarea
                          id="notification-content"
                          value={testNotificationForm.content}
                          onChange={(e) => setTestNotificationForm(prev => ({ ...prev, content: e.target.value }))}
                          placeholder="공지사항 내용..."
                          rows={3}
                        />
                      </div>
                      <Button 
                        onClick={createGlobalAnnouncementNotification}
                        disabled={!!notificationLoading}
                        className="w-full"
                      >
                        {notificationLoading === 'announcement' ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            전송 중...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            공지사항 생성 및 전송
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Session Reminders */}
                <div className="space-y-4 pt-6 border-t">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4" />
                    <h4 className="font-medium">세션 알림 관리</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    다가오는 세션에 대한 알림을 확인하고 전송합니다
                  </p>
                  
                  <div className="flex items-center space-x-4">
                    <div className="space-y-2">
                      <Label htmlFor="hours-ahead">알림 시간 (시간 전)</Label>
                      <Input
                        id="hours-ahead"
                        type="number"
                        value={sessionReminderForm.hoursAhead}
                        onChange={(e) => setSessionReminderForm(prev => ({ ...prev, hoursAhead: e.target.value }))}
                        className="w-24"
                        min="1"
                        max="168"
                      />
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        onClick={checkUpcomingSessions}
                        disabled={!!notificationLoading}
                        variant="outline"
                      >
                        {notificationLoading === 'check-sessions' ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            확인 중...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            다가오는 세션 확인
                          </>
                        )}
                      </Button>
                      <Button 
                        onClick={sendSessionReminders}
                        disabled={!!notificationLoading || upcomingSessions.length === 0}
                      >
                        {notificationLoading === 'send-reminders' ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            전송 중...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            알림 전송
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {upcomingSessions.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="font-medium">다가오는 세션</h5>
                      <div className="space-y-2">
                        {upcomingSessions.map(session => (
                          <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <div className="font-medium">{session.title}</div>
                              <div className="text-sm text-muted-foreground">
                                {session.seminar_title} • {new Date(session.date).toLocaleString('ko-KR')}
                              </div>
                            </div>
                            <Badge variant="secondary">
                              {session.enrolled_users_count}명 등록
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Results */}
                {notificationResults && (
                  <div className="space-y-2 pt-6 border-t">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4" />
                        <h5 className="font-medium">실행 결과</h5>
                      </div>
                      <Button variant="outline" size="sm" onClick={clearNotificationResults}>
                        지우기
                      </Button>
                    </div>
                    <div className="bg-muted p-4 rounded-lg max-h-48 overflow-auto">
                      <pre className="whitespace-pre-wrap text-sm">
                        {notificationResults}
                      </pre>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
}


